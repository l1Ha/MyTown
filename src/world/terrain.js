/* =============================================================
 *  MyTown · 我的家乡 3D  —  地形 / 淮河 / 大堤 / 道路 / 水塘
 *  terrain.js
 *  世界坐标：+X 东，-Z 北，+Z 南，Y 向上，单位米
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { clamp, lerp, smoothstep, TAU } = MT.util;

  const WORLD = 1000;                // 世界边长（外围留出朦胧的远景，避免看到"世界的边"）
  const HALF = WORLD / 2;
  const SEG = 256;                   // 网格分段
  const CELL = WORLD / SEG;

  // 关键地貌参数
  const RIVER_Z = -252;              // 淮河中心线
  const RIVER_HALF = 64;             // 淮河半宽
  const RIVER_BED = -6.2;            // 河底
  const WATER_Y = 0.0;               // 淮河水面
  const LEVEE_Z = -186;              // 淮河大堤中心线
  const LEVEE_H = 12.6;              // 大堤相对高度
  const VILLAGE = { x: 18, z: 4, h: 5.9 };
  const WA_CLUSTER = { x: -120, z: 46, h: 4.6 };   // 任洼队
  const PONDS = [
    { x: WA_CLUSTER.x, z: WA_CLUSTER.z, r: 24, y: 2.75, name: '任洼水塘' },
    { x: 104, z: 64, r: 17, y: 3.85, name: '藕塘' },
    { x: -186, z: -96, r: 14, y: 3.2, name: '苇塘' },
  ];

  let baseNoise = null, detailNoise = null, hillNoise = null;

  /* =========================================================
   *  地形高度（基础，不含道路）
   * ========================================================= */
  function heightBase(x, z) {
    let h = VILLAGE.h;

    // 大尺度缓坡：向南略高，向西抬升
    h += -z * 0.004;
    h += -x * 0.0026;

    // 缓丘起伏
    h += baseNoise.fbm(x * 0.0035, z * 0.0035, 4) * 3.4;
    h += detailNoise.fbm(x * 0.019, z * 0.019, 3) * 0.72;

    // 西部丘陵（低山岗地）
    const hillMask = smoothstep(-175, -330, x) * (1 - smoothstep(-120, 70, -Math.abs(z) + 300) * 0.0);
    if (hillMask > 0.001) {
      const r = hillNoise.ridged(x * 0.0032 + 11, z * 0.0032 - 7, 5);
      const r2 = hillNoise.fbm(x * 0.008, z * 0.008, 3);
      h += hillMask * (10 + r * 34 + r2 * 9);
    }
    // 西南方向小土岗
    const g2 = Math.exp(-(((x + 250) / 110) ** 2 + ((z - 200) / 90) ** 2));
    h += g2 * 16;

    // 村庄整平
    const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    h = lerp(h, VILLAGE.h + detailNoise.fbm(x * 0.03, z * 0.03, 2) * 0.25, 1 - smoothstep(52, 132, dv));

    // 任洼队整平
    const dw = Math.hypot(x - WA_CLUSTER.x, z - WA_CLUSTER.z);
    h = lerp(h, WA_CLUSTER.h + detailNoise.fbm(x * 0.035, z * 0.035, 2) * 0.3, 1 - smoothstep(38, 96, dw));

    // 水塘洼地
    for (const p of PONDS) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r * 1.8) {
        const t = clamp(d / (p.r * 1.6), 0, 1);
        const prof = 1 - smoothstep(0.25, 1, t);
        const bed = p.y - 2.6;
        h = lerp(h, bed, prof * 0.96);
      }
    }

    // 淮河河谷：由大堤外侧向下切入河床
    const dz = Math.abs(z - RIVER_Z);
    const bank = 1 - smoothstep(RIVER_HALF * 0.72, RIVER_HALF * 1.12, dz);
    if (bank > 0.001) {
      const bed = RIVER_BED - detailNoise.fbm(x * 0.02, z * 0.02, 3) * 0.9;
      h = lerp(h, bed, Math.pow(bank, 0.75));
    }
    // 南岸滩涂略低
    if (z > RIVER_Z && z < RIVER_Z + RIVER_HALF * 2.2) {
      h -= 0.6 * (1 - smoothstep(RIVER_HALF * 0.8, RIVER_HALF * 2.2, z - RIVER_Z));
    }

    // 淮河大堤（含南北两条）
    h += leveeProfile(x, z, LEVEE_Z, LEVEE_H, 30);
    h += leveeProfile(x, z, -334, LEVEE_H * 0.8, 26);   // 对岸远堤

    return h;
  }

  function leveeProfile(x, z, cz, height, halfWidth) {
    const d = Math.abs(z - cz);
    const t = clamp(d / halfWidth, 0, 1);
    // 平顶 + 缓坡
    const prof = t < 0.3 ? 1 : 1 - smoothstep(0.3, 1, t);
    // 沿堤顶略有起伏
    const wob = 1 + baseNoise.noise2(x * 0.006, cz * 0.01) * 0.06;
    return prof * height * wob;
  }

  /* =========================================================
   *  道路网络
   * ========================================================= */
  const ROAD_DEFS = [
    {
      name: '乡道', type: 'cement', w: 6.5, shoulder: 9,
      pts: [[-480, -40], [-380, -36], [-250, -35], [-140, -33], [-40, -30], [40, -27], [150, -22], [250, -16], [380, -10], [480, -6]],
    },
    {
      name: '村道', type: 'dirt', w: 4.2, shoulder: 6,
      pts: [[18, -30], [19, -8], [20, 14], [18, 44], [16, 84], [12, 140], [8, 210], [6, 320], [4, 420]],
    },
    {
      name: '淮河大堤路', type: 'cement', w: 5.6, shoulder: 8,
      pts: [[-490, -186], [-380, -186], [-200, -185], [0, -186], [200, -186], [380, -186], [490, -186]],
    },
    {
      name: '渡口路', type: 'dirt', w: 3.8, shoulder: 5.5,
      pts: [[92, -28], [93, -70], [95, -130], [96, -170], [97, -185], [99, -205], [101, -226]],
    },
    {
      name: '任洼路', type: 'dirt', w: 3.4, shoulder: 5,
      pts: [[-40, -31], [-70, -16], [-95, 10], [-104, 24], [-92, 40], [-96, 64], [-120, 80], [-172, 92]],
    },
    {
      name: '南田路', type: 'dirt', w: 3.2, shoulder: 4.6,
      pts: [[-470, 172], [-330, 168], [-160, 164], [0, 160], [160, 158], [330, 156], [470, 152]],
    },
    {
      name: '西田路', type: 'dirt', w: 3.0, shoulder: 4.4,
      pts: [[-132, 56], [-132, 110], [-134, 170], [-136, 240], [-136, 300], [-138, 400]],
    },
    {
      name: '东巷', type: 'dirt', w: 2.8, shoulder: 4,
      pts: [[50, -28], [50, 0], [50, 40], [52, 82], [54, 130]],
    },
    {
      name: '小学路', type: 'dirt', w: 2.6, shoulder: 3.6,
      pts: [[38, -28], [60, -22], [80, -16]],
    },
  ];

  class RoadNetwork {
    constructor(defs) {
      this.defs = defs;
      this.samples = [];        // {x,z,h,type,w,shoulder,nx,nz}
      this.grid = new Map();
      this.cellSize = 12;
      this._build();
      this._fixHeights();
    }
    _key(cx, cz) { return cx * 100000 + cz; }
    _build() {
      const step = 1.2;
      for (const def of this.defs) {
        const pts = def.pts;
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
          const len = Math.hypot(x1 - x0, z1 - z0);
          const n = Math.max(1, Math.round(len / step));
          for (let k = 0; k <= n; k++) {
            const t = k / n;
            this.samples.push({
              x: lerp(x0, x1, t), z: lerp(z0, z1, t), h: 0,
              type: def.type, w: def.w, shoulder: def.shoulder, name: def.name,
              ix: i, t,
            });
          }
        }
      }
      // 空间网格
      for (let i = 0; i < this.samples.length; i++) {
        const s = this.samples[i];
        const cx = Math.floor(s.x / this.cellSize), cz = Math.floor(s.z / this.cellSize);
        const r = Math.ceil((s.shoulder + 6) / this.cellSize);
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
          const key = this._key(cx + a, cz + b);
          let arr = this.grid.get(key);
          if (!arr) this.grid.set(key, (arr = []));
          arr.push(i);
        }
      }
    }
    _fixHeights() {
      // 道路中心线高度 = 基础地形高度，并做纵向平滑，避免颠簸
      const byRoad = new Map();
      for (const s of this.samples) {
        const k = s.name + '#' + s.ix;
        let arr = byRoad.get(k); if (!arr) byRoad.set(k, (arr = []));
        arr.push(s);
        s.hBase = heightBase(s.x, s.z);
      }
      for (const arr of byRoad.values()) {
        // 三次平滑
        let vals = arr.map((s) => s.hBase);
        for (let pass = 0; pass < 4; pass++) {
          const nv = vals.slice();
          for (let i = 1; i < vals.length - 1; i++) nv[i] = (vals[i - 1] + vals[i] * 2 + vals[i + 1]) * 0.25;
          vals = nv;
        }
        for (let i = 0; i < arr.length; i++) arr[i].h = vals[i];
      }
    }
    /** 查询最近道路：返回 {dist, h, type, w} 或 null */
    query(x, z) {
      const cx = Math.floor(x / this.cellSize), cz = Math.floor(z / this.cellSize);
      let best = null, bestD = Infinity;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const arr = this.grid.get(this._key(cx + a, cz + b));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const s = this.samples[arr[i]];
          const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
          if (d < bestD) { bestD = d; best = s; }
        }
      }
      if (!best) return null;
      const dist = Math.sqrt(bestD);
      const maxR = best.w * 0.5 + best.shoulder;
      if (dist > maxR) return null;
      return { dist, h: best.h, type: best.type, w: best.w, shoulder: best.shoulder, name: best.name };
    }
  }

  /* =========================================================
   *  地形（网格 + 采样）
   * ========================================================= */
  class Terrain {
    constructor(opts = {}) {
      this.world = WORLD; this.half = HALF; this.seg = SEG; this.cell = CELL;
      this.rng = opts.rng || new MT.RNG(20240715);
      baseNoise = new MT.Noise(1013);
      detailNoise = new MT.Noise(7717);
      hillNoise = new MT.Noise(4242);

      this.roads = new RoadNetwork(ROAD_DEFS);
      this.group = new THREE.Group();
      this.group.name = '地形';

      this._buildHeightGrid();
      this.mesh = this._buildMesh(opts.quality);
      this.group.add(this.mesh);
      this.water = this._buildWater();
      this.water.forEach((w) => this.group.add(w.mesh));
      this.roadMeshes = this._buildRoads(opts.quality);
      this.roadMeshes.forEach((m) => this.group.add(m));

      this._waterMats = [];
      this.water.forEach((w) => this._waterMats.push(w.mat));
    }

    /* ---------- 高度：网格 + 双线性采样 ---------- */
    _buildHeightGrid() {
      const N = SEG + 1;
      this.hgrid = new Float32Array(N * N);
      for (let j = 0; j < N; j++) {
        const z = -HALF + j * CELL;
        for (let i = 0; i < N; i++) {
          const x = -HALF + i * CELL;
          this.hgrid[j * N + i] = this.heightRaw(x, z);
        }
      }
    }
    /** 原始高度（含道路整平），用于生成网格 */
    heightRaw(x, z) {
      let h = heightBase(x, z);
      const r = this.roads.query(x, z);
      if (r) {
        const t = 1 - smoothstep(r.w * 0.5, r.w * 0.5 + r.shoulder, r.dist);
        h = lerp(h, r.h, t * 0.94);
      }
      return h;
    }
    /** 双线性采样（与网格一致），玩家行走用 */
    heightAt(x, z) {
      const fx = clamp((x + HALF) / CELL, 0, SEG - 1e-4);
      const fz = clamp((z + HALF) / CELL, 0, SEG - 1e-4);
      const i = fx | 0, j = fz | 0;
      const tx = fx - i, tz = fz - j;
      const N = SEG + 1, g = this.hgrid;
      const h00 = g[j * N + i], h10 = g[j * N + i + 1];
      const h01 = g[(j + 1) * N + i], h11 = g[(j + 1) * N + i + 1];
      return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
    }
    normalAt(x, z, out) {
      const e = 1.2;
      const hl = this.heightAt(x - e, z), hr = this.heightAt(x + e, z);
      const hd = this.heightAt(x, z - e), hu = this.heightAt(x, z + e);
      out = out || new THREE.Vector3();
      out.set(hl - hr, 2 * e, hd - hu).normalize();
      return out;
    }
    slopeAt(x, z) {
      const n = this.normalAt(x, z, this._tmpN || (this._tmpN = new THREE.Vector3()));
      return Math.acos(clamp(n.y, 0, 1));
    }

    /* ---------- 地表类型（脚步音/作物） ---------- */
    surfaceAt(x, z) {
      const r = this.roads.query(x, z);
      if (r && r.dist < r.w * 0.55) return r.type === 'cement' ? 'cement' : 'mud';
      if (this.waterDepth(x, z) > 0.05) return 'water';
      const h = this.heightAt(x, z);
      if (z < RIVER_Z + RIVER_HALF * 2.4 && z > RIVER_Z - RIVER_HALF * 2.4 && h < 3.2) return 'sand';
      if (Math.abs(z - LEVEE_Z) < 34) return 'grass';
      return 'grass';
    }

    /* ---------- 水面判定 ---------- */
    waterAt(x, z) {
      // 淮河
      if (Math.abs(z - RIVER_Z) < RIVER_HALF * 2.4) {
        return { y: WATER_Y, kind: 'river' };
      }
      for (const p of PONDS) {
        if (Math.hypot(x - p.x, z - p.z) < p.r * 1.15) return { y: p.y, kind: 'pond', ref: p };
      }
      return null;
    }
    waterDepth(x, z) {
      const w = this.waterAt(x, z);
      if (!w) return 0;
      return Math.max(0, w.y - this.heightAt(x, z));
    }
    /** 是否在水里（脚部） */
    isWet(x, z, y) {
      const w = this.waterAt(x, z);
      return !!w && y < w.y - 0.15;
    }

    /* ---------- 顶点色（作为贴图混合遮罩） ---------- */
    _vertexColors(x, z, h, slope) {
      // r = 泥土/田, g = 道路, b = 沙/滩涂
      let mSoil = 0, mRoad = 0, mSand = 0;
      const dV = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
      const dW = Math.hypot(x - WA_CLUSTER.x, z - WA_CLUSTER.z);

      // 农田区（村庄以南、村庄外围）
      if (z > 34 || (z > -175 && x < -60)) {
        const patch = smoothstep(0.0, 0.55, baseNoise.fbm(x * 0.012 + 40, z * 0.012 - 20, 3) * 0.5 + 0.5);
        mSoil = 0.28 + 0.5 * patch;
      }
      // 村内地面多为土
      if (dV < 96) mSoil = Math.max(mSoil, 0.42 * (1 - smoothstep(60, 96, dV)));
      if (dW < 60) mSoil = Math.max(mSoil, 0.5 * (1 - smoothstep(34, 60, dW)));

      // 河滩 / 河底（只在靠近水边的滩涂上）
      const riverBand = 1 - smoothstep(RIVER_HALF * 1.02, RIVER_HALF * 1.55, Math.abs(z - RIVER_Z));
      mSand = Math.max(mSand, riverBand);
      if (h < WATER_Y + 1.2) mSand = Math.max(mSand, smoothstep(WATER_Y + 1.2, WATER_Y - 3, h));
      // 水塘岸边
      for (const p of PONDS) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < p.r * 2.4) mSand = Math.max(mSand, 0.8 * (1 - smoothstep(p.r, p.r * 1.9, d)));
      }
      // 陡坡露土
      mSoil = Math.max(mSoil, smoothstep(0.32, 0.75, slope) * 0.75);

      // 路（把地面染成路色，隐藏接缝）
      const r = this.roads.query(x, z);
      if (r) mRoad = (1 - smoothstep(r.w * 0.5 + 1.5, r.w * 0.5 + r.shoulder, r.dist)) * 0.9;

      return [clamp(mSoil, 0, 1), clamp(mRoad, 0, 1), clamp(mSand, 0, 1)];
    }

    /* ---------- 地形网格 ---------- */
    _buildMesh(quality) {
      const N = SEG + 1;
      const geo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = j * N + i;
          const x = -HALF + i * CELL, z = -HALF + j * CELL;
          const h = this.hgrid[idx];
          pos.setY(idx, h);
          // 坡度近似（用邻格）
          const g = this.hgrid;
          const hl = g[j * N + Math.max(0, i - 1)], hr = g[j * N + Math.min(N - 1, i + 1)];
          const hd = g[Math.max(0, j - 1) * N + i], hu = g[Math.min(N - 1, j + 1) * N + i];
          const slope = Math.atan(Math.hypot((hr - hl) / (2 * CELL), (hu - hd) / (2 * CELL)));
          const c = this._vertexColors(x, z, h, slope);
          colors[idx * 3] = c[0]; colors[idx * 3 + 1] = c[1]; colors[idx * 3 + 2] = c[2];
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const grassT = MT.texture.cloneTex('grass', 120, 120);
      const soilT = MT.texture.cloneTex('soil', 85, 85);
      const roadT = MT.texture.cloneTex('cementRoad', 55, 55);
      const sandT = MT.texture.cloneTex('dirtRoad', 70, 70);
      const mat = new THREE.MeshStandardMaterial({
        map: grassT, vertexColors: true, roughness: 1.0, metalness: 0.0,
      });
      mat.userData.splat = { soilT, roadT, sandT };
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSoilT = { value: soilT };
        shader.uniforms.uRoadT = { value: roadT };
        shader.uniforms.uSandT = { value: sandT };
        shader.uniforms.uScale = { value: 1.0 };
        shader.vertexShader = 'varying vec3 vSplat;\n' + shader.vertexShader.replace(
          '#include <color_vertex>', '#include <color_vertex>\n  vSplat = vColor;'
        );
        shader.fragmentShader =
          'varying vec3 vSplat;\nuniform sampler2D uSoilT;\nuniform sampler2D uRoadT;\nuniform sampler2D uSandT;\nuniform float uScale;\n' +
          shader.fragmentShader
            .replace('#include <color_fragment>', '// splat masks (see map_fragment)')
            .replace('#include <map_fragment>', `
              #ifdef USE_MAP
                vec4 gT = texture2D( map, vMapUv );
                vec4 sT = texture2D( uSoilT, vMapUv );
                vec4 rT = texture2D( uRoadT, vMapUv );
                vec4 dT = texture2D( uSandT, vMapUv );
                float mSoil = vSplat.r, mRoad = vSplat.g, mSand = vSplat.b;
                float mGrass = clamp(1.0 - mSoil - mRoad - mSand, 0.0, 1.0);
                vec4 texelColor = gT * mGrass + sT * mSoil + rT * mRoad + dT * mSand;
                diffuseColor *= texelColor;
              #endif
            `);
      };
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.name = '地面';
      mesh.userData.terrain = true;
      return mesh;
    }

    /* ---------- 水面 ---------- */
    _buildWater() {
      const out = [];
      // 淮河
      const riverGeo = new THREE.PlaneGeometry(WORLD + 400, RIVER_HALF * 4.4, 1, 1);
      riverGeo.rotateX(-Math.PI / 2);
      const riverMat = MT.mat.water(0x3c6b6a, 0.9);
      const river = new THREE.Mesh(riverGeo, riverMat);
      river.position.set(0, WATER_Y, RIVER_Z);
      river.name = '淮河';
      river.receiveShadow = false;
      out.push({ mesh: river, mat: riverMat, kind: 'river', y: WATER_Y });

      // 水塘
      for (const p of PONDS) {
        const g = new THREE.CircleGeometry(p.r * 1.25, 48);
        g.rotateX(-Math.PI / 2);
        const m = MT.mat.water(0x35635f, 0.86);
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(p.x, p.y, p.z);
        mesh.name = p.name;
        out.push({ mesh, mat: m, kind: 'pond', y: p.y, ref: p });
      }
      return out;
    }

    /* ---------- 道路网格 ---------- */
    _buildRoads(quality) {
      const meshes = [];
      const groupsByType = {};
      const defs = this.roads.defs;
      for (const def of defs) (groupsByType[def.type] = groupsByType[def.type] || []).push(def);
      for (const type in groupsByType) {
        const positions = [], uvs = [], normals = [], indices = [];
        let vBase = 0;
        for (const def of groupsByType[type]) {
          const pts = def.pts;
          const half = def.w * 0.5;
          // 重采样
          const samp = [];
          for (let i = 0; i < pts.length - 1; i++) {
            const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
            const len = Math.hypot(x1 - x0, z1 - z0);
            const n = Math.max(2, Math.round(len / 2.0));
            for (let k = (i === 0 ? 0 : 1); k <= n; k++) {
              const t = k / n;
              samp.push({ x: lerp(x0, x1, t), z: lerp(z0, z1, t) });
            }
          }
          let dist = 0;
          for (let i = 0; i < samp.length; i++) {
            const p = samp[i];
            const pa = samp[Math.max(0, i - 1)], pb = samp[Math.min(samp.length - 1, i + 1)];
            let dx = pb.x - pa.x, dz = pb.z - pa.z;
            const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
            const nx = -dz, nz = dx;
            if (i > 0) dist += Math.hypot(p.x - samp[i - 1].x, p.z - samp[i - 1].z);
            const yL = this.heightAt(p.x + nx * half, p.z + nz * half) + 0.06;
            const yR = this.heightAt(p.x - nx * half, p.z - nz * half) + 0.06;
            const yC = this.heightAt(p.x, p.z) + 0.075;
            positions.push(p.x + nx * half, yL, p.z + nz * half);
            positions.push(p.x - nx * half, yR, p.z - nz * half);
            normals.push(0, 1, 0, 0, 1, 0);
            uvs.push(0, dist / 4, 1, dist / 4);
            if (i > 0) {
              const a = vBase + (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3;
              indices.push(a, c, b, b, c, d);
            }
            void yC;
          }
          vBase += samp.length * 2;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        const mat = type === 'cement'
          ? MT.mat.cement(1, 1)
          : MT.mat.dirt(1, 1);
        if (mat.map) { mat.map.repeat.set(1, 1); }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.name = '道路_' + type;
        mesh.userData.noCollide = true;
        meshes.push(mesh);
      }
      return meshes;
    }

    /* ---------- 每帧更新（水波） ---------- */
    update(dt, camera) {
      for (const w of this._waterMats) {
        const n = w.userData.normalMapRef;
        if (n) {
          n.offset.x += dt * 0.017;
          n.offset.y += dt * 0.011;
        }
      }
    }

    /** 导出用于小地图的地貌栅格（低成本） */
    minimapData(size) {
      const out = new Uint8Array(size * size);
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const x = -HALF + (i + 0.5) / size * WORLD;
          const z = -HALF + (j + 0.5) / size * WORLD;
          const h = this.heightAt(x, z);
          let v = 1; // 草地
          const w = this.waterAt(x, z);
          if (w && h < w.y) v = 2;                        // 水
          else if (z < RIVER_Z + RIVER_HALF * 2.2 && h < 3.4) v = 3; // 滩涂
          else if (h > 30) v = 4;                         // 山岗
          const r = this.roads.query(x, z);
          if (r && r.dist < r.w * 0.7) v = 5;             // 路
          out[j * size + i] = v;
        }
      }
      return out;
    }
  }

  MT.Terrain = Terrain;
  MT.TerrainConst = {
    WORLD, HALF, SEG, CELL, RIVER_Z, RIVER_HALF, WATER_Y, LEVEE_Z, LEVEE_H, VILLAGE, WA_CLUSTER, PONDS, ROAD_DEFS,
  };
})();
