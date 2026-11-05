/* =============================================================
 *  MyTown · 我的家乡 3D  —  核心工具库
 *  util.js : 命名空间 / 随机数 / 噪声 / 数学 / DOM 小工具
 * ============================================================= */
(function () {
  'use strict';
  const MT = (window.MT = window.MT || {});
  MT.VERSION = '1.0.0';

  /* ---------------- 数学 ---------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const deg = (r) => (r * 180) / Math.PI;
  const rad = (d) => (d * Math.PI) / 180;
  const TAU = Math.PI * 2;

  /* ---------------- 随机数（可复现） ---------------- */
  class RNG {
    constructor(seed) {
      this.seed = (seed === undefined ? 20240715 : seed) >>> 0;
      this._s = this.seed || 1;
    }
    next() {
      // mulberry32
      let t = (this._s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(this.range(a, b + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
    sign() { return this.next() < 0.5 ? -1 : 1; }
    /** 高斯（近似） */
    gauss(mean = 0, sd = 1) {
      const u = 1 - this.next(), v = this.next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    reset(seed) { this.seed = seed >>> 0; this._s = this.seed || 1; }
  }

  /* ---------------- 值噪声 + 分形 ---------------- */
  class Noise {
    constructor(seed) {
      const rng = new RNG(seed);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const t = p[i]; p[i] = p[j]; p[j] = t;
      }
      this.perm = new Uint8Array(512);
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
      this.grad = new Float32Array(512 * 2);
      for (let i = 0; i < 256; i++) {
        const a = rng.next() * TAU;
        this.grad[i * 2] = Math.cos(a);
        this.grad[i * 2 + 1] = Math.sin(a);
      }
      for (let i = 256; i < 512; i++) {
        this.grad[i * 2] = this.grad[(i - 256) * 2];
        this.grad[i * 2 + 1] = this.grad[(i - 256) * 2 + 1];
      }
    }
    /** 梯度噪声，返回约 [-1,1] */
    noise2(x, y) {
      const X = Math.floor(x), Y = Math.floor(y);
      const xf = x - X, yf = y - Y;
      const xi = X & 255, yi = Y & 255;
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
      const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      const p = this.perm, g = this.grad;
      const aa = p[xi + p[yi]] & 255;
      const ba = p[xi + 1 + p[yi]] & 255;
      const ab = p[xi + p[yi + 1]] & 255;
      const bb = p[xi + 1 + p[yi + 1]] & 255;
      const d = (h, dx, dy) => g[h * 2] * dx + g[h * 2 + 1] * dy;
      const x1 = lerp(d(aa, xf, yf), d(ba, xf - 1, yf), u);
      const x2 = lerp(d(ab, xf, yf - 1), d(bb, xf - 1, yf - 1), u);
      return lerp(x1, x2, v);
    }
    /** 分形叠加，范围约 [-1,1] */
    fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let i = 0; i < octaves; i++) {
        sum += amp * this.noise2(x * freq, y * freq);
        norm += amp;
        amp *= gain; freq *= lacunarity;
      }
      return sum / (norm || 1);
    }
    /** 脊状噪声，范围 [0,1] */
    ridged(x, y, octaves = 4) {
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let i = 0; i < octaves; i++) {
        sum += amp * (1 - Math.abs(this.noise2(x * freq, y * freq)));
        norm += amp;
        amp *= 0.5; freq *= 2;
      }
      return sum / (norm || 1);
    }
  }

  /* ---------------- DOM 小工具 ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }
  const fmtTime = (h) => {
    const hh = Math.floor(((h % 24) + 24) % 24);
    const mm = Math.floor((h - Math.floor(h)) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  };
  const fmtClock12 = (h) => {
    const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    const ampm = hh < 12 ? '上午' : '下午';
    let h12 = hh % 12; if (h12 === 0) h12 = 12;
    return `${ampm}${h12}点${String(mm).padStart(2, '0')}分`;
  };
  // 农历节气近似（按月/日粗略映射，仅用于氛围）
  const SOLAR_TERMS = [
    [1, 6, '小寒'], [1, 20, '大寒'], [2, 4, '立春'], [2, 19, '雨水'],
    [3, 6, '惊蛰'], [3, 21, '春分'], [4, 5, '清明'], [4, 20, '谷雨'],
    [5, 6, '立夏'], [5, 21, '小满'], [6, 6, '芒种'], [6, 21, '夏至'],
    [7, 7, '小暑'], [7, 23, '大暑'], [8, 8, '立秋'], [8, 23, '处暑'],
    [9, 8, '白露'], [9, 23, '秋分'], [10, 8, '寒露'], [10, 24, '霜降'],
    [11, 8, '立冬'], [11, 22, '小雪'], [12, 7, '大雪'], [12, 22, '冬至'],
  ];
  function solarTerm(month, day) {
    let cur = '小寒';
    for (const [m, d, name] of SOLAR_TERMS) {
      if (month > m || (month === m && day >= d)) cur = name; else break;
    }
    return cur;
  }

  /* ---------------- 建设区域（避免庄稼/树木长进房子） ---------------- */
  MT.buildZones = MT.buildZones || [];
  MT.addBuildZone = function (x, z, r) { MT.buildZones.push({ x, z, r }); };
  MT.inBuildZone = function (x, z, pad) {
    const p = pad || 0;
    for (let i = 0; i < MT.buildZones.length; i++) {
      const b = MT.buildZones[i];
      const d = Math.hypot(x - b.x, z - b.z);
      if (d < b.r + p) return true;
    }
    return false;
  };

  MT.util = { clamp, lerp, invLerp, smoothstep, smootherstep, damp, deg, rad, TAU, $, $$, el, fmtTime, fmtClock12, solarTerm };
  MT.clamp = clamp; MT.lerp = lerp; MT.smoothstep = smoothstep; MT.smootherstep = smootherstep;
  MT.damp = damp; MT.rad = rad; MT.deg = deg;
  MT.RNG = RNG;
  MT.Noise = Noise;
  MT.fmtTime = fmtTime;
  MT.fmtClock12 = fmtClock12;
  MT.solarTerm = solarTerm;

  /* =============================================================
   *  静态几何批处理：把同材质的静态网格合并成一个 Mesh
   *  大幅降低 draw call（村庄有上千个小网格）
   * ============================================================= */
  MT.Batch = {
    /**
     * 遍历场景，把满足条件的静态网格按材质合并
     * opts: { minCount }
     * 返回 { groups, before, after, tris }
     */
    merge(root, opts = {}) {
      const THREE = window.THREE;
      if (!THREE) return null;
      const minCount = opts.minCount === undefined ? 2 : opts.minCount;
      root.updateMatrixWorld(true);

      const buckets = new Map();
      const remove = [];

      const walk = (obj, blocked) => {
        const ud = obj.userData || {};
        let block = blocked;
        if (ud.noBatch || ud.anim || ud.collectible || ud.terrain || ud.water || ud.vegetation || ud.npc || ud.dynamic) {
          block = true;
        }
        if (obj.isInstancedMesh) block = true;
        if (obj.isPoints || obj.isLine) block = true;
        if (obj.isMesh && !block) {
          const geo = obj.geometry;
          const mat = obj.material;
          if (geo && mat && !Array.isArray(mat) && geo.attributes.position) {
            if (!mat.vertexColors && (mat.transparent !== true)) {
              const key = mat.uuid + '|' + (obj.castShadow ? 1 : 0) + (obj.receiveShadow ? 1 : 0) + '|' + (obj.renderOrder || 0);
              let b = buckets.get(key);
              if (!b) buckets.set(key, (b = { mat, cast: obj.castShadow, recv: obj.receiveShadow, ro: obj.renderOrder || 0, meshes: [] }));
              b.meshes.push(obj);
            }
          }
        }
        const kids = obj.children;
        for (let i = 0; i < kids.length; i++) walk(kids[i], block);
      };
      walk(root, false);

      let before = 0, after = 0, merged = 0;
      const newMeshes = [];
      for (const b of buckets.values()) {
        before += b.meshes.length;
        if (b.meshes.length < minCount) { after += b.meshes.length; continue; }
        // 合并
        let totalVerts = 0;
        const prepared = [];
        for (const m of b.meshes) {
          let g = m.geometry;
          if (g.index) g = g.toNonIndexed();
          else g = g.clone();
          const pos = g.attributes.position;
          const nor = g.attributes.normal;
          const uv = g.attributes.uv;
          prepared.push({ g, pos, nor, uv, matrix: m.matrixWorld, count: pos.count });
          totalVerts += pos.count;
        }
        const P = new Float32Array(totalVerts * 3);
        const N = new Float32Array(totalVerts * 3);
        const U = new Float32Array(totalVerts * 2);
        const v = new THREE.Vector3();
        const nm = new THREE.Matrix3();
        let o = 0;
        for (const pr of prepared) {
          nm.getNormalMatrix(pr.matrix);
          for (let i = 0; i < pr.count; i++) {
            v.fromBufferAttribute(pr.pos, i).applyMatrix4(pr.matrix);
            P[(o + i) * 3] = v.x; P[(o + i) * 3 + 1] = v.y; P[(o + i) * 3 + 2] = v.z;
            if (pr.nor) {
              v.fromBufferAttribute(pr.nor, i).applyMatrix3(nm).normalize();
              N[(o + i) * 3] = v.x; N[(o + i) * 3 + 1] = v.y; N[(o + i) * 3 + 2] = v.z;
            }
            if (pr.uv) {
              U[(o + i) * 2] = pr.uv.getX(i); U[(o + i) * 2 + 1] = pr.uv.getY(i);
            }
          }
          o += pr.count;
          void pr.g;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, b.mat);
        mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
        mesh.renderOrder = b.ro;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        mesh.frustumCulled = true;
        newMeshes.push(mesh);
        // 标记原网格移除
        for (const m of b.meshes) remove.push(m);
        merged += b.meshes.length;
        after += 1;
      }
      for (const m of remove) {
        if (m.parent) m.parent.remove(m);
      }
      for (const m of newMeshes) root.add(m);
      return { merged, groups: newMeshes.length, before, after, added: newMeshes.length };
    },
  };

  /* ---------------- 通用三维小几何工厂 ---------------- */
  // 这些在 textures.js 载入后使用；此处只放纯几何/变换工具
  MT.geo = {
    dispose(root) {
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    },
    /** 深拷贝材质以便单独改色 */
    cloneMat(m) { const c = m.clone(); return c; },
    setShadow(root, cast = true, receive = true) {
      root.traverse((o) => {
        if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; }
      });
      return root;
    },
    /** 合并同一个 Group 下所有 Mesh 的阴影标记与矩阵（不合并几何，仅优化） */
    freezeStatic(root) {
      root.traverse((o) => {
        if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); }
      });
      return root;
    },
  };
})();
