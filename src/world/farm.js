/* =============================================================
 *  MyTown · 我的家乡 3D  —  农田
 *  farm.js : 田块规划、秧田/稻田、麦田、玉米、油菜、菜地、
 *            田埂与水渠、打谷场（晒场）、塑料大棚、稻草人
 *            随四季变化：春耕·夏长·秋收·冬藏
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad, lerp, clamp, TAU } = MT.util;

  const CROPS = {
    rice: { name: '水稻', tex: 'cropRice', h: [0.75, 1.05], spacing: 0.9, planes: 2, ground: 0x3f5230, canopy: 0x46753a },
    wheat: { name: '小麦', tex: 'cropWheat', h: [0.85, 1.15], spacing: 0.95, planes: 2, ground: 0x555234, canopy: 0x6f6a3c },
    corn: { name: '玉米', tex: 'cropCorn', h: [1.7, 2.2], spacing: 1.7, planes: 2, ground: 0x3f4a2e, canopy: 0x4a7438 },
    rape: { name: '油菜', tex: 'cropRape', h: [0.9, 1.25], spacing: 1.15, planes: 2, ground: 0x4c4a2c, canopy: 0x6e6838 },
    greens: { name: '蔬菜', tex: 'cropGreens', h: [0.35, 0.5], spacing: 0.85, planes: 2, ground: 0x443a2c, canopy: 0x4a6f36 },
  };

  /** 各作物在四季中的形态：s = 尺寸系数，c = 颜色 */
  const SEASON_RULES = {
    rice: {
      spring: { s: 0.5, c: 0x9ec46a }, summer: { s: 1.0, c: 0x5f9440 },
      autumn: { s: 1.05, c: 0xdcbe62 }, winter: { s: 0.04, c: 0x9a8f70 },
    },
    wheat: {
      spring: { s: 1.0, c: 0x8fbf60 }, summer: { s: 1.05, c: 0xd8c060 },
      autumn: { s: 0.4, c: 0x9ec46a }, winter: { s: 0.55, c: 0x6f8a4a },
    },
    corn: {
      spring: { s: 0.35, c: 0x9ec46a }, summer: { s: 1.0, c: 0x5f9440 },
      autumn: { s: 1.0, c: 0xd0b45e }, winter: { s: 0.04, c: 0x8a7c60 },
    },
    rape: {
      spring: { s: 1.0, c: 0xf0d24a }, summer: { s: 0.55, c: 0xb0b45a },
      autumn: { s: 0.35, c: 0x8fbf60 }, winter: { s: 0.04, c: 0x9a8f70 },
    },
    greens: {
      spring: { s: 1.0, c: 0x8fbf60 }, summer: { s: 1.0, c: 0x5f9440 },
      autumn: { s: 0.85, c: 0x7fae54 }, winter: { s: 0.5, c: 0x6f8a4a },
    },
  };

  class Farm {
    constructor(scene, terrain, opts = {}) {
      this.scene = scene;
      this.terrain = terrain;
      this.rng = opts.rng || new MT.RNG(88501);
      this.quality = opts.quality || 'high';
      this.season = opts.season || 'summer';
      this.group = new THREE.Group();
      this.group.name = '农田';
      scene.add(this.group);
      this.plots = [];
      this.cropSets = {};
      // 大田块时代：预算按面积铺（稀疏化由填充逻辑统一处理），画质优先可给足
      this.instanceBudget = opts.quality === 'low' ? 9000 : opts.quality === 'medium' ? 22000 : 48000;
      this._layoutPlots();
      MT.farmPlots = this.plots;     // 供植被系统避让（不在田里长树）
      this._buildCropSets();
      this._buildPlots();
      this._buildThreshingFloor();
      this._buildDitches();
      this._buildGreenhouses();
      this._buildScarecrows();
      this._buildWells();
      this.setSeason(this.season);
    }

    /* ---------------- 田块规划 ---------------- */
    _layoutPlots() {
      const r = this.rng, T = this.terrain;
      const VC = MT.TerrainConst;
      const usable = (x, z, w, d, paddy) => {
        // 四角 + 中心
        const pts = [[x, z], [x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2]];
        // 宅基地区域：中心或四角落进村域都不种（大田块必须整块避开村子，
        // 否则田面会从院子底下穿出来）。村域比实际院落略小，田才贴得近。
        for (const [px, pz] of pts) {
          if (px > -58 && px < 94 && pz > -38 && pz < 130) return false;
          if (T.waterDepth(px, pz) > 0.15) return false;
        }
        // 其余条件只看田块中心：大田块允许压过田埂和小路（路网画在田面之上）
        if (T.slopeAt(x, z) > 0.38) return false;
        const dw = Math.hypot(x - VC.WA_CLUSTER.x, z - VC.WA_CLUSTER.z);
        if (dw < 44) return false;
        for (const p of VC.PONDS) {
          const pr = p.r || Math.max(p.hw || 0, p.hd || 0);
          if (Math.hypot(x - p.x, z - p.z) < pr * 1.35) return false;
        }
        // 用材林 / 苗圃里不种庄稼
        for (const b of (VC.PLANTATIONS || [])) {
          if (Math.abs(x - b.x) < b.w / 2 + 4 && Math.abs(z - b.z) < b.d / 2 + 4) return false;
        }
        if (MT.inBuildZone(x, z, 2)) return false;             // 建筑区（院落外沿紧贴田埂）
        if (Math.hypot(x + 10, z - 112) < 20) return false;      // 打谷场
        if (Math.hypot(x - 104, z - 64) < 24) return false;      // 藕塘
        for (const gh of [[112, 96], [126, 106], [140, 96], [112, 118], [98, 108], [126, 128]]) if (Math.hypot(x - gh[0], z - gh[1]) < 14) return false;   // 大棚
        for (const wl of [[70, 110], [-80, 180], [180, -40], [-200, 60], [90, 240]]) if (Math.hypot(x - wl[0], z - wl[1]) < 10) return false;        // 机井
        const h = T.heightAt(x, z);
        if (h < 2.6) return false;
        if (paddy && h > 8.5) return false;
        if (h > 26) return false;
        return true;
      };

      const intersects = (x, z, w, d) => {
        for (const q of this.plots) {
          if (Math.abs(x - q.x) < (w + q.w) / 2 && Math.abs(z - q.z) < (d + q.d) / 2) return true;
        }
        return false;
      };
      const addCell = (x, z, w, d, crop, paddy, seedRot) => {
        if (!usable(x, z, w, d, paddy)) return;
        if (intersects(x, z, w, d)) return;   // 避免不同网格区域的田块互相重叠
        this.plots.push({ x, z, w, d, crop, paddy: !!paddy, r: seedRot || 0 });
      };

      // 南边大片水旱田：大方格，像卫星图上的格子田
      // （田块几乎顶满格子，中间只留一条田间路的缝——卫星图上田和田之间没有宽草带）
      for (let gx = -450; gx < 450; gx += 78) {
        for (let gz = 86; gz < 450; gz += 92) {
          if (r.chance(0.06)) continue;
          const w = r.range(64, 72), d = r.range(80, 87);
          const crop = r.pick(['rice', 'rice', 'rice', 'corn', 'wheat', 'greens']);
          addCell(gx + r.range(0, 6), gz + r.range(0, 5), w, d, crop, crop === 'rice', 0);
        }
      }
      // 淮河边上的水稻田（圩区）
      for (let gx = -440; gx < 440; gx += 72) {
        for (let gz = -172; gz < -72; gz += 66) {
          if (r.chance(0.05)) continue;
          const w = r.range(60, 66), d = r.range(54, 60);
          addCell(gx + r.range(0, 6), gz + r.range(0, 5), w, d, 'rice', true, 0);
        }
      }
      // 村东、村西近处的田块：卫星图上村子四周全是田，不该是大片空草地
      for (let gx = -420; gx < 420; gx += 68) {
        for (let gz = -76; gz < 96; gz += 74) {
          if (r.chance(0.03)) continue;
          const w = r.range(58, 63), d = r.range(62, 69);
          const crop = r.pick(['rice', 'rice', 'corn', 'corn', 'wheat', 'greens']);
          addCell(gx + r.range(0, 5), gz + r.range(0, 5), w, d, crop, crop === 'rice', 0);
        }
      }
      // 房前屋后的小块菜地：只在村边留几块，别把大田切成碎补丁
      for (let gx = -92; gx < 112; gx += 26) {
        for (let gz = -58; gz < 122; gz += 26) {
          if (r.chance(0.45)) continue;
          addCell(gx + r.range(0, 5), gz + r.range(0, 5), r.range(10, 16), r.range(10, 15),
            r.pick(['greens', 'wheat', 'greens', 'rape']), false, 0);
        }
      }
      // 按离村中心距离排序，保证近处田块优先长庄稼
      const vc = MT.TerrainConst.VILLAGE;
      this.plots.sort((a, b) => Math.hypot(a.x - vc.x, a.z - vc.z) - Math.hypot(b.x - vc.x, b.z - vc.z));
    }

    /* ---------------- 作物实例集合 ---------------- */
    _buildCropSets() {
      const m = MT.M();
      const G = MT.vegetationGeo;
      for (const key in CROPS) {
        const c = CROPS[key];
        const h = (c.h[0] + c.h[1]) / 2;
        const geo = G.crossedGeo(1.05, h, c.planes);
        const mat = new THREE.MeshStandardMaterial({
          map: MT.tex[c.tex](), alphaTest: 0.38, transparent: false,
          side: THREE.DoubleSide, roughness: 1.0, color: 0xffffff,
        });
        if (MT.windMaterial) MT.windMaterial(mat, 0.05);
        const set = new MT.InstSet(geo, mat, this.instanceBudget, 'crop_' + key);
        set.mesh.castShadow = false;
        set.mesh.receiveShadow = false;
        this.cropSets[key] = set;
        this.group.add(set.mesh);
      }
      // 填充
      let used = { rice: 0, wheat: 0, corn: 0, rape: 0, greens: 0 };
      const total = { rice: 0, wheat: 0, corn: 0, rape: 0, greens: 0 };
      const perCrop = {};
      for (const p of this.plots) {
        const c = CROPS[p.crop];
        perCrop[p.crop] = perCrop[p.crop] || [];
        perCrop[p.crop].push(p);
      }
      // 按面积比例分配预算：先算每块田"铺满"需要多少棵，
      // 预算不够时对整组按同一比例稀疏化——每块田都能分到庄稼，
      // 不会再出现"近处密、远处整块空白"的浅色补丁（卫星图上田块是连续的）。
      const totalPlots = this.plots.length || 1;
      const r = this.rng;
      for (const cropKey in this.cropSets) {
        const plots = perCrop[cropKey] || [];
        const set = this.cropSets[cropKey];
        if (!plots.length) { set.commit(); continue; }
        const c = CROPS[cropKey];
        const step = c.spacing * (this.quality === 'high' ? 1 : 1.25);
        let want = 0;
        const grids = plots.map((p) => {
          const nx = Math.max(1, Math.floor((p.w - 2) / step));
          const nz = Math.max(1, Math.floor((p.d - 2) / step));
          const n = nx * nz * 0.86;                    // 对应原来 14% 的随机跳过率
          want += n;
          return { nx, nz };
        });
        const cap = this.instanceBudget * (plots.length / totalPlots);
        const factor = want > 0 ? Math.min(1, cap / want) : 1;
        let budget = Math.floor(cap);
        plots.forEach((p, pi) => {
          const { nx, nz } = grids[pi];
          const dx = (p.w - 2) / nx, dz = (p.d - 2) / nz;
          for (let i = 0; i < nx; i++) {
            for (let j = 0; j < nz; j++) {
              if (budget <= 0) break;
              if (!r.chance(0.86 * factor)) continue;
              const x = p.x - p.w / 2 + 1 + (i + 0.5) * dx + r.range(-0.3, 0.3);
              const z = p.z - p.d / 2 + 1 + (j + 0.5) * dz + r.range(-0.3, 0.3);
              const y = this.terrain.heightAt(x, z);
              set.add({ x, y: y - 0.05 + (p.paddy ? 0.16 : 0), z }, r.next() * TAU, r.range(0.85, 1.2), 1, 0);
              budget--; used[cropKey]++;
            }
          }
        });
        total[cropKey] = plots.length;
        set.commit();
      }
      this._cropUsed = used;
    }

    /* ---------------- 田块地面 / 田埂 / 水 ----------------
     *  使用合并几何：所有田块地面合成一个网格，田埂合成一个网格
     *  （大幅降低 draw call）
     */
    _buildPlots() {
      const m = MT.M();
      const g = MT.Build;
      const posArr = [], uvArr = [], norArr = [], idxArr = [], colArr = [];
      const ridgeArr = { pos: [], uv: [], nor: [], idx: [], col: [] };
      const waterArr = { pos: [], uv: [], nor: [], idx: [] };
      let vBase = 0, rBase = 0, wBase = 0;
      // 田面用"草"的贴图而不是"土"的贴图：卫星图上田里是庄稼的冠层，
      // 用深褐色的土壤贴图，整片村子四周看着像刚翻过的裸地。
      const fieldT = MT.texture.cloneTex('grass', 1, 1);
      const GRASS_BASE = new THREE.Color(0x5a763a);
      const plotTints = {};
      const tintOf = (crop) => {
        if (plotTints[crop]) return plotTints[crop];
        const canopy = new THREE.Color((CROPS[crop] || CROPS.wheat).canopy);
        const t = new THREE.Color(
          Math.min(2.4, canopy.r / GRASS_BASE.r),
          Math.min(2.4, canopy.g / GRASS_BASE.g),
          Math.min(2.4, canopy.b / GRASS_BASE.b),
        );
        plotTints[crop] = t;
        return t;
      };
      const ridgeT = MT.texture.cloneTex('dirtRoad', 1, 1);
      const waterMat = MT.mat.water(0x3f6360, 0.7);
      // 秧田水：夏天稻田里长满秧苗，水面只剩暗绿的缝隙反光——
      // 压到几乎不透明、近乎哑光，远看就是一块深绿田面（卫星图上没有发亮的薄荷色块）
      waterMat.color.setHex(0x22392a);
      waterMat.roughness = 1.0; waterMat.metalness = 0.0;
      waterMat.envMapIntensity = 0.08; waterMat.opacity = 0.96;
      if (waterMat.normalScale) waterMat.normalScale.set(0.15, 0.15);
      // 秧田行纹：水面 UV 每 8m 一块，贴图里画 4 条深色行沟（行距 2m），
      // 远看稻田不再是一块死平的深绿，近看能看出栽秧的垄行。
      const paddyRowT = MT.texture.tex('paddyRows', 256, (ctx, s) => {
        ctx.fillStyle = '#f3f5ec'; ctx.fillRect(0, 0, s, s);
        const rows = 4;
        for (let i = 0; i < rows; i++) {
          const y = (i + 0.5) * s / rows;
          ctx.fillStyle = 'rgba(92,110,84,0.52)';
          ctx.fillRect(0, y - s / rows * 0.15, s, s / rows * 0.30);
        }
        // 斑驳：打散条纹的印刷感
        for (let i = 0; i < 2200; i++) {
          const x = Math.random() * s, y = Math.random() * s;
          const a = 0.025 + Math.random() * 0.05;
          ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(36,56,36,${a})`;
          ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
        }
      });
      waterMat.map = paddyRowT;
      waterMat.needsUpdate = true;

      const sampleY = (x, z) => this.terrain.heightAt(x, z);

      let paddyIdx = 0;
      for (const p of this.plots) {
        const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2;
        const z0 = p.z - p.d / 2, z1 = p.z + p.d / 2;
        const lift = p.paddy ? 0.02 : 0.05;
        // 每块田一点明暗差异，避免整片田一个色（卫星图上相邻地块深浅不同）
        const pv = 0.86 + (Math.abs(Math.sin(p.x * 12.9898 + p.z * 78.233) * 43758.5453) % 1) * 0.18;
        const tint = tintOf(p.crop);
        const mul = p.paddy ? 0.70 : 0.80;   // 秧田再压一档：卫星图上稻田是最深的绿
        const cr = tint.r * pv * mul, cg = tint.g * pv * mul, cb = tint.b * pv * mul;
        // 地面（细分网格，贴合地形）
        const segX = Math.max(2, Math.round(p.w / 8)), segZ = Math.max(2, Math.round(p.d / 8));
        const base = vBase;
        for (let j = 0; j <= segZ; j++) {
          for (let i = 0; i <= segX; i++) {
            const x = lerp(x0, x1, i / segX), z = lerp(z0, z1, j / segZ);
            posArr.push(x, sampleY(x, z) + lift, z);
            norArr.push(0, 1, 0);
            uvArr.push((x - x0) / 6, (z - z0) / 6);
            colArr.push(cr, cg, cb);
          }
        }
        for (let j = 0; j < segZ; j++) {
          for (let i = 0; i < segX; i++) {
            const a = base + j * (segX + 1) + i, b = a + 1, c = a + segX + 1, d = c + 1;
            idxArr.push(a, c, b, b, c, d);
          }
        }
        vBase += (segX + 1) * (segZ + 1);

        // 田埂（四边）
        const mkRidge = (len, ry, cx, cz) => {
          const t = 0.6, h = p.paddy ? 0.42 : 0.3;
          const dirX = Math.cos(ry), dirZ = Math.sin(ry);
          const nx = -dirZ, nz = dirX;
          const segs = Math.max(1, Math.round(len / 6));
          const start = { x: cx - dirX * len / 2, z: cz - dirZ * len / 2 };
          for (let s = 0; s < segs; s++) {
            const t0 = s / segs, t1 = (s + 1) / segs;
            const ax = start.x + dirX * len * t0, az = start.z + dirZ * len * t0;
            const bx = start.x + dirX * len * t1, bz = start.z + dirZ * len * t1;
            const b0 = rBase;
            const corners = [
              [ax + nx * t / 2, az + nz * t / 2], [ax - nx * t / 2, az - nz * t / 2],
              [bx - nx * t / 2, bz - nz * t / 2], [bx + nx * t / 2, bz + nz * t / 2],
            ];
            for (const [cxx, czz] of corners) {
              ridgeArr.pos.push(cxx, sampleY(cxx, czz) + h, czz);
              ridgeArr.nor.push(0, 1, 0);
              ridgeArr.uv.push((cxx) / 3, (czz) / 3);
              ridgeArr.col.push(1, 1, 1);
            }
            ridgeArr.idx.push(b0, b0 + 2, b0 + 1, b0 + 1, b0 + 2, b0 + 3);
            rBase += 4;
          }
        };
        mkRidge(p.w + 0.6, 0, p.x, z0);
        mkRidge(p.w + 0.6, 0, p.x, z1);
        mkRidge(p.d + 0.6, Math.PI / 2, x0, p.z);
        mkRidge(p.d + 0.6, Math.PI / 2, x1, p.z);

        // 秧田水面
        if (p.paddy) {
          const segX2 = Math.max(2, Math.round(p.w / 10)), segZ2 = Math.max(2, Math.round(p.d / 10));
          const b2 = wBase;
          // 秧田行纹：相邻田块横竖交替（参考图上各田块栽秧方向不一）
          const rowSwap = (paddyIdx++ % 2) === 1;
          for (let j = 0; j <= segZ2; j++) {
            for (let i = 0; i <= segX2; i++) {
              const x = lerp(x0 + 0.5, x1 - 0.5, i / segX2), z = lerp(z0 + 0.5, z1 - 0.5, j / segZ2);
              const wy = sampleY(x, z) + 0.16;
              waterArr.pos.push(x, wy, z);
              waterArr.nor.push(0, 1, 0);
              waterArr.uv.push(rowSwap ? z / 8 : x / 8, rowSwap ? x / 8 : z / 8);
            }
          }
          for (let j = 0; j < segZ2; j++) {
            for (let i = 0; i < segX2; i++) {
              const a = b2 + j * (segX2 + 1) + i, b = a + 1, c = a + segX2 + 1, d = c + 1;
              waterArr.idx.push(a, c, b, b, c, d);
            }
          }
          wBase += (segX2 + 1) * (segZ2 + 1);
        }
      }
      const mkMesh = (arr, mat, name) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(arr.pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(arr.nor, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(arr.uv, 2));
        if (arr.col) geo.setAttribute('color', new THREE.Float32BufferAttribute(arr.col, 3));
        geo.setIndex(arr.idx);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.name = name;
        mesh.userData.noCollide = true;    // 田面不参与碰撞
        return mesh;
      };
      const fieldMat = new THREE.MeshStandardMaterial({
        map: fieldT, vertexColors: true, roughness: 1.0,
      });
      this.fieldMat = fieldMat;
      const fields = mkMesh({ pos: posArr, uv: uvArr, nor: norArr, idx: idxArr, col: colArr }, fieldMat, '田块');
      this.group.add(fields);
      const ridgeMat = new THREE.MeshStandardMaterial({ map: ridgeT, vertexColors: true, roughness: 1.0, color: 0xa07a52 });
      this.ridgeMat = ridgeMat;
      const ridges = mkMesh(ridgeArr, ridgeMat, '田埂');
      this.group.add(ridges);
      if (waterArr.pos.length) {
        const water = mkMesh(waterArr, waterMat, '秧田水面');
        this.group.add(water);
        this.paddyWater = water;
      }
      // 田块地面颜色随作物/季节（用顶点色统一控制）
      this._fieldPlots = this.plots;
    }

    /* ---------------- 打谷场（晒场） ---------------- */
    _buildThreshingFloor() {
      const T = this.terrain, r = this.rng;
      const x = -10, z = 112;   // 打谷场放在村南边、下地必经的路口（原来压在村子中间，占了大片宅基地）
      const gy = T.heightAt(x, z);
      const g = new THREE.Group();
      g.position.set(x, gy, z);
      const R = 10.5;
      MT.addBuildZone(x, z, R - 0.5);   // 晒场里不许长草（草/地被/野花都会避开建设区）
      // 晒场：夯实的黄土（不是水泥空地，卫星图上是压实的土场）。
      // 集市地面贴图偏亮，压暗一点才像常年被石磙碾过的土场。
      const floorMat = MT.mat.marketGround(4, 4).clone();
      floorMat.color.setRGB(0.66, 0.62, 0.54);
      const circle = new THREE.Mesh(new THREE.CircleGeometry(R, 30), floorMat);
      circle.rotation.x = -Math.PI / 2; circle.position.y = 0.06; circle.receiveShadow = true;
      g.add(circle);
      const ring = new THREE.Mesh(new THREE.RingGeometry(R, R + 0.8, 40), MT.mat.soil(3, 3));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
      g.add(ring);
      // 石磙
      g.add(MT.props.stoneRoller());
      const roller2 = MT.props.stoneRoller();
      roller2.position.set(6, 0, 5); roller2.rotation.y = rad(40); g.add(roller2);
      // 粮堆
      const heap = MT.props.grainHeap(2.4, 1.0);
      heap.position.set(-5, 0.06, -3); g.add(heap);
      const heap2 = MT.props.grainHeap(1.8, 0.7);
      heap2.position.set(4, 0.06, -6); g.add(heap2);
      // 草垛
      const hay = MT.props.haystack(1.9, 2.6);
      hay.position.set(11, 0, 6); g.add(hay);
      const hay2 = MT.props.haystack(1.5, 2.0);
      hay2.position.set(13.4, 0, 3.2); g.add(hay2);
      // 拖拉机 / 三轮车 / 板车
      const tr = MT.props.tractor();
      tr.position.set(-11, 0, 5); tr.rotation.y = rad(-30); g.add(tr);
      const tc = MT.props.tricycle(true);
      tc.position.set(-3, 0, 9); tc.rotation.y = rad(70); g.add(tc);
      const cart = MT.props.handCart();
      cart.position.set(8, 0, -9); cart.rotation.y = rad(-15); g.add(cart);
      // 箩筐 / 麻袋 / 簸箕
      for (let i = 0; i < 5; i++) {
        const b = MT.props.basket(r.range(0.4, 0.55), r.range(0.4, 0.55));
        b.position.set(r.range(-12, 12), 0.06, r.range(-12, 12));
        g.add(b);
      }
      // 晒着的粮食：摊开的一层谷粒（不规则边缘 + 颗粒贴图 + 散落谷粒）
      for (const [px, pz, pr] of [[-2.5, 4.5, 2.8], [5.2, 1.6, 2.2], [-7.5, -6.5, 2.4], [1.0, -4.0, 1.7]]) {
        const spread = MT.props.grainSpread(pr);
        spread.position.set(px, 0.07, pz);
        spread.rotation.y = r.next() * TAU;
        g.add(spread);
      }
      // 电线杆 + 路灯
      const pole = MT.props.powerPole({ h: 7.5, loudspeaker: true });
      pole.position.set(-R - 2, 0, -R + 3);
      g.add(pole);
      const lamp = MT.props.streetLamp();
      lamp.position.set(R + 1.5, 0, -R + 5);
      g.add(lamp);
      g.userData.landmark = { name: '打谷场', kind: 'farm' };
      this.threshingFloor = g;
      this.group.add(g);
      // 碰撞：农具
      MT.colliders.push({ x: x - 11 * Math.cos(rad(-30)) - 0, y: gy + 1.2, z: z - 2.6, hw: 1.2, hh: 1.2, hd: 2.4, ry: 0, cos: 1, sin: 0, active: true });
    }

    /* ---------------- 水渠 ---------------- */
    _buildDitches() {
      const T = this.terrain;
      const add = (x0, z0, x1, z1, w) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(2, Math.round(len / 8));
        const pos = [], uv = [], nor = [], idx = [], wpos = [], wuv = [], wnor = [], widx = [];
        let base = 0, wbase = 0;
        const dx = (x1 - x0) / n, dz = (z1 - z0) / n;
        const dirx = (x1 - x0) / len, dirz = (z1 - z0) / len;
        const nx = -dirz, nz = dirx;
        const hw = w / 2;
        for (let i = 0; i <= n; i++) {
          const x = x0 + dx * i, z = z0 + dz * i;
          const corners = [
            [x + nx * hw, z + nz * hw, 0.34],
            [x + nx * hw * 0.6, z + nz * hw * 0.6, -0.25],
            [x - nx * hw * 0.6, z - nz * hw * 0.6, -0.25],
            [x - nx * hw, z - nz * hw, 0.34],
          ];
          for (const [cx, cz, dy] of corners) {
            pos.push(cx, T.heightAt(cx, cz) + dy * 0.6, cz);
            nor.push(0, 1, 0);
            uv.push(cx / 3, cz / 3);
          }
          // 渠中水
          const wy = T.heightAt(x, z) - 0.06;
          wpos.push(x + nx * hw * 0.5, wy, z + nz * hw * 0.5);
          wpos.push(x - nx * hw * 0.5, wy, z - nz * hw * 0.5);
          wnor.push(0, 1, 0, 0, 1, 0);
          wuv.push(i * 0.5, 0, i * 0.5, 1);
        }
        for (let i = 0; i < n; i++) {
          const a = base + i * 4;
          for (let k = 0; k < 3; k++) idx.push(a + k, a + k + 4, a + k + 1, a + k + 1, a + k + 4, a + k + 5);
          const b = wbase + i * 2;
          widx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, MT.mat.dirt(1, 1));
        mesh.receiveShadow = true; mesh.name = '水渠';
        mesh.userData.noCollide = true;
        this.group.add(mesh);
        const wgeo = new THREE.BufferGeometry();
        wgeo.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
        wgeo.setAttribute('normal', new THREE.Float32BufferAttribute(wnor, 3));
        wgeo.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2));
        wgeo.setIndex(widx);
        const wmesh = new THREE.Mesh(wgeo, MT.mat.water(0x3d6060, 0.72));
        wmesh.name = '渠水';
        wmesh.userData.noCollide = true;
        this.group.add(wmesh);
      };
      // 主要干渠
      add(-300, 152, 300, 150, 3.0);
      add(66, 40, 68, 300, 2.6);
      add(-96, 60, -98, 260, 2.6);
      add(-300, -70, 300, -72, 2.8);
      add(-62, -70, -64, 60, 2.6);   // 西侧支渠：绕开集市土场（原来从集市中心穿过）
      add(120, -70, 122, 40, 2.4);
    }

    /* ---------------- 塑料大棚 ---------------- */
    _buildGreenhouses() {
      const T = this.terrain, r = this.rng;
      // 大棚集中成片（卫星图上白色棚膜是挤在一块儿的，不是东一处西一处）
      const spots = [[112, 96], [126, 106], [140, 96], [112, 118], [98, 108], [126, 128]];
      const plastic = new THREE.MeshStandardMaterial({
        color: 0xdfe8ea, roughness: 0.35, metalness: 0.05,
        transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      });
      const frameMat = MT.mat.metal(0xb8bec4, 0.4);
      for (const [bx, bz] of spots) {
        if (T.slopeAt(bx, bz) > 0.25) continue;
        const g = new THREE.Group();
        const gy = T.heightAt(bx, bz);
        g.position.set(bx, gy, bz);
        g.rotation.y = r.range(-0.2, 0.2);
        const L = r.range(16, 24), W = 5.6, H = 2.3;
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, L, 14, 1, true, 0, Math.PI), plastic);
        shell.rotation.z = Math.PI / 2;
        shell.rotation.y = Math.PI / 2;
        shell.position.y = 0;
        shell.receiveShadow = true; shell.castShadow = false;
        g.add(shell);
        // 端墙
        for (const sz of [-1, 1]) {
          const cap = new THREE.Mesh(new THREE.CircleGeometry(W / 2, 14, 0, Math.PI), plastic);
          cap.rotation.y = sz > 0 ? 0 : Math.PI;
          cap.position.set(0, 0, sz * L / 2);
          g.add(cap);
          const door = MT.Build.plane(1.0, 1.7, frameMat, 1, 1);
          door.position.set(0, 0.85, sz * (L / 2 + 0.02));
          door.visible = false;
          g.add(door);
        }
        // 骨架
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const rib = new THREE.Mesh(new THREE.TorusGeometry(W / 2, 0.03, 5, 10, Math.PI), frameMat);
          rib.rotation.y = Math.PI / 2;
          rib.position.set(0, 0, -L / 2 + t * L);
          g.add(rib);
        }
        for (const sx of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 6), frameMat);
          rail.rotation.x = Math.PI / 2;
          rail.position.set(sx * W / 2, 0.05, 0);
          g.add(rail);
        }
        // 内部菜垄
        for (let i = 0; i < 3; i++) {
          const bed = MT.Build.box(L - 2, 0.18, 0.9, MT.mat.vegBed(), 1.2);
          bed.position.set(-W / 4 + i * (W / 4), 0.09, 0);
          bed.rotation.y = Math.PI / 2;
          bed.receiveShadow = true;
          g.add(bed);
        }
        g.traverse((o) => { o.userData.noCollide = true; });   // 可以走进大棚
        this.group.add(g);
      }
    }

    /* ---------------- 稻草人 ---------------- */
    _buildScarecrows() {
      const T = this.terrain, r = this.rng;
      const n = Math.min(10, Math.max(4, Math.round(this.plots.length / 6)));
      for (let i = 0; i < n; i++) {
        const p = r.pick(this.plots);
        if (!p) break;
        const x = p.x + r.range(-p.w / 4, p.w / 4);
        const z = p.z + r.range(-p.d / 4, p.d / 4);
        const gy = T.heightAt(x, z);
        const g = new THREE.Group();
        g.position.set(x, gy, z);
        g.rotation.y = r.next() * TAU;
        const m = MT.M();
        const pole = MT.Build.cyl(0.045, 0.055, 2.1, m.wood, 6);
        pole.position.y = 1.05; g.add(pole);
        const arms = MT.Build.cyl(0.035, 0.035, 1.5, m.wood, 6);
        arms.rotation.z = Math.PI / 2; arms.position.y = 1.55; g.add(arms);
        // 草身体
        const body = MT.Build.cyl(0.26, 0.34, 0.9, m.straw, 8);
        body.position.y = 1.35; g.add(body);
        const hands = MT.Build.cyl(0.05, 0.05, 0.5, m.straw, 6);
        hands.rotation.z = Math.PI / 2; hands.position.y = 1.55; hands.scale.x = 3.0; g.add(hands);
        // 头（草把 + 布）
        const head = MT.Build.sphere(0.19, m.straw, 8);
        head.position.y = 1.98; g.add(head);
        const hat = MT.Build.cyl(0.02, 0.34, 0.16, m.straw, 12);
        hat.position.y = 2.16; g.add(hat);
        // 旧衣服
        const shirt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.42, 0.7, 10, 1, true),
          new THREE.MeshStandardMaterial({ color: r.pick([0x8a4a3a, 0x3a5a8a, 0x5a6a4a]), roughness: 1, side: THREE.DoubleSide })
        );
        shirt.position.y = 1.35; shirt.castShadow = true; g.add(shirt);
        MT.props.anim(g, (t) => { g.rotation.z = Math.sin(t * 1.1 + x) * 0.03; });
        g.traverse((o) => { o.userData.noCollide = true; });
        this.group.add(g);
      }
    }

    /* ---------------- 机井 / 小泵房 ---------------- */
    _buildWells() {
      const T = this.terrain, r = this.rng;
      const spots = [[70, 110], [-80, 180], [180, -40], [-200, 60], [90, 240]];
      for (const [x, z] of spots) {
        if (T.slopeAt(x, z) > 0.3) continue;
        const gy = T.heightAt(x, z);
        const g = new THREE.Group();
        g.position.set(x, gy, z);
        const pad = MT.Build.box(3.2, 0.16, 3.2, MT.M().cement, 1.0);
        pad.position.y = 0.08; g.add(pad);
        const house = MT.Build.box(2.0, 1.9, 1.8, MT.M().brickRed, 1.0);
        house.position.set(-0.4, 1.1, 0); g.add(house);
        const roof = MT.Build.box(2.3, 0.14, 2.1, MT.M().tileDark, 1.0);
        roof.position.set(-0.4, 2.12, 0); g.add(roof);
        const pipe = MT.Build.cyl(0.14, 0.14, 1.6, MT.M().steel, 10);
        pipe.rotation.z = rad(70); pipe.position.set(1.0, 0.8, 0); g.add(pipe);
        const tap = MT.Build.cyl(0.08, 0.08, 0.4, MT.M().metalDark, 8);
        tap.position.set(1.7, 0.5, 0); g.add(tap);
        const trough = MT.props.waterTrough();
        trough.position.set(0.6, 0, 1.6); g.add(trough);
        g.traverse((o) => { o.userData.noCollide = true; });
        this.group.add(g);
        MT.colliders.push({ x, y: gy + 1.2, z, hw: 1.1, hh: 1.2, hd: 1.0, ry: 0, cos: 1, sin: 0, active: true });
      }
    }

    /* ---------------- 四季 ---------------- */
    setSeason(season) {
      this.season = season;
      const key = season === 'spring' ? 'spring' : season === 'summer' ? 'summer' : season === 'autumn' ? 'autumn' : 'winter';
      for (const cropKey in this.cropSets) {
        const set = this.cropSets[cropKey];
        const rule = (SEASON_RULES[cropKey] || SEASON_RULES.wheat)[key];
        const hidden = !rule || rule.s <= 0.06;
        set.mesh.visible = !hidden && set.items.length > 0;
        if (hidden) continue;
        const baseC = new THREE.Color(rule.c);
        set.applySeason((it, col) => {
          col.copy(baseC);
          const k = 0.85 + ((it.ry * 6151) % 1) * 0.32;
          col.multiplyScalar(k);
          return col;
        }, () => rule.s);
      }
      // 田块地面颜色：顶点色已是作物冠层色，这里只做轻微的季节亮度/色调
      if (this.fieldMat) {
        const gc = {
          spring: 0xeef2e0, summer: 0xffffff, autumn: 0xf8ecd8, winter: 0xd9d8cc,
        }[key];
        const c = new THREE.Color(gc);
        this.fieldMat.color.copy(c);
        this.ridgeMat.color.setHex(season === 'winter' ? 0xcfc6b0 : 0xa89670);
      }
      // 秧田水色：夏天稻田长满秧苗，水面只剩暗绿缝隙反光——
      // 这里会覆盖 _buildPlots 里的初始色，四季都要压住，别再回到浅薄荷色
      if (this.paddyWater) {
        const wc = { spring: 0x35503f, summer: 0x27422f, autumn: 0x44543c, winter: 0x565e56 }[key];
        this.paddyWater.material.color.setHex(wc);
      }
    }

    update(dt) { /* 静态；留给风摆 */ }
  }

  /** 收割 / 采摘：返回作物名，并把附近作物"收掉" */
  Farm.prototype.harvestAt = function (x, z, radius) {
    const r = radius || 3.2;
    let best = null, bestD = Infinity;
    for (const p of this.plots) {
      const dx = Math.max(0, Math.abs(x - p.x) - p.w / 2);
      const dz = Math.max(0, Math.abs(z - p.z) - p.d / 2);
      const d = Math.hypot(dx, dz);
      if (d >= bestD) continue;
      const set = this.cropSets[p.crop];
      if (!set || set.mesh.visible === false || set.items.length === 0) continue;  // 该季不可见/无作物
      bestD = d; best = p;
    }
    if (!best || bestD > r) return null;
    const crop = CROPS[best.crop];
    let removed = 0;
    const dummy = new THREE.Object3D();
    for (const key in this.cropSets) {
      if (key !== best.crop) continue;
      const set = this.cropSets[key];
      for (let i = 0; i < set.items.length; i++) {
        const it = set.items[i];
        const d = Math.hypot(it.x - x, it.z - z);
        if (d > r * 1.6) continue;
        it.s = 0.02;
        removed++;
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.ry, 0);
        dummy.scale.setScalar(0.02);
        dummy.updateMatrix();
        set.mesh.setMatrixAt(i, dummy.matrix);
      }
      set.mesh.instanceMatrix.needsUpdate = true;
    }
    return { crop: best.crop, name: crop.name, removed, paddy: best.paddy };
  };

  MT.Farm = Farm;
  MT.FarmCrops = CROPS;
})();
