/* =============================================================
 *  MyTown · 我的家乡 3D  —  植被（树木 / 草丛 / 芦苇 / 荷叶）
 *  vegetation.js : 杨树、柳树、槐树、泡桐、柏树、果树、竹丛、草丛
 *                  带四季变化（春芽 / 夏荫 / 秋黄 / 冬枯）
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad, lerp, clamp, TAU } = MT.util;

  /* ---------------- 风摆（给草 / 芦苇 / 野花 / 庄稼用） ----------------
   * 在顶点着色器里按"高度权重 + 世界位置相位"让植物随风轻摆。 */
  MT._windU = MT._windU || { value: 0 };
  MT.windMaterial = function (mat, strength) {
    if (!mat || mat.userData._wind) return mat;
    mat.userData._wind = true;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = function (shader) {
      if (prev) prev(shader);
      shader.uniforms.uTime = MT._windU;
      shader.uniforms.uWind = { value: strength === undefined ? 0.06 : strength };
      shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 _ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 _ip = vec3(0.0);
          #endif
          float _hf = clamp(uv.y, 0.0, 1.0); _hf *= _hf;
          float _sw = sin(uTime * 1.6 + _ip.x * 0.25 + _ip.z * 0.2) * 0.6
                    + sin(uTime * 3.3 + _ip.z * 0.4 + _ip.x * 0.1) * 0.25;
          transformed.x += _sw * uWind * _hf;
          transformed.z += _sw * 0.55 * uWind * _hf;`);
    };
    mat.needsUpdate = true;
    return mat;
  };
  MT.windTick = function (dt) { MT._windU.value += dt; };

  /* ---------------- 树种表 ---------------- */
  const SPECIES = {
    poplar: { // 杨树：淮河两岸最常见的行道树、防护林
      name: '杨树', h: [13, 20], trunkR: [0.16, 0.26], crownR: [1.6, 2.7], crownH: [7, 12],
      blobs: 4, leafGeo: 'ico', spring: 0x9ec46a, summer: 0x5f9440, autumn: 0xd8c05a, winter: 0x8a7c60,
      trunk: 0x8c8074, collider: true,
    },
    willow: { // 柳树：水边、塘埂
      name: '柳树', h: [7, 11], trunkR: [0.18, 0.3], crownR: [2.6, 4.2], crownH: [3.5, 6],
      blobs: 6, leafGeo: 'ico', droop: true,
      spring: 0xbcd47a, summer: 0x7fae54, autumn: 0xd0b45e, winter: 0x8f8467,
      trunk: 0x6f6455,
    },
    locust: { // 槐树
      name: '槐树', h: [9, 14], trunkR: [0.24, 0.4], crownR: [3, 4.6], crownH: [4.5, 7.5],
      blobs: 5, leafGeo: 'ico',
      spring: 0x8fbf60, summer: 0x4f8a3a, autumn: 0xc9a848, winter: 0x7d7259,
      trunk: 0x5d5248, collider: true,
    },
    paulownia: { // 泡桐
      name: '泡桐', h: [10, 13], trunkR: [0.26, 0.42], crownR: [3.2, 4.8], crownH: [4, 7],
      blobs: 5, leafGeo: 'ico',
      spring: 0xa8c878, summer: 0x5f9a48, autumn: 0xc0a24c, winter: 0x7a7058,
      trunk: 0x6d6152,
    },
    cypress: { // 柏树：村口、祠堂、坟地
      name: '柏树', h: [6, 10], trunkR: [0.14, 0.2], crownR: [0.9, 1.5], crownH: [4.5, 8],
      blobs: 3, leafGeo: 'cone',
      spring: 0x3f6b3c, summer: 0x2f5c30, autumn: 0x35563a, winter: 0x2c4a34,
      trunk: 0x50463c, collider: true,
    },
    peach: { // 桃树 / 果树
      name: '桃树', h: [3.6, 5.4], trunkR: [0.1, 0.17], crownR: [1.5, 2.4], crownH: [1.6, 2.6],
      blobs: 4, leafGeo: 'ico',
      spring: 0xe8a8b8, summer: 0x5b9440, autumn: 0xd08a3c, winter: 0x7c6f5c,
      trunk: 0x5f5044, fruit: 'peach',
    },
    persimmon: { // 柿树
      name: '柿树', h: [4.5, 6.5], trunkR: [0.12, 0.2], crownR: [1.8, 2.8], crownH: [2, 3.2],
      blobs: 4, leafGeo: 'ico',
      spring: 0x94bc64, summer: 0x4d8638, autumn: 0xd8823a, winter: 0x7a6c58,
      trunk: 0x584c40, fruit: 'persimmon',
    },
  };

  /* ---------------- 实例集合（支持四季重建） ---------------- */
  class InstSet {
    constructor(geo, mat, capacity, name) {
      this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
      this.mesh.name = name || 'inst';
      // 实例分布在整个世界里，包围球无法有效剔除（会被误剔除导致"树没有叶子"），
      // 因此关闭视锥剔除，交给 GPU 处理。
      this.mesh.frustumCulled = false;
      this.mesh.count = 0;
      this.items = [];
      this.dummy = new THREE.Object3D();
      this.dummy.rotation.order = 'YXZ';   // 便于用 (tilt, yaw) 摆放树枝
      this.tmpC = new THREE.Color();
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.capacity = capacity;
    }
    add(pos, ry, scale, tint, extra) {
      if (this.items.length >= this.capacity) return;
      this.items.push({ x: pos.x, y: pos.y, z: pos.z, ry, s: scale, tint: tint === undefined ? 1 : tint, ex: extra || 0 });
    }
    commit() {
      this.mesh.count = this.items.length;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        this.dummy.position.set(it.x, it.y, it.z);
        this.dummy.rotation.set(it.rx || 0, it.ry, it.rz || 0);
        const s = it.s * (it.tintSize === undefined ? 1 : it.tintSize);
        this.dummy.scale.set(s * (it.sx || 1), s * (it.sy || 1), s * (it.sz || 1));
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        this.mesh.setColorAt(i, this.tmpC.setRGB(1, 1, 1));
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
    /** 四季重建：colorFn(base) -> Color ; sizeFn -> 缩放系数 */
    applySeason(colorFn, sizeFn) {
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        this.dummy.position.set(it.x, it.y, it.z);
        this.dummy.rotation.set(it.rx || 0, it.ry, it.rz || 0);
        const s = it.s * (sizeFn ? sizeFn(it) : 1);
        this.dummy.scale.set(s * (it.sx || 1), s * (it.sy || 1), s * (it.sz || 1));
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        this.mesh.setColorAt(i, colorFn(it, this.tmpC));
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /* =========================================================
   *  植被系统
   * ========================================================= */
  class Vegetation {
    constructor(scene, terrain, opts = {}) {
      this.scene = scene;
      this.terrain = terrain;
      this.rng = opts.rng || new MT.RNG(31337);
      this.season = opts.season || 'summer';
      this.quality = opts.quality || 'high';
      this.q = this.quality === 'low' ? 0.45 : this.quality === 'medium' ? 0.72 : 1;
      this.group = new THREE.Group();
      this.group.name = '植被';
      this.group.userData.vegetation = true;
      scene.add(this.group);
      this.trees = {};      // key -> {trunk:InstSet, leaf:InstSet}
      this.landmarks = [];
      this.flowerSets = [];
      this._build();
      this.setSeason(this.season);
    }

    /* ---------- 采集所有树的位置 ---------- */
    _build() {
      const r = this.rng;
      const T = this.terrain;
      const placements = [];   // {key,x,z,s}
      const H = T.heightAt.bind(T);

      const inWater = (x, z) => T.waterDepth(x, z) > 0.05;

      /* 1. 行道树 / 防护林带（沿路、沿堤） */
      const line = (pts, key, spacing, jitter, prob) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
          const len = Math.hypot(x1 - x0, z1 - z0);
          const n = Math.floor(len / spacing);
          for (let k = 0; k <= n; k++) {
            const t = k / n;
            const x = lerp(x0, x1, t) + r.range(-jitter, jitter);
            const z = lerp(z0, z1, t) + r.range(-jitter, jitter);
            if (r.next() > (prob === undefined ? 0.85 : prob)) continue;
            if (inWater(x, z)) continue;
            placements.push({ key: key(x, z, k), x, z, s: r.range(0.85, 1.2) });
          }
        }
      };
      // 淮河大堤两侧防护林
      line([[-480, -212], [480, -212]], () => 'poplar', 9, 2.4, 0.9);
      line([[-480, -160], [480, -160]], () => 'poplar', 11, 3.0, 0.85);
      // 乡道行道树
      line([[-480, -44], [480, -8]], (x, z) => (r.chance(0.7) ? 'poplar' : 'locust'), 12, 2.6, 0.8);
      // 村道
      line([[18, -30], [4, 420]], () => (r.chance(0.5) ? 'poplar' : 'locust'), 15, 3.0, 0.6);
      // 田间路
      line([[-470, 172], [470, 152]], (x, z) => (r.chance(0.6) ? 'poplar' : 'willow'), 17, 3.5, 0.55);
      // 渡口路（柳树多）
      line([[92, -28], [101, -226]], () => 'willow', 13, 3.0, 0.7);

      /* 2. 村落内外的杂树（榆、槐、泡桐、果树） */
      const villageCenters = [
        { x: MT.TerrainConst.VILLAGE.x, z: MT.TerrainConst.VILLAGE.z, r: 95, n: Math.round(68 * this.q) },
        { x: MT.TerrainConst.WA_CLUSTER.x, z: MT.TerrainConst.WA_CLUSTER.z, r: 60, n: Math.round(36 * this.q) },
      ];
      for (const vc of villageCenters) {
        for (let i = 0; i < vc.n; i++) {
          const a = r.next() * TAU, d = Math.sqrt(r.next()) * vc.r;
          const x = vc.x + Math.cos(a) * d, z = vc.z + Math.sin(a) * d;
          if (inWater(x, z)) continue;
          if (T.slopeAt(x, z) > 0.5) continue;
          const key = r.pick(['locust', 'paulownia', 'poplar', 'peach', 'persimmon', 'locust', 'willow']);
          placements.push({ key, x, z, s: r.range(0.8, 1.15) });
        }
      }

      /* 3. 水边柳树 + 芦苇 */
      const pondList = MT.TerrainConst.PONDS;
      for (const p of pondList) {
        for (let i = 0; i < 14; i++) {
          const a = r.next() * TAU;
          const d = p.r * r.range(1.12, 1.55);
          const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
          if (inWater(x, z)) continue;
          placements.push({ key: r.chance(0.7) ? 'willow' : 'poplar', x, z, s: r.range(0.8, 1.1) });
        }
      }
      // 淮河滩涂杨树林
      for (let i = 0; i < 620 * this.q; i++) {
        const x = r.range(-470, 470);
        const z = MT.TerrainConst.RIVER_Z + r.range(-96, 96);
        if (inWater(x, z)) continue;
        if (Math.abs(z - MT.TerrainConst.LEVEE_Z) < 16) continue;
        if (T.heightAt(x, z) < MT.TerrainConst.WATER_Y + 0.4) continue;
        if (T.heightAt(x, z) > 9) continue;
        if (r.chance(0.45)) continue;
        placements.push({ key: r.chance(0.8) ? 'poplar' : 'willow', x, z, s: r.range(0.8, 1.25) });
      }

      /* 4. 西部丘陵林地 */
      for (let i = 0; i < 1150 * this.q; i++) {
        const x = r.range(-490, -140);
        const z = r.range(-420, 470);
        const h = T.heightAt(x, z);
        const dw = Math.hypot(x - MT.TerrainConst.WA_CLUSTER.x, z - MT.TerrainConst.WA_CLUSTER.z);
        if (dw < 55) continue;
        if (inWater(x, z)) continue;
        if (h < 9 && r.chance(0.75)) continue;
        const key = r.pick(['poplar', 'locust', 'cypress', 'paulownia', 'locust', 'cypress']);
        placements.push({ key, x, z, s: r.range(0.75, 1.3) });
      }
      // 西南土岗杂树
      for (let i = 0; i < 260 * this.q; i++) {
        const a = r.next() * TAU, d = Math.sqrt(r.next()) * 120;
        const x = -250 + Math.cos(a) * d, z = 200 + Math.sin(a) * d;
        if (inWater(x, z) || T.heightAt(x, z) < 8) continue;
        placements.push({ key: r.pick(['locust', 'cypress', 'poplar', 'persimmon']), x, z, s: r.range(0.8, 1.2) });
      }

      /* 5. 零散远树（补充地平线，让远处不至于空旷） */
      for (let i = 0; i < 620 * this.q; i++) {
        const x = r.range(-490, 490), z = r.range(-470, 490);
        if (inWater(x, z)) continue;
        const dw = Math.hypot(x - MT.TerrainConst.VILLAGE.x, z - MT.TerrainConst.VILLAGE.z);
        if (dw < 120) continue;
        if (r.chance(0.55)) continue;
        placements.push({ key: r.pick(['poplar', 'locust', 'paulownia', 'cypress']), x, z, s: r.range(0.7, 1.15) });
      }

      /* 6. 祠堂 / 庙前柏树（成对） */
      this.extraTrees = [];
      this._plant(placements, H);

      /* 7. 草丛 */
      this._buildGrass();
      this._buildGroundCover();
      /* 8. 芦苇 */
      this._buildReeds();
      /* 9. 荷叶 */
      this._buildLotus();
      /* 10. 灌木 / 野花 */
      this._buildBushes();
      this._buildFlowers();
    }

    _plant(placements, H) {
      const rng = this.rng;
      const byKey = {};
      const plots = MT.farmPlots || [];
      const inField = (x, z) => {
        for (let i = 0; i < plots.length; i++) {
          const p = plots[i];
          if (Math.abs(x - p.x) < p.w / 2 + 0.6 && Math.abs(z - p.z) < p.d / 2 + 0.6) return true;
        }
        return false;
      };
      for (const p of placements) {
        if (MT.inBuildZone(p.x, p.z, 1.5)) continue;
        if (inField(p.x, p.z)) continue;
        (byKey[p.key] = byKey[p.key] || []).push(p);
      }
      const hi = this.quality === 'high' || this.quality === 'ultra';
      const blobDetail = this.quality === 'low' ? 0 : 1;
      const blobMul = this.quality === 'low' ? 0.7 : this.quality === 'medium' ? 1.0 : 1.4;
      const coneGeo = new THREE.ConeGeometry(1, 2.2, this.quality === 'low' ? 6 : 9, 3);
      const trunkGeo = this._trunkGeo();
      const branchGeo = new THREE.CylinderGeometry(0.32, 0.8, 1, 6, 1, true);
      branchGeo.translate(0, 0.5, 0);

      for (const key in byKey) {
        const spec = SPECIES[key];
        if (!spec) continue;
        const list = byKey[key];
        // 树干 / 树枝（同一材质）
        const barkTex = MT.texture.cloneTex('bark', 1, Math.max(2, Math.round(spec.h[1] * 0.45)));
        const trunkMat = new THREE.MeshStandardMaterial({ color: spec.trunk, roughness: 0.95, map: barkTex || null });
        const trunkSet = new InstSet(trunkGeo, trunkMat, list.length, key + '_trunk');
        const branchSet = new InstSet(branchGeo, trunkMat, list.length * 12, key + '_branch');
        // 树冠
        const cone = spec.leafGeo === 'cone';
        const cardsPer = cone ? 0 : (this.quality === 'low' ? 8 : this.quality === 'medium' ? 12 : 18);
        const leafMat = cone
          ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: MT.tex.leafCluster() })
          : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: MT.tex.leafCard(), alphaTest: 0.45, side: THREE.DoubleSide });
        if (!cone) MT.windMaterial(leafMat, 0.07);
        const leafGeo = cone ? coneGeo : leafCardGeo();
        const cap = list.length * (cone ? (Math.ceil(spec.blobs * blobMul) + 10) : (cardsPer + 8)) + 8;
        const leafSet = new InstSet(leafGeo.clone(), leafMat, cap, key + '_leaf');
        // 内芯团块（不透明），保证树冠有实体感
        const coreSet = cone ? null : new InstSet(
          this._lumpyGeo(blobDetail, key.length * 13 + 5),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: MT.tex.leafCluster() }),
          list.length * 6 + 4, key + '_core');

        for (const p of list) {
          const h = lerp(spec.h[0], spec.h[1], rng.next()) * p.s;
          const tr = lerp(spec.trunkR[0], spec.trunkR[1], rng.next()) * p.s;
          const gy = H(p.x, p.z);
          trunkSet.add({ x: p.x, y: gy, z: p.z }, rng.next() * TAU, 1, 1, 0);
          trunkSet.items[trunkSet.items.length - 1].trunkS = { h, r: tr };

          const cr = lerp(spec.crownR[0], spec.crownR[1], rng.next()) * p.s;
          const ch = lerp(spec.crownH[0], spec.crownH[1], rng.next()) * p.s;
          const baseY = gy + h * 0.6 + ch * 0.45;
          const willow = !!spec.droop;

          // 树枝：中上部向外分叉
          if (spec.leafGeo !== 'cone') {
            const nBr = Math.max(3, Math.round((3 + spec.blobs * 0.6) * (this.quality === 'low' ? 0.6 : 1)));
            for (let b = 0; b < nBr; b++) {
              const az = rng.next() * TAU;
              const bh = h * rng.range(0.5, 0.72);
              const len = cr * rng.range(0.45, 0.75) + rng.range(0.6, 1.4);
              const tilt = rng.range(48, 72) * Math.PI / 180;
              branchSet.add({ x: p.x + Math.cos(az) * tr * 0.4, y: gy + bh, z: p.z + Math.sin(az) * tr * 0.4 }, az, 1, 1, 0);
              const bit = branchSet.items[branchSet.items.length - 1];
              bit.rx = tilt; bit.ry = az;
              bit.sx = tr * rng.range(0.5, 0.8); bit.sz = bit.sx; bit.sy = len;
            }
          }

          // 树冠
          if (cone) {
            const nB = Math.max(3, Math.round(spec.blobs * blobMul));
            for (let b = 0; b < nB; b++) {
              const t = b / Math.max(1, nB - 1);
              leafSet.add({ x: p.x, y: gy + h * (0.3 + t * 0.72), z: p.z }, rng.next() * TAU, cr * (1.15 - t * 0.82), 1, 0);
            }
          } else {
            for (let k = 0; k < cardsPer; k++) {
              const az = rng.next() * TAU;
              const el = (rng.next() - 0.5) * 1.7;
              const rr = Math.cbrt(rng.next());
              const bx = p.x + Math.cos(az) * Math.cos(el) * cr * rr;
              const bz = p.z + Math.sin(az) * Math.cos(el) * cr * rr;
              const by = baseY + Math.sin(el) * ch * rr * 0.7 - (willow ? ch * 0.12 : 0);
              const csz = cr * rng.range(0.55, 0.85) * (willow ? 0.9 : 1);
              leafSet.add({ x: bx, y: by, z: bz }, rng.next() * TAU, csz, 1, 0);
              const li = leafSet.items[leafSet.items.length - 1];
              li.rx = rng.range(-0.7, 0.7); li.rz = rng.range(-0.7, 0.7);
              li.sy = willow ? 0.85 : rng.range(0.85, 1.1);
            }
            // 垂柳：额外的下垂叶
            if (willow) {
              for (let k = 0; k < 8; k++) {
                const az = rng.next() * TAU, rad = cr * rng.range(0.5, 1.0);
                leafSet.add({ x: p.x + Math.cos(az) * rad, y: gy + h * 0.6 + rng.range(-1.4, 0.3), z: p.z + Math.sin(az) * rad }, rng.next() * TAU, cr * rng.range(0.4, 0.6), 1, 0);
                const li = leafSet.items[leafSet.items.length - 1];
                li.rz = rng.range(-0.9, 0.9); li.sy = 0.85;
              }
            }
            // 内芯团块
            for (let k = 0; k < 4; k++) {
              const ca = rng.next() * TAU, ce = (rng.next() - 0.5) * 1.4, crr = Math.cbrt(rng.next()) * 0.6;
              coreSet.add({
                x: p.x + Math.cos(ca) * cr * crr,
                y: baseY + Math.sin(ce) * ch * crr * 0.6,
                z: p.z + Math.sin(ca) * cr * crr,
              }, rng.next() * TAU, cr * rng.range(0.5, 0.68), 1, 0);
            }
          }

          if (spec.collider || h > 7) {
            MT.colliders.push({ x: p.x, y: gy + h * 0.5, z: p.z, hw: tr * 1.3, hh: h * 0.5, hd: tr * 1.3, ry: 0, cos: 1, sin: 0, active: true });
          }
        }

        // 树干矩阵（非均匀：半径 × 高度）
        trunkSet.mesh.count = trunkSet.items.length;
        const dm = trunkSet.dummy;
        for (let i = 0; i < trunkSet.items.length; i++) {
          const it = trunkSet.items[i];
          dm.position.set(it.x, it.y, it.z);
          dm.rotation.set(0, it.ry, 0);
          dm.scale.set(it.trunkS.r, it.trunkS.h, it.trunkS.r);
          dm.updateMatrix();
          trunkSet.mesh.setMatrixAt(i, dm.matrix);
        }
        trunkSet.mesh.instanceMatrix.needsUpdate = true;
        branchSet.commit();
        leafSet.commit();
        if (coreSet) { coreSet.commit(); coreSet.mesh.castShadow = true; coreSet.mesh.receiveShadow = true; this.group.add(coreSet.mesh); }
        trunkSet.mesh.castShadow = true; trunkSet.mesh.receiveShadow = true;
        branchSet.mesh.castShadow = true;
        leafSet.mesh.castShadow = true; leafSet.mesh.receiveShadow = true;
        this.group.add(trunkSet.mesh);
        this.group.add(branchSet.mesh);
        this.group.add(leafSet.mesh);
        this.trees[key] = { trunk: trunkSet, branch: branchSet, leaf: leafSet, core: coreSet, spec };
      }
    }

    /** 树干几何：单位高度 0..1，含根部外扩与向上收分 */
    _trunkGeo() {
      const geo = new THREE.CylinderGeometry(1, 1, 1, 9, 5, true);
      const pos = geo.attributes.position;
      const prof = (t) => {
        if (t < 0.05) return 1.7 - (t / 0.05) * 0.65;
        if (t < 0.3) return 1.05 - ((t - 0.05) / 0.25) * 0.3;
        return 0.75 - ((t - 0.3) / 0.7) * 0.35;
      };
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = y + 0.5, f = prof(clamp(t, 0, 1));
        pos.setXYZ(i, x * f, t, z * f);
      }
      geo.computeVertexNormals();
      return geo;
    }

    /** 不规则球：给树冠/灌木做"团块"感，而非光滑球 */
    _lumpyGeo(detail, seed) {
      const geo = new THREE.IcosahedronGeometry(1, detail);
      const pos = geo.attributes.position;
      const n = new MT.Noise(seed || 9);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const d = n.fbm(v.x * 1.4 + 11, v.z * 1.4 + 7, 2);
        v.multiplyScalar(1 + d * 0.2);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      return geo;
    }

    /* ---------- 草丛 ---------- */
    _buildGrass() {
      const r = this.rng, T = this.terrain;
      const geo = crossedGeo(0.82, 0.72, 3);
      const mat = new THREE.MeshStandardMaterial({
        map: MT.tex.blade(), alphaTest: 0.42, transparent: false,
        side: THREE.DoubleSide, roughness: 1.0, color: 0xffffff,
      });
      MT.windMaterial(mat, 0.07);
      const N = Math.round((this.quality === 'low' ? 5000 : this.quality === 'medium' ? 12000 : 22000));
      const set = new InstSet(geo, mat, N, 'grass');
      let tries = 0;
      while (set.items.length < N && tries < N * 8) {
        tries++;
        const x = r.range(-470, 470), z = r.range(-455, 470);
        const dw = Math.hypot(x - MT.TerrainConst.VILLAGE.x, z - MT.TerrainConst.VILLAGE.z);
        const dW = Math.hypot(x - MT.TerrainConst.WA_CLUSTER.x, z - MT.TerrainConst.WA_CLUSTER.z);
        if (dw < 16 || dW < 12) continue;
        if (MT.inBuildZone(x, z, -1)) continue;
        if (T.waterDepth(x, z) > 0.02) continue;
        const s = T.surfaceAt(x, z);
        if (s === 'cement' || s === 'mud') continue;
        if (T.slopeAt(x, z) > 0.6) continue;
        const y = T.heightAt(x, z);
        set.add({ x, y: y - 0.06, z }, r.next() * TAU, r.range(0.7, 1.6), 1, 0);
        const gi = set.items[set.items.length - 1];
        gi.rx = r.range(-0.13, 0.13); gi.rz = r.range(-0.13, 0.13);
      }
      set.mesh.castShadow = false;
      set.mesh.receiveShadow = true;
      set.commit();
      this.grassSet = set;
      this.group.add(set.mesh);
    }

    /* ---------- 低矮地被（杂草 / 三叶，填草缝） ---------- */
    _buildGroundCover() {
      const N = this.quality === 'low' ? 0 : this.quality === 'medium' ? 6000 : 14000;
      if (N === 0) return;
      const r = this.rng, T = this.terrain;
      const geo = crossedGeo(0.6, 0.32, 2);
      const mat = new THREE.MeshStandardMaterial({
        map: MT.tex.blade(), alphaTest: 0.42, transparent: false,
        side: THREE.DoubleSide, roughness: 1.0, color: 0xffffff,
      });
      MT.windMaterial(mat, 0.04);
      const set = new InstSet(geo, mat, N, 'cover');
      let tries = 0;
      while (set.items.length < N && tries < N * 6) {
        tries++;
        const x = r.range(-470, 470), z = r.range(-455, 470);
        if (T.waterDepth(x, z) > 0.02) continue;
        const s = T.surfaceAt(x, z);
        if (s === 'cement' || s === 'mud') continue;
        if (T.slopeAt(x, z) > 0.6) continue;
        if (MT.inBuildZone(x, z, -1)) continue;
        set.add({ x, y: T.heightAt(x, z) - 0.03, z }, r.next() * TAU, r.range(0.7, 1.6), 1, 0);
        const it = set.items[set.items.length - 1];
        it.rx = r.range(-0.15, 0.15); it.rz = r.range(-0.15, 0.15);
      }
      set.mesh.castShadow = false; set.mesh.receiveShadow = true;
      set.commit();
      this.coverSet = set;
      this.group.add(set.mesh);
    }

    /* ---------- 芦苇 ---------- */
    _buildReeds() {
      const r = this.rng, T = this.terrain;
      const geo = crossedGeo(0.9, 2.0, 3);
      const mat = new THREE.MeshStandardMaterial({
        map: MT.tex.reed(), alphaTest: 0.4, transparent: false,
        side: THREE.DoubleSide, roughness: 1.0, color: 0xffffff,
      });
      MT.windMaterial(mat, 0.1);
      const N = this.quality === 'low' ? 1200 : 3400;
      const set = new InstSet(geo, mat, N, 'reed');
      let tries = 0;
      while (set.items.length < N && tries < N * 8) {
        tries++;
        let x, z;
        if (r.chance(0.72)) { // 河滩
          x = r.range(-340, 340);
          z = MT.TerrainConst.RIVER_Z + r.range(-70, 70);
        } else { // 水塘边
          const p = r.pick(MT.TerrainConst.PONDS);
          const a = r.next() * TAU, d = p.r * r.range(1.0, 1.4);
          x = p.x + Math.cos(a) * d; z = p.z + Math.sin(a) * d;
        }
        const h = T.heightAt(x, z);
        const w = T.waterAt(x, z);
        if (w && h < w.y - 0.5) continue;          // 太深
        if (w ? h > w.y + 1.6 : h > 6.5) continue; // 太高（不是滩涂）
        set.add({ x, y: h - 0.15, z }, r.next() * TAU, r.range(0.7, 1.35), 1, 0);
      }
      set.mesh.castShadow = false;
      set.mesh.receiveShadow = true;
      set.commit();
      this.reedSet = set;
      this.group.add(set.mesh);
    }

    /* ---------- 荷叶 ---------- */
    _buildLotus() {
      const r = this.rng, T = this.terrain;
      const g = new THREE.CircleGeometry(0.55, 10);
      g.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide });
      const set = new InstSet(g, mat, 900, 'lotus');
      for (const p of MT.TerrainConst.PONDS) {
        if (p.r < 15) continue;
        for (let i = 0; i < 240; i++) {
          const a = r.next() * TAU, d = Math.sqrt(r.next()) * p.r * 0.85;
          const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
          const h = T.heightAt(x, z);
          if (h > p.y - 0.25) continue;
          set.add({ x, y: p.y + 0.03, z }, r.next() * TAU, r.range(0.7, 1.3), 1, r.range(-0.12, 0.2));
        }
      }
      set.mesh.castShadow = false; set.mesh.receiveShadow = false;
      set.commit();
      // 荷叶倾斜
      const dm = set.dummy;
      for (let i = 0; i < set.items.length; i++) {
        const it = set.items[i];
        dm.position.set(it.x, it.y, it.z);
        dm.rotation.set(it.ex, it.ry, it.ex * 0.5);
        dm.scale.set(it.s, 1, it.s);
        dm.updateMatrix();
        set.mesh.setMatrixAt(i, dm.matrix);
      }
      set.mesh.instanceMatrix.needsUpdate = true;
      this.lotusSet = set;
      this.group.add(set.mesh);
      // 荷花
      const fg = new THREE.ConeGeometry(0.16, 0.5, 6);
      const fm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
      const fset = new InstSet(fg, fm, 120, 'lotusflower');
      for (let i = 0; i < 70; i++) {
        const p = r.pick(MT.TerrainConst.PONDS);
        if (p.r < 15) continue;
        const a = r.next() * TAU, d = Math.sqrt(r.next()) * p.r * 0.7;
        const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (this.terrain.heightAt(x, z) > p.y - 0.3) continue;
        fset.add({ x, y: p.y + 0.3, z }, r.next() * TAU, r.range(0.8, 1.3), 1, 0);
      }
      fset.commit();
      this.lotusFlowers = fset;
      this.group.add(fset.mesh);
    }

    /* ---------- 灌木丛 ---------- */
    _buildBushes() {
      const N = this.quality === 'low' ? 0 : this.quality === 'medium' ? 420 : 1200;
      if (N === 0) return;
      const r = this.rng, T = this.terrain;
      const geo = this._lumpyGeo(this.quality === 'high' ? 1 : 0, 21);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, map: MT.tex.leafCluster() });
      const set = new InstSet(geo, mat, N, 'bush');
      let tries = 0;
      while (set.items.length < N && tries < N * 8) {
        tries++;
        const x = r.range(-240, 360), z = r.range(-200, 420);
        if (T.waterDepth(x, z) > 0.02) continue;
        const s = T.surfaceAt(x, z);
        if (s === 'cement' || s === 'mud') continue;
        if (T.slopeAt(x, z) > 0.55) continue;
        if (MT.inBuildZone(x, z, -0.5)) continue;
        if (r.chance(0.5)) continue;
        set.add({ x, y: T.heightAt(x, z) + 0.1, z }, r.next() * TAU, r.range(0.35, 0.9), 1, 0);
        const it = set.items[set.items.length - 1];
        it.sy = r.range(0.6, 0.85); it.sx = it.sz = r.range(0.9, 1.2);
      }
      set.mesh.castShadow = true; set.mesh.receiveShadow = true;
      set.commit();
      this.bushSet = set;
      this.group.add(set.mesh);
    }

    /* ---------- 野花（春 / 夏）---------- */
    _buildFlowers() {
      const N = this.quality === 'low' ? 0 : this.quality === 'medium' ? 700 : 1900;
      if (N === 0) return;
      const r = this.rng, T = this.terrain;
      const geo = crossedGeo(0.5, 0.42, 2);
      const mat = new THREE.MeshStandardMaterial({
        map: MT.tex.flower(), alphaTest: 0.4, transparent: false,
        side: THREE.DoubleSide, roughness: 1.0, color: 0xffffff,
      });
      MT.windMaterial(mat, 0.05);
      const set = new InstSet(geo, mat, N, 'flower');
      const palette = [new THREE.Color(0xf6d84a), new THREE.Color(0xf6f2e6), new THREE.Color(0xe89ab4), new THREE.Color(0xb79ae0), new THREE.Color(0xe6784a)];
      let tries = 0;
      while (set.items.length < N && tries < N * 8) {
        tries++;
        const x = r.range(-180, 340), z = r.range(-190, 400);
        if (T.waterDepth(x, z) > 0.02) continue;
        const s = T.surfaceAt(x, z);
        if (s === 'cement' || s === 'mud') continue;
        if (T.slopeAt(x, z) > 0.5) continue;
        if (MT.inBuildZone(x, z, -1)) continue;
        if (r.chance(0.6)) continue;
        set.add({ x, y: T.heightAt(x, z) - 0.02, z }, r.next() * TAU, r.range(0.7, 1.4), 1, 0);
        set.items[set.items.length - 1].col = palette[(r.next() * palette.length) | 0];
      }
      set.commit();
      for (let i = 0; i < set.items.length; i++) set.mesh.setColorAt(i, set.items[i].col);
      if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
      set.mesh.castShadow = false; set.mesh.receiveShadow = false;
      this.flowerSet = set;
      this.group.add(set.mesh);
    }

    /* =========================================================
     *  标志树（村口大槐树 / 树下石凳）
     * ========================================================= */
    bigTree(x, z, key) {
      const spec = SPECIES[key || 'locust'];
      const r = this.rng;
      const g = new THREE.Group();
      const gy = this.terrain.heightAt(x, z);
      g.position.set(x, gy, z);
      const m = MT.M();
      const H = 13.5, tr = 0.72;
      // 树根盘
      const base = MT.Build.cyl(tr * 1.5, tr * 2.2, 0.7, new THREE.MeshStandardMaterial({ color: 0x6a5c4c, roughness: 1 }), 12);
      base.position.y = 0.3; g.add(base);
      // 主干
      const trunkMat = new THREE.MeshStandardMaterial({ color: spec.trunk, roughness: 1, map: MT.tex.bark() });
      const trunk = new THREE.Mesh(this._trunkGeo(), trunkMat);
      trunk.scale.set(tr, H, tr);
      trunk.position.y = 0.4; trunk.castShadow = true; trunk.receiveShadow = true;
      g.add(trunk);
      // 侧枝
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + r.range(-0.3, 0.3);
        const len = r.range(3.2, 5.4);
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, len, 7), trunkMat);
        br.position.set(Math.cos(a) * len * 0.36, H * 0.62 + r.range(-0.6, 1.4), Math.sin(a) * len * 0.36);
        br.rotation.set(Math.cos(a) * rad(56), 0, -Math.sin(a) * rad(56));
        br.castShadow = true;
        g.add(br);
      }
      // 树冠（多个球）
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.95, map: MT.tex.leafCluster() });
      const blobs = [];
      for (let i = 0; i < 14; i++) {
        const a = r.next() * TAU;
        const d = Math.sqrt(r.next()) * 4.8;
        const sz = r.range(2.0, 3.5);
        const bg = this._lumpyGeo(1, 40 + i);
        bg.scale(sz * r.range(0.9, 1.15), sz * r.range(0.85, 1.05), sz * r.range(0.9, 1.15));
        const blob = new THREE.Mesh(bg, leafMat);
        blob.position.set(Math.cos(a) * d, H * 0.86 + r.range(-1.8, 2.2), Math.sin(a) * d);
        blob.castShadow = true; blob.receiveShadow = true;
        blobs.push(blob);
        g.add(blob);
      }
      g.userData.bigTree = { blobs, leafMat, trunk };
      MT.colliders.push({ x, y: gy + H / 2, z, hw: tr * 1.1, hh: H / 2 + 0.5, hd: tr * 1.1, ry: 0, cos: 1, sin: 0, active: true });
      this.landmarks.push(g);
      return g;
    }

    /** 竹丛 */
    bamboo(x, z, count) {
      const r = this.rng;
      const gy = this.terrain.heightAt(x, z);
      const g = new THREE.Group();
      g.position.set(x, gy, z);
      const mat = new THREE.MeshStandardMaterial({ color: 0x9aa84a, roughness: 0.8 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a32, roughness: 0.9, flatShading: true });
      const n = count || 9;
      for (let i = 0; i < n; i++) {
        const a = r.next() * TAU, d = Math.sqrt(r.next()) * 1.5;
        const h = r.range(4, 7.5);
        const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, h, 6), mat);
        cane.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
        cane.rotation.z = r.range(-0.09, 0.09);
        cane.rotation.x = r.range(-0.09, 0.09);
        cane.castShadow = true;
        g.add(cane);
        for (let k = 0; k < 3; k++) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r.range(0.5, 0.95), 0), leafMat);
          leaf.position.set(Math.cos(a) * d + r.range(-0.7, 0.7), h * (0.6 + k * 0.16), Math.sin(a) * d + r.range(-0.7, 0.7));
          leaf.scale.set(1, 0.5, 1.3);
          leaf.castShadow = true;
          g.add(leaf);
        }
      }
      return MT.props.prop(g);
    }

    /* =========================================================
     *  四季
     * ========================================================= */
    setSeason(season) {
      this.season = season;
      const sMap = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
      const key = sMap[season] || 'summer';
      const bare = season === 'winter';
      for (const name in this.trees) {
        const t = this.trees[name];
        const spec = t.spec;
        const baseColor = spec[key] !== undefined ? spec[key] : spec.summer;
        const c = new THREE.Color(baseColor);
        t.leaf.applySeason((it, col) => {
          col.copy(c);
          // 每棵树轻微色差
          const k = 0.86 + ((it.ry * 7919) % 1) * 0.3;
          col.multiplyScalar(k);
          return col;
        }, (it) => (bare ? (spec.leafGeo === 'cone' ? 0.95 : 0.16) : 1));
        t.leaf.mesh.visible = !bare || spec.leafGeo === 'cone';
        if (t.core) {
          t.core.applySeason((it, col) => { col.copy(c); col.multiplyScalar(0.86 + ((it.ry * 7919) % 1) * 0.3); return col; }, (it) => (bare ? 0.16 : 1));
          t.core.mesh.visible = !bare;
        }
      }
      if (this.grassSet) {
        const gc = { spring: 0xa8c46a, summer: 0x8fb454, autumn: 0xc0a858, winter: 0x9a8f70 }[key] || 0x8fb454;
        const cc = new THREE.Color(gc);
        this.grassSet.applySeason((it, col) => col.copy(cc).multiplyScalar(0.82 + ((it.ry * 31) % 1) * 0.34), (it) => (bare ? 0.55 : 1));
      }
      if (this.coverSet) {
        const gc2 = { spring: 0xaac86e, summer: 0x8fbb58, autumn: 0xc6ae5c, winter: 0xa2987c }[key] || 0x8fbb58;
        const cc2 = new THREE.Color(gc2);
        this.coverSet.applySeason((it, col) => col.copy(cc2).multiplyScalar(0.8 + ((it.ry * 41) % 1) * 0.4), (it) => (bare ? 0.7 : 1));
      }
      if (this.reedSet) {
        const rc = { spring: 0x9ab060, summer: 0xa8b060, autumn: 0xd0b878, winter: 0xb0a488 }[key] || 0xa8b060;
        this.reedSet.applySeason((it, col) => col.copy(new THREE.Color(rc)).multiplyScalar(0.85 + ((it.ry * 17) % 1) * 0.3), null);
      }
      if (this.lotusSet) {
        this.lotusSet.mesh.visible = season !== 'winter';
        const lc = season === 'autumn' ? 0x8a8a4a : 0x3f7a44;
        this.lotusSet.applySeason((it, col) => col.copy(new THREE.Color(lc)).multiplyScalar(0.85 + ((it.ry * 13) % 1) * 0.3), null);
      }
      if (this.lotusFlowers) {
        this.lotusFlowers.mesh.visible = season === 'summer' || season === 'spring';
      }
      if (this.bushSet) {
        const bc = { spring: 0x8fbb5e, summer: 0x5f8f42, autumn: 0xb99a4e, winter: 0x7c7058 }[key] || 0x5f8f42;
        const bcol = new THREE.Color(bc);
        this.bushSet.applySeason((it, col) => col.copy(bcol).multiplyScalar(0.8 + ((it.ry * 53) % 1) * 0.4), (it) => (bare ? 0.8 : 1));
      }
      if (this.flowerSet) {
        this.flowerSet.mesh.visible = (season === 'spring' || season === 'summer');
      }
      // 地标大树
      for (const g of this.landmarks) {
        const ud = g.userData.bigTree;
        if (!ud) continue;
        const c = new THREE.Color(season === 'winter' ? 0x7d7259 : season === 'autumn' ? 0xc9a848 : season === 'spring' ? 0x8fbf60 : 0x4f8a3a);
        ud.leafMat.color.copy(c);
        ud.blobs.forEach((b) => { b.scale.setScalar(bare ? 0.35 : 1); });
      }
    }

    update(dt, camera) {
      MT.windTick(dt);   // 推进风摆时间
    }
  }

  /* 叶片卡片几何（居中，供树冠三维摆放） */
  function leafCardGeo() {
    const p1 = new THREE.PlaneGeometry(1, 1);
    const p2 = new THREE.PlaneGeometry(1, 1); p2.rotateY(Math.PI / 2);
    return mergeGeos([p1, p2]);
  }

  /* 交叉面片几何（草/芦苇） */
  function crossedGeo(w, h, planes) {
    const geos = [];
    const plane = new THREE.PlaneGeometry(w, h);
    plane.translate(0, h / 2, 0);
    for (let i = 0; i < planes; i++) {
      const p = plane.clone();
      p.rotateY((i / planes) * Math.PI);
      geos.push(p);
    }
    return mergeGeos(geos);
  }

  /** 极简几何合并（同属性：position/normal/uv） */
  function mergeGeos(list) {
    let total = 0;
    const nonIdx = list.map((g) => (g.index ? g.toNonIndexed() : g));
    for (const g of nonIdx) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const uv = new Float32Array(total * 2);
    let o = 0;
    for (const g of nonIdx) {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        pos[(o + i) * 3] = p.getX(i); pos[(o + i) * 3 + 1] = p.getY(i); pos[(o + i) * 3 + 2] = p.getZ(i);
        if (n) { nor[(o + i) * 3] = n.getX(i); nor[(o + i) * 3 + 1] = n.getY(i); nor[(o + i) * 3 + 2] = n.getZ(i); }
        if (u) { uv[(o + i) * 2] = u.getX(i); uv[(o + i) * 2 + 1] = u.getY(i); }
      }
      o += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  }

  MT.Vegetation = Vegetation;
  MT.InstSet = InstSet;
  MT.vegetationGeo = { crossedGeo, mergeGeos, SPECIES };
})();
