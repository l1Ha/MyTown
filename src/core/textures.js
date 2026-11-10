/* =============================================================
 *  MyTown · 我的家乡 3D  —  程序化贴图与材质库
 *  textures.js : 不依赖任何外部图片，全部用 Canvas 现场生成
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { clamp, lerp } = MT.util;

  const cache = Object.create(null);

  function makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }
  /** 生成并缓存一张贴图。draw(ctx, size) 负责绘制。 */
  function tex(key, size, draw, opts = {}) {
    if (cache[key]) return cache[key];
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    draw(ctx, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = opts.aniso === undefined ? aniso() : opts.aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    cache[key] = t;
    return t;
  }
  /** 生成数据贴图（法线/粗糙度等，不按 sRGB 解码） */
  function dataTex(key, size, draw) {
    if (cache[key]) return cache[key];
    const c = makeCanvas(size);
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso();
    t.colorSpace = THREE.NoColorSpace;
    cache[key] = t;
    return t;
  }
  function cloneTex(key, repX, repY) {
    const t = (cache[key] || null);
    if (!t) return null;
    const c = t.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(repX, repY);
    c.needsUpdate = true;
    return c;
  }

  /* ---------------- 由颜色贴图推导法线贴图（凹凸） ----------------
   * 对颜色贴图的明度做 Sobel 梯度，得到"看起来有起伏"的法线，
   * 让砖缝、瓦垄、木纹、土面产生真实的高光/阴影。无外部资源。 */
  function bumpNormal(key, strength) {
    const ck = 'nrm:' + key;
    if (cache[ck]) return cache[ck];
    const src = cache[key];
    if (!src || !src.image || !src.image.getContext) return null;
    const w = src.image.width, h = src.image.height;
    const sctx = src.image.getContext('2d');
    let data;
    try { data = sctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
    const out = makeCanvas(w);
    const octx = out.getContext('2d');
    const oimg = octx.createImageData(w, h);
    const od = oimg.data;
    const str = strength === undefined ? 2.6 : strength;
    // 砖墙：砂浆比砖亮，把高度反相才能让"砖凸、缝凹"
    const inv = (key === 'brickRed' || key === 'brickGrey') ? -1 : 1;
    const L0 = (i) => (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    for (let y = 0; y < h; y++) {
      const yu = (y - 1 + h) % h, yd = (y + 1) % h;
      const yu3 = (y - 3 + h) % h, yd3 = (y + 3) % h;
      for (let x = 0; x < w; x++) {
        const xl = (x - 1 + w) % w, xr = (x + 1) % w;
        const xl3 = (x - 3 + w) % w, xr3 = (x + 3) % w;
        const fineX = (L0((y * w + xr) * 4) - L0((y * w + xl) * 4));
        const fineY = (L0((yd * w + x) * 4) - L0((yu * w + x) * 4));
        const coarseX = (L0((y * w + xr3) * 4) - L0((y * w + xl3) * 4));
        const coarseY = (L0((yd3 * w + x) * 4) - L0((yu3 * w + x) * 4));
        const dx = (fineX + 0.5 * coarseX) * str * inv;
        const dy = (fineY + 0.5 * coarseY) * str * inv;
        const len = Math.hypot(dx, dy, 1);
        const o = (y * w + x) * 4;
        od[o] = (-dx / len * 0.5 + 0.5) * 255;
        od[o + 1] = (-dy / len * 0.5 + 0.5) * 255;
        od[o + 2] = (1 / len * 0.5 + 0.5) * 255;
        od[o + 3] = 255;
      }
    }
    octx.putImageData(oimg, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = aniso();
    t.generateMipmaps = true;
    cache[ck] = t;
    return t;
  }
  /** 取（并按重复次数克隆）某张贴图的法线图 */
  function nrm(key, repX, repY) {
    const base = bumpNormal(key);
    if (!base) return null;
    const t = base.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX || 1, repY || 1);
    t.needsUpdate = true;
    return t;
  }

  /** 由颜色贴图推导"粗糙度"贴图（低频）：越暗/越脏的地方越粗糙，干湿/苔痕反光不同 */
  function roughMap(key, repX, repY) {
    const ck = 'rgh:' + key;
    let base = cache[ck];
    if (!base) {
      const src = cache[key];
      if (!src || !src.image || !src.image.getContext) return null;
      const w = src.image.width, h = src.image.height;
      const n = Math.max(64, Math.round(w / 4));   // 粗糙度低频，1/4 分辨率足够
      const sctx = src.image.getContext('2d');
      let data;
      try { data = sctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
      const cv = makeCanvas(n);
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(n, n);
      const od = img.data;
      const L0 = (i) => (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const step = w / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          let s = 0, c = 0;
          const sx = Math.floor(x * step), sy = Math.floor(y * step);
          for (let j = 0; j < step; j += 2) {
            for (let i = 0; i < step; i += 2) {
              const px = (sx + i) % w, py = (sy + j) % h;
              s += L0((py * w + px) * 4); c++;
            }
          }
          const l = c ? s / c : 0.5;
          const r = clamp(0.6 + (1 - l) * 0.4, 0, 1) * 255;   // 越暗越粗糙
          const o = (y * n + x) * 4;
          od[o] = od[o + 1] = od[o + 2] = r; od[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      base = new THREE.CanvasTexture(cv);
      base.wrapS = base.wrapT = THREE.RepeatWrapping;
      base.colorSpace = THREE.NoColorSpace;
      base.anisotropy = aniso();
      cache[ck] = base;
    }
    const t = base.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX || 1, repY || 1);
    t.needsUpdate = true;
    return t;
  }

  /* ---------------- 噪声小工具 ---------------- */
  function grain(ctx, size, amount, alpha) {
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }
  function splotch(ctx, size, count, rMin, rMax, colorFn) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      const r = rMin + Math.random() * (rMax - rMin);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c = colorFn();
      g.addColorStop(0, c[0]);
      g.addColorStop(1, c[1]);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** 目标分辨率：随画质缩放（high/ultra=1，medium=0.5，low=0.25），保持 2 的幂 */
  function qsize(base) {
    const s = (MT.TEX_SCALE === undefined ? 1 : MT.TEX_SCALE);
    const f = s >= 0.99 ? 1 : s >= 0.7 ? 0.5 : 0.25;
    return Math.max(64, Math.round(base * f));
  }
  function aniso() { return Math.min(MT.maxAniso || 4, 16); }

  /** 小尺寸 fbm 噪声画布（会被放大成柔和的斑驳） */
  function noiseCanvas(n, seed, oct) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(n, n);
    const d = img.data;
    const nn = new MT.Noise(seed || 1);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = (nn.fbm(x / n * 3.2, y / n * 3.2, oct || 4) * 0.5 + 0.5) * 255;
        const i = (y * n + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  const _noiseCache = Object.create(null);
  function cachedNoise(n, seed, oct) {
    const k = n + ':' + seed + ':' + oct;
    return _noiseCache[k] || (_noiseCache[k] = noiseCanvas(n, seed, oct));
  }
  /** 在画面上叠一层柔和的 fbm 斑驳（大尺度明暗），比白噪声更像"岁月" */
  function mottle(ctx, size, opts = {}) {
    const n = opts.n || 96;
    const src = cachedNoise(n, opts.seed || 3, opts.oct || 4);
    ctx.save();
    ctx.globalAlpha = opts.alpha === undefined ? 0.18 : opts.alpha;
    ctx.globalCompositeOperation = opts.mode || 'overlay';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, n, n, 0, 0, size, size);
    ctx.restore();
  }

  /** 砖墙：错缝、倒角高光/阴影、砖面斑驳、砂浆颗粒、偶发缺损 */
  function brickPattern(ctx, size, cols, rows, mortar, faces) {
    ctx.fillStyle = mortar; ctx.fillRect(0, 0, size, size);
    mottle(ctx, size, { alpha: 0.12, seed: 41, mode: 'multiply' });
    const bw = size / cols, bh = size / rows, m = Math.max(1.5, bh * 0.13);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw * 0.5;
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off + m * 0.5;
        const y = r * bh + m * 0.5;
        const w = bw - m, h = bh - m;
        ctx.fillStyle = faces();
        ctx.fillRect(x, y, w, h);
        // 倒角：上/左受光，下/右背光
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.fillRect(x, y, w, Math.max(1, h * 0.16));
        ctx.fillRect(x, y, Math.max(1, w * 0.05), h);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x, y + h - Math.max(1, h * 0.16), w, Math.max(1, h * 0.16));
        ctx.fillRect(x + w - Math.max(1, w * 0.05), y, Math.max(1, w * 0.05), h);
        // 破损/深色砖
        if (Math.random() < 0.07) {
          ctx.fillStyle = 'rgba(46,32,24,0.22)';
          ctx.beginPath();
          ctx.arc(x + Math.random() * w, y + Math.random() * h, Math.max(1.2, bh * 0.16), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // 整体做旧 + 细颗粒
    mottle(ctx, size, { alpha: 0.14, seed: 67, n: 128 });
    splotch(ctx, size, 30, size * 0.02, size * 0.1, () => ['rgba(60,52,40,0.14)', 'rgba(60,52,40,0)']);
  }

  /* 透明贴图的"底色"：避免 mipmap 把透明区平均成黑色（否则远处庄稼会发黑） */
  function baseFill(ctx, s, rgb, a) {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    ctx.fillRect(0, 0, s, s);
  }

  /* =========================================================
   *  贴图定义
   * ========================================================= */
  const T = {
    /* ---- 红砖墙（豫南乡村最常见的清水砖墙）---- */
    brickRed: () => tex('brickRed', qsize(1024), (ctx, s) => {
      const base = [[201, 101, 78], [176, 78, 60], [214, 116, 92], [158, 68, 54], [190, 90, 70], [168, 74, 58]];
      brickPattern(ctx, s, 10, 21, '#cdc3b2', () => {
        const c = base[(Math.random() * base.length) | 0];
        const k = 0.86 + Math.random() * 0.28;
        return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
      });
      grain(ctx, s, 12);
    }),

    /* ---- 青砖墙 ---- */
    brickGrey: () => tex('brickGrey', qsize(1024), (ctx, s) => {
      const base = [[124, 128, 126], [104, 110, 110], [138, 140, 136], [92, 98, 100], [116, 120, 118], [110, 116, 114]];
      brickPattern(ctx, s, 10, 21, '#aeaa9e', () => {
        const c = base[(Math.random() * base.length) | 0];
        const k = 0.9 + Math.random() * 0.22;
        return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
      });
      grain(ctx, s, 10);
    }),

    /* ---- 白石灰墙（刷白灰/月白）---- */
    whitewash: () => tex('whitewash', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#eae6da'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 110, 18, 90, () => ['rgba(212,206,188,0.32)', 'rgba(212,206,188,0)']);
      splotch(ctx, s, 70, 8, 46, () => ['rgba(255,253,246,0.5)', 'rgba(255,253,246,0)']);
      // 雨痕
      ctx.strokeStyle = 'rgba(150,146,132,0.10)';
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * s; ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath(); ctx.moveTo(x, Math.random() * s * 0.4);
        ctx.lineTo(x + (Math.random() - 0.5) * 6, s * 0.8 + Math.random() * s * 0.2); ctx.stroke();
      }
      // 墙裙灰
      const g = ctx.createLinearGradient(0, s * 0.72, 0, s);
      g.addColorStop(0, 'rgba(120,116,104,0)');
      g.addColorStop(1, 'rgba(96,92,82,0.6)');
      ctx.fillStyle = g; ctx.fillRect(0, s * 0.72, s, s * 0.28);
      mottle(ctx, s, { alpha: 0.10, seed: 19, mode: 'multiply' });
      grain(ctx, s, 8);
    }),

    /* ---- 夯土墙（老屋土坯）---- */
    mudWall: () => tex('mudWall', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#c1a67e'; ctx.fillRect(0, 0, s, s);
      // 夯土层
      const bands = 13;
      for (let b = 0; b < bands; b++) {
        const y0 = b * s / bands;
        const k = 0.9 + Math.random() * 0.2;
        ctx.fillStyle = `rgba(${(190 * k) | 0},${(162 * k) | 0},${(120 * k) | 0},0.35)`;
        ctx.fillRect(0, y0, s, s / bands * 0.7);
        ctx.fillStyle = 'rgba(120,96,64,0.18)';
        ctx.fillRect(0, y0 + s / bands - 2, s, 2);
      }
      splotch(ctx, s, 150, 10, 70, () => ['rgba(168,142,104,0.4)', 'rgba(168,142,104,0)']);
      splotch(ctx, s, 90, 8, 40, () => ['rgba(216,194,160,0.45)', 'rgba(216,194,160,0)']);
      // 麦草筋
      for (let i = 0; i < 420; i++) {
        const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI;
        const l = 6 + Math.random() * 20;
        ctx.strokeStyle = `rgba(${(190 + Math.random() * 30) | 0},${(166 + Math.random() * 26) | 0},${(120 + Math.random() * 26) | 0},0.5)`;
        ctx.lineWidth = 1 + Math.random() * 1.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
      // 裂纹
      ctx.strokeStyle = 'rgba(96,76,52,0.4)';
      for (let i = 0; i < 10; i++) {
        let x = Math.random() * s, y = Math.random() * s;
        ctx.lineWidth = 1 + Math.random() * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 40; y += Math.random() * 36; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      mottle(ctx, s, { alpha: 0.16, seed: 29 });
      grain(ctx, s, 16);
    }),

    /* ---- 青灰小瓦（屋瓦）---- */
    roofTile: () => tex('roofTile', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#3f454b'; ctx.fillRect(0, 0, s, s);
      const cols = 14, rows = 7;
      const cw = s / cols, ch = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cw, y = r * ch;
          const k = 0.82 + Math.random() * 0.36;
          // 筒瓦横截面的弧形明暗
          const g = ctx.createLinearGradient(x, 0, x + cw, 0);
          g.addColorStop(0.00, `rgb(${(44 * k) | 0},${(50 * k) | 0},${(56 * k) | 0})`);
          g.addColorStop(0.16, `rgb(${(96 * k) | 0},${(104 * k) | 0},${(112 * k) | 0})`);
          g.addColorStop(0.42, `rgb(${(58 * k) | 0},${(64 * k) | 0},${(70 * k) | 0})`);
          g.addColorStop(0.62, `rgb(${(74 * k) | 0},${(82 * k) | 0},${(90 * k) | 0})`);
          g.addColorStop(1.00, `rgb(${(40 * k) | 0},${(46 * k) | 0},${(52 * k) | 0})`);
          ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, Math.max(1, cw * 0.06), ch);
          ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x + cw * 0.14, y, cw * 0.06, ch);
          // 横向搭接
          ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x, y + ch - 3, cw, 3);
        }
      }
      splotch(ctx, s, 70, 8, 46, () => ['rgba(110,124,96,0.18)', 'rgba(110,124,96,0)']);
      splotch(ctx, s, 30, 6, 30, () => ['rgba(30,34,38,0.25)', 'rgba(30,34,38,0)']);
      mottle(ctx, s, { alpha: 0.14, seed: 53 });
      grain(ctx, s, 10);
    }),

    /* ---- 水泥屋面 / 平顶 ---- */
    concrete: () => tex('concrete', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#aaa59b'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 130, 12, 80, () => ['rgba(150,146,136,0.32)', 'rgba(150,146,136,0)']);
      splotch(ctx, s, 70, 6, 30, () => ['rgba(198,194,184,0.4)', 'rgba(198,194,184,0)']);
      // 抹灰刀痕
      ctx.strokeStyle = 'rgba(160,156,146,0.25)';
      for (let i = 0; i < 14; i++) {
        ctx.lineWidth = 2 + Math.random() * 4; const y = Math.random() * s;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(s * 0.3, y - 8, s * 0.6, y + 8, s, y); ctx.stroke();
      }
      // 骨料
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 0.4 + Math.random() * 1.1;
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(210,206,196,0.5)' : 'rgba(96,92,84,0.45)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      mottle(ctx, s, { alpha: 0.14, seed: 71, mode: 'multiply' });
      grain(ctx, s, 16);
    }),

    /* ---- 水泥路面 / 打谷场 ---- */
    cementRoad: () => tex('cementRoad', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#b5b2aa'; ctx.fillRect(0, 0, s, s);
      grain(ctx, s, 26);
      splotch(ctx, s, 100, 10, 60, () => ['rgba(146,142,132,0.3)', 'rgba(146,142,132,0)']);
      for (let i = 0; i < 2200; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 0.4 + Math.random();
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(212,208,198,0.4)' : 'rgba(104,100,92,0.4)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(84,80,72,0.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(s, s * 0.5 + 4); ctx.stroke();
      mottle(ctx, s, { alpha: 0.12, seed: 83, mode: 'multiply' });
    }),

    /* ---- 土路 ---- */
    dirtRoad: () => tex('dirtRoad', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#a3906d'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 160, 8, 70, () => ['rgba(140,120,90,0.4)', 'rgba(140,120,90,0)']);
      splotch(ctx, s, 90, 6, 40, () => ['rgba(190,172,138,0.42)', 'rgba(190,172,138,0)']);
      // 车辙
      ctx.fillStyle = 'rgba(120,104,78,0.32)';
      ctx.fillRect(0, s * 0.24, s, s * 0.06);
      ctx.fillRect(0, s * 0.68, s, s * 0.06);
      // 小石子
      for (let i = 0; i < 1400; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 0.5 + Math.random() * 1.6;
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(196,182,152,0.5)' : 'rgba(108,92,68,0.5)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      mottle(ctx, s, { alpha: 0.16, seed: 97 });
      grain(ctx, s, 22);
    }),

    /* ---- 田地土壤 ---- */
    soil: () => tex('soil', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#6d5a41'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 220, 6, 60, () => ['rgba(88,72,52,0.5)', 'rgba(88,72,52,0)']);
      splotch(ctx, s, 130, 5, 40, () => ['rgba(128,108,80,0.45)', 'rgba(128,108,80,0)']);
      // 土块
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 1 + Math.random() * 3, k = 0.7 + Math.random() * 0.6;
        ctx.fillStyle = `rgba(${(120 * k) | 0},${(98 * k) | 0},${(70 * k) | 0},0.6)`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      mottle(ctx, s, { alpha: 0.18, seed: 113, mode: 'multiply' });
      grain(ctx, s, 26);
    }),

    /* ---- 草地 ---- */
    grass: () => tex('grass', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#5a763a'; ctx.fillRect(0, 0, s, s);
      mottle(ctx, s, { alpha: 0.22, seed: 127, n: 128 });
      const N = s >= 1024 ? 14000 : 5200;
      for (let i = 0; i < N; i++) {
        const x = Math.random() * s, y = Math.random() * s, h = 3 + Math.random() * 9, k = 0.6 + Math.random() * 0.8;
        ctx.strokeStyle = `rgba(${(96 * k) | 0},${(128 * k) | 0},${(56 * k) | 0},0.7)`;
        ctx.lineWidth = 0.8 + Math.random() * 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 4, y - h); ctx.stroke();
      }
      splotch(ctx, s, 80, 14, 70, () => ['rgba(126,146,72,0.22)', 'rgba(126,146,72,0)']);
      splotch(ctx, s, 30, 10, 40, () => ['rgba(70,92,44,0.28)', 'rgba(70,92,44,0)']);
      grain(ctx, s, 10);
    }),

    /* ---- 水面法线扰动（当作 normal 近似使用）---- */
    waterNoise: () => dataTex('waterNoise', 256, (ctx, s) => {
      const n = new MT.Noise(7);
      const img = ctx.createImageData(s, s);
      const d = img.data;
      const f = 0.06;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const h = n.fbm(x * f, y * f, 4) * 0.5 + 0.5;
          const hx = n.fbm((x + 1) * f, y * f, 4) * 0.5 + 0.5;
          const hy = n.fbm(x * f, (y + 1) * f, 4) * 0.5 + 0.5;
          const dx = (hx - h) * 8, dy = (hy - h) * 8;
          const l = Math.hypot(dx, dy, 1);
          const i = (y * s + x) * 4;
          d[i] = ((-dx / l) * 0.5 + 0.5) * 255;
          d[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
          d[i + 2] = (1 / l * 0.5 + 0.5) * 255;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }),

    /* ---- 树皮 ---- */
    bark: () => tex('bark', qsize(512), (ctx, s) => {
      ctx.fillStyle = '#7a6a56'; ctx.fillRect(0, 0, s, s);
      mottle(ctx, s, { alpha: 0.2, seed: 7 });
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * s, w = 1 + Math.random() * 4;
        ctx.strokeStyle = `rgba(${(34 + Math.random() * 40) | 0},${(26 + Math.random() * 34) | 0},${(18 + Math.random() * 28) | 0},0.55)`;
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y <= s; y += 14) ctx.lineTo(x + (Math.random() - 0.5) * 7, y);
        ctx.stroke();
        // 裂隙受光边
        ctx.strokeStyle = 'rgba(190,172,140,0.18)'; ctx.lineWidth = Math.max(1, w * 0.4);
        ctx.beginPath(); ctx.moveTo(x + w, 0);
        for (let y = 0; y <= s; y += 14) ctx.lineTo(x + w + (Math.random() - 0.5) * 7, y);
        ctx.stroke();
      }
      // 横向皮孔
      ctx.fillStyle = 'rgba(40,32,22,0.35)';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 6 + Math.random() * 10, 1 + Math.random() * 1.5);
      splotch(ctx, s, 30, 8, 40, () => ['rgba(96,110,72,0.2)', 'rgba(96,110,72,0)']);
      grain(ctx, s, 16);
    }),

    /* ---- 木料 / 门板 ---- */
    wood: () => tex('wood', qsize(1024), (ctx, s) => {
      ctx.fillStyle = '#8a6a45'; ctx.fillRect(0, 0, s, s);
      mottle(ctx, s, { alpha: 0.14, seed: 17 });
      for (let i = 0; i < 160; i++) {
        const y = Math.random() * s;
        ctx.strokeStyle = `rgba(${(70 + Math.random() * 60) | 0},${(50 + Math.random() * 46) | 0},${(30 + Math.random() * 36) | 0},0.4)`;
        ctx.lineWidth = 0.6 + Math.random() * 3;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= s; x += 18) ctx.lineTo(x, y + (Math.random() - 0.5) * 5);
        ctx.stroke();
      }
      // 木节
      for (let i = 0; i < 4; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 4 + Math.random() * 8;
        for (let k = 0; k < 5; k++) {
          ctx.strokeStyle = `rgba(60,40,22,${0.5 - k * 0.08})`; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(x, y, r - k * 1.4, r * 0.7 - k, 0, 0, 7); ctx.stroke();
        }
      }
      grain(ctx, s, 12);
    }),

    /* ---- 木门（带门板与门钉）---- */
    door: () => tex('door', qsize(512), (ctx, s) => {
      ctx.fillStyle = '#5d4128'; ctx.fillRect(0, 0, s, s);
      mottle(ctx, s, { alpha: 0.12, seed: 23 });
      const panels = 3, pw = s / panels;
      for (let i = 0; i < panels; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(i * pw, 0, pw, s);
        for (let g = 0; g < 40; g++) {
          const x = i * pw + Math.random() * pw;
          ctx.strokeStyle = `rgba(${(60 + Math.random() * 40) | 0},${(40 + Math.random() * 30) | 0},${(22 + Math.random() * 20) | 0},0.35)`;
          ctx.lineWidth = 0.8 + Math.random() * 1.6;
          ctx.beginPath(); ctx.moveTo(x, 0);
          for (let y = 0; y <= s; y += 20) ctx.lineTo(x + (Math.random() - 0.5) * 3, y);
          ctx.stroke();
        }
        ctx.strokeStyle = '#33230f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(i * pw, 0); ctx.lineTo(i * pw, s); ctx.stroke();
      }
      ctx.fillStyle = '#3a2916'; ctx.fillRect(s * 0.46, 0, s * 0.08, s);
      // 门钉
      for (const ry of [0.28, 0.72]) {
        for (const cxr of [0.28, 0.72]) {
          const cx = cxr * s, cy = ry * s;
          const gg = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 9);
          gg.addColorStop(0, '#d8c184'); gg.addColorStop(1, '#7a6234');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
        }
      }
      // 铜环
      ctx.strokeStyle = '#c2a866'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(s * 0.3, s * 0.52, s * 0.06, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.7, s * 0.52, s * 0.06, 0, Math.PI * 2); ctx.stroke();
      // 底部磨损
      const gw = ctx.createLinearGradient(0, s * 0.85, 0, s);
      gw.addColorStop(0, 'rgba(0,0,0,0)'); gw.addColorStop(1, 'rgba(30,20,10,0.4)');
      ctx.fillStyle = gw; ctx.fillRect(0, s * 0.85, s, s * 0.15);
    }),

    /* ---- 玻璃窗（深色反光）---- */
    window: () => tex('window', 256, (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#6b8493'); g.addColorStop(0.45, '#3a4d58'); g.addColorStop(1, '#1f2c36');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      // 斜向反光
      const r = ctx.createLinearGradient(0, s, s, 0);
      r.addColorStop(0, 'rgba(255,255,255,0)');
      r.addColorStop(0.45, 'rgba(255,255,255,0.14)');
      r.addColorStop(0.55, 'rgba(255,255,255,0.05)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 20, 6, 30, () => ['rgba(220,225,225,0.08)', 'rgba(220,225,225,0)']);
      // 窗框
      ctx.strokeStyle = '#e6e2d6'; ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, s - 14, s - 14);
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(s * 0.5, 0); ctx.lineTo(s * 0.5, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(s, s * 0.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      ctx.strokeRect(15, 15, s - 30, s - 30);
    }),

    /* ---- 稻草 / 柴草 ---- */
    straw: () => tex('straw', qsize(512), (ctx, s) => {
      ctx.fillStyle = '#c8ab63'; ctx.fillRect(0, 0, s, s);
      mottle(ctx, s, { alpha: 0.16, seed: 31 });
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const a = Math.random() * Math.PI;
        const l = 8 + Math.random() * 26;
        const k = 0.7 + Math.random() * 0.6;
        ctx.strokeStyle = `rgba(${(206 * k) | 0},${(174 * k) | 0},${(96 * k) | 0},0.8)`;
        ctx.lineWidth = 0.8 + Math.random() * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
      grain(ctx, s, 12);
    }),

    /* ---- 菜地土垄 ---- */
    vegetableBed: () => tex('vegetableBed', qsize(512), (ctx, s) => {
      ctx.fillStyle = '#5b4a34'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 7; i++) {
        const x = (i / 7) * s;
        const g = ctx.createLinearGradient(x, 0, x + s / 7, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.24)');
        g.addColorStop(0.5, 'rgba(156,130,92,0.4)');
        g.addColorStop(1, 'rgba(0,0,0,0.24)');
        ctx.fillStyle = g; ctx.fillRect(x, 0, s / 7, s);
      }
      for (let i = 0; i < 1200; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 0.6 + Math.random() * 2;
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(150,126,90,0.5)' : 'rgba(60,48,34,0.5)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      splotch(ctx, s, 90, 6, 40, () => ['rgba(80,100,50,0.25)', 'rgba(80,100,50,0)']);
      mottle(ctx, s, { alpha: 0.14, seed: 37 });
      grain(ctx, s, 16);
    }),

    /* ---- 云 ---- */
    cloud: () => tex('cloud', qsize(512), (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 34; i++) {
        const x = s * (0.1 + Math.random() * 0.8);
        const y = s * (0.3 + Math.random() * 0.42);
        const r = s * (0.06 + Math.random() * 0.17);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.4)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      // 顶部受光边缘
      for (let i = 0; i < 16; i++) {
        const x = s * (0.15 + Math.random() * 0.7);
        const y = s * (0.28 + Math.random() * 0.3);
        const r = s * (0.04 + Math.random() * 0.09);
        const g = ctx.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.7)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }),

    /* ---- 光晕 / 太阳 ---- */
    glow: () => tex('glow', 128, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,244,214,0.75)');
      g.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    }),

    /* ---- 软圆点（粒子 / 雨雪 / 灰尘）---- */
    dot: () => tex('dot', 64, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    }),

    /* ---- 雪 ---- */
    snow: () => tex('snow', qsize(512), (ctx, s) => {
      ctx.fillStyle = '#eef2f6'; ctx.fillRect(0, 0, s, s);
      mottle(ctx, s, { alpha: 0.12, seed: 151, n: 128 });
      splotch(ctx, s, 120, 10, 60, () => ['rgba(214,224,234,0.5)', 'rgba(214,224,234,0)']);
      splotch(ctx, s, 60, 6, 30, () => ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']);
      // 雪粒反光
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(206,220,236,0.6)';
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
      grain(ctx, s, 6);
    }),

    /* ---- 中国古代风格纸纹（UI 备用）---- */
    paper: () => tex('paper', 256, (ctx, s) => {
      ctx.fillStyle = '#efe7d5'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 60, 10, 60, () => ['rgba(206,192,164,0.4)', 'rgba(206,192,164,0)']);
      // 纸纤维
      ctx.strokeStyle = 'rgba(196,182,152,0.35)';
      for (let i = 0; i < 180; i++) {
        const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI, l = 3 + Math.random() * 10;
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
      grain(ctx, s, 10);
    }),

    /* ---- 草叶（带透明通道，用于草地/芦苇）---- */
    blade: () => tex('blade', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [86, 118, 48], 0.28);
      for (let i = 0; i < 18; i++) {
        const x0 = s * (0.05 + Math.random() * 0.9);
        const h = s * (0.4 + Math.random() * 0.58);
        const w = s * (0.016 + Math.random() * 0.024);
        const lean = (Math.random() - 0.5) * s * 0.24;
        const k = 0.5 + Math.random() * 0.65;
        const g = ctx.createLinearGradient(x0, s, x0 + lean, s - h);
        g.addColorStop(0, `rgba(${(40 * k) | 0},${(68 * k) | 0},${(28 * k) | 0},0.96)`);
        g.addColorStop(0.55, `rgba(${(92 * k) | 0},${(136 * k) | 0},${(52 * k) | 0},0.96)`);
        g.addColorStop(1, `rgba(${(140 * k) | 0},${(184 * k) | 0},${(78 * k) | 0},0.9)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - w, s);
        ctx.quadraticCurveTo(x0 + lean * 0.4, s - h * 0.5, x0 + lean, s - h);
        ctx.quadraticCurveTo(x0 + lean * 0.4 + w * 1.2, s - h * 0.5, x0 + w, s);
        ctx.closePath(); ctx.fill();
      }
    }),

    /* ---- 庄稼（麦/稻/玉米/油菜），带透明通道 ---- */
    cropWheat: () => tex('cropWheat', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [198, 172, 100], 0.3);
      for (let i = 0; i < 13; i++) {
        const x0 = s * (0.06 + Math.random() * 0.88);
        const h = s * (0.72 + Math.random() * 0.28);
        const lean = (Math.random() - 0.5) * s * 0.18;
        const k = 0.72 + Math.random() * 0.42;
        ctx.strokeStyle = `rgba(${(206 * k) | 0},${(178 * k) | 0},${(96 * k) | 0},0.95)`;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.5, s - h * 0.6, x0 + lean, s - h * 0.92);
        ctx.stroke();
        // 叶片
        for (let a = 0; a < 2; a++) {
          const yy = s - h * (0.34 + a * 0.22), dir = a ? 1 : -1;
          ctx.fillStyle = `rgba(${(158 * k) | 0},${(168 * k) | 0},${(78 * k) | 0},0.85)`;
          ctx.beginPath(); ctx.moveTo(x0 + lean * 0.3, yy);
          ctx.quadraticCurveTo(x0 + dir * 12, yy - 6, x0 + dir * 17, yy + 4);
          ctx.quadraticCurveTo(x0 + dir * 9, yy + 2, x0 + lean * 0.3, yy + 3); ctx.fill();
        }
        // 麦穗
        ctx.fillStyle = `rgba(${(226 * k) | 0},${(200 * k) | 0},${(116 * k) | 0},0.98)`;
        for (let a = 0; a < 7; a++) {
          const yy = s - h * (0.74 + a * 0.038);
          ctx.beginPath();
          ctx.ellipse(x0 + lean + (a % 2 ? 3.2 : -3.2), yy, 3.0, 5.2, a % 2 ? 0.42 : -0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 麦芒
      ctx.strokeStyle = 'rgba(234,216,152,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * s, y = s * (0.08 + Math.random() * 0.38);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 12, y - 14); ctx.stroke();
      }
    }),
    cropRice: () => tex('cropRice', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [118, 158, 68], 0.3);
      for (let i = 0; i < 16; i++) {
        const x0 = s * (0.05 + Math.random() * 0.9);
        const h = s * (0.6 + Math.random() * 0.4);
        const lean = (Math.random() - 0.5) * s * 0.28;
        const k = 0.68 + Math.random() * 0.5;
        ctx.strokeStyle = `rgba(${(118 * k) | 0},${(162 * k) | 0},${(64 * k) | 0},0.95)`;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.4, s - h * 0.55, x0 + lean, s - h);
        ctx.stroke();
        // 稻叶
        ctx.strokeStyle = `rgba(${(96 * k) | 0},${(140 * k) | 0},${(58 * k) | 0},0.9)`; ctx.lineWidth = 1.6;
        const yy = s - h * 0.5, dir = Math.random() < 0.5 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(x0 + lean * 0.3, yy);
        ctx.quadraticCurveTo(x0 + dir * 14, yy - 8, x0 + dir * 20, yy + 2); ctx.stroke();
        // 稻穗（下垂）
        ctx.strokeStyle = `rgba(${(192 * k) | 0},${(198 * k) | 0},${(112 * k) | 0},0.92)`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(x0 + lean, s - h);
        ctx.quadraticCurveTo(x0 + lean + 9, s - h + 7, x0 + lean + 4, s - h + 16);
        ctx.stroke();
        // 谷粒
        ctx.fillStyle = `rgba(${(206 * k) | 0},${(200 * k) | 0},${(126 * k) | 0},0.85)`;
        for (let a = 0; a < 4; a++) { ctx.beginPath(); ctx.arc(x0 + lean + 3 + a * 1.2, s - h + 4 + a * 3.4, 1.6, 0, 7); ctx.fill(); }
      }
    }),
    cropCorn: () => tex('cropCorn', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [128, 168, 68], 0.3);
      for (let i = 0; i < 5; i++) {
        const x0 = s * (0.18 + i * 0.17 + Math.random() * 0.06);
        const h = s * (0.88 + Math.random() * 0.1);
        const k = 0.78 + Math.random() * 0.36;
        ctx.strokeStyle = `rgba(${(126 * k) | 0},${(172 * k) | 0},${(66 * k) | 0},0.97)`;
        ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + (Math.random() - 0.5) * 6, s - h * 0.5, x0 + (Math.random() - 0.5) * 6, s - h); ctx.stroke();
        // 叶
        for (let a = 0; a < 6; a++) {
          const y = s - h * (0.22 + a * 0.13);
          const dir = a % 2 ? 1 : -1, L = 26 + Math.random() * 16;
          ctx.fillStyle = `rgba(${(140 * k) | 0},${(186 * k) | 0},${(74 * k) | 0},0.96)`;
          ctx.beginPath(); ctx.moveTo(x0, y);
          ctx.quadraticCurveTo(x0 + dir * L * 0.7, y - 12, x0 + dir * L, y + 8);
          ctx.quadraticCurveTo(x0 + dir * L * 0.5, y + 4, x0, y + 5); ctx.fill();
          ctx.strokeStyle = `rgba(${(96 * k) | 0},${(140 * k) | 0},${(52 * k) | 0},0.5)`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x0, y + 2); ctx.quadraticCurveTo(x0 + dir * L * 0.7, y - 8, x0 + dir * L, y + 8); ctx.stroke();
        }
        // 玉米棒
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(232,208,128,0.95)';
          ctx.beginPath(); ctx.ellipse(x0 + 10, s - h * 0.46, 5, 13, 0.32, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(180,168,96,0.5)';
          for (let a = 0; a < 5; a++) ctx.fillRect(x0 + 7, s - h * 0.46 - 10 + a * 4.6, 6, 2);
        }
        // 天花
        ctx.strokeStyle = 'rgba(196,190,120,0.8)'; ctx.lineWidth = 1.2;
        for (let a = 0; a < 5; a++) { ctx.beginPath(); ctx.moveTo(x0, s - h); ctx.lineTo(x0 + (a - 2) * 5, s - h - 10); ctx.stroke(); }
      }
    }),
    cropRape: () => tex('cropRape', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [160, 176, 76], 0.3);
      for (let i = 0; i < 15; i++) {
        const x0 = s * (0.05 + Math.random() * 0.9);
        const h = s * (0.64 + Math.random() * 0.36);
        const lean = (Math.random() - 0.5) * s * 0.22;
        const k = 0.78 + Math.random() * 0.36;
        ctx.strokeStyle = `rgba(${(112 * k) | 0},${(156 * k) | 0},${(62 * k) | 0},0.95)`;
        ctx.lineWidth = 2.0;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.5, s - h * 0.6, x0 + lean, s - h);
        ctx.stroke();
        // 叶
        ctx.fillStyle = `rgba(${(120 * k) | 0},${(168 * k) | 0},${(70 * k) | 0},0.9)`;
        ctx.beginPath(); ctx.ellipse(x0 + lean * 0.4, s - h * 0.5, 8, 4, 0.4, 0, Math.PI * 2); ctx.fill();
        // 黄花簇
        for (let a = 0; a < 7; a++) {
          const ang = a * 1.05, rr = 7;
          ctx.fillStyle = `rgba(${(252 * k) | 0},${(220 * k) | 0},${(70 * k) | 0},0.97)`;
          ctx.beginPath(); ctx.arc(x0 + lean + Math.cos(ang) * rr, s - h + Math.sin(ang) * rr - 2, 3.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,244,180,0.9)';
          ctx.beginPath(); ctx.arc(x0 + lean + Math.cos(ang) * rr, s - h + Math.sin(ang) * rr - 2, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }),
    /* ---- 菜地：白菜/青菜 ---- */
    cropGreens: () => tex('cropGreens', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [100, 148, 62], 0.3);
      for (let i = 0; i < 10; i++) {
        const x0 = s * (0.1 + Math.random() * 0.8);
        const y0 = s * (0.5 + Math.random() * 0.46);
        const k = 0.72 + Math.random() * 0.5;
        for (let a = 0; a < 9; a++) {
          const ang = -Math.PI / 2 + (a - 4) * 0.38, L = 26 + Math.random() * 12;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(x0 + Math.cos(ang) * L * 0.6, y0 + Math.sin(ang) * L * 0.7,
            x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L * 1.2);
          ctx.lineWidth = 6.5;
          ctx.strokeStyle = `rgba(${(92 * k) | 0},${(150 * k) | 0},${(58 * k) | 0},0.95)`;
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(${(150 * k) | 0},${(196 * k) | 0},${(96 * k) | 0},0.8)`;
          ctx.stroke();
        }
      }
    }),

    /* ---- 芦苇 ---- */
    reed: () => tex('reed', qsize(256), (ctx, s) => {
      baseFill(ctx, s, [124, 138, 82], 0.28);
      for (let i = 0; i < 10; i++) {
        const x0 = s * (0.08 + Math.random() * 0.84);
        const h = s * (0.72 + Math.random() * 0.27);
        const w = s * 0.016;
        const lean = (Math.random() - 0.5) * s * 0.18;
        const k = 0.6 + Math.random() * 0.5;
        ctx.strokeStyle = `rgba(${(126 * k) | 0},${(140 * k) | 0},${(84 * k) | 0},0.95)`;
        ctx.lineWidth = w * 2;
        ctx.beginPath();
        ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.5, s - h * 0.55, x0 + lean, s - h * 0.92);
        ctx.stroke();
        // 叶
        ctx.strokeStyle = `rgba(${(110 * k) | 0},${(126 * k) | 0},${(74 * k) | 0},0.85)`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x0 + lean * 0.4, s - h * 0.6);
        ctx.quadraticCurveTo(x0 + lean * 0.4 + 12, s - h * 0.6 - 4, x0 + lean * 0.4 + 20, s - h * 0.6 + 6); ctx.stroke();
        // 芦花
        ctx.fillStyle = `rgba(${(200 * k) | 0},${(186 * k) | 0},${(146 * k) | 0},0.9)`;
        ctx.beginPath();
        ctx.ellipse(x0 + lean, s - h * 0.96, w * 2.2, h * 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${(206 * k) | 0},${(194 * k) | 0},${(158 * k) | 0},0.6)`; ctx.lineWidth = 0.8;
        for (let a = 0; a < 6; a++) {
          ctx.beginPath(); ctx.moveTo(x0 + lean, s - h * 0.96);
          ctx.lineTo(x0 + lean + (Math.random() - 0.5) * 10, s - h * 0.96 - 8 - Math.random() * 6); ctx.stroke();
        }
      }
    }),

    /* ---- 叶面（不透明；浅色叶片 + 叶脉，供实例着色成四季叶色）---- */
    leafCluster: () => tex('leafCluster', qsize(256), (ctx, s) => {
      ctx.fillStyle = '#cbd1c2'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 460; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const r = s * (0.05 + Math.random() * 0.075);
        const a = Math.random() * Math.PI * 2;
        const t = 198 + Math.random() * 57;
        ctx.fillStyle = `rgba(${t | 0},${(t * 1.03) | 0},${(t * 0.92) | 0},0.5)`;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(146,152,134,0.35)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 170; i++) {
        const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI, l = 4 + Math.random() * 9;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
    }),

    /* ---- 叶片卡片（透明底；用于树冠"叶簇卡片"，边缘镂空成叶片剪影）---- */
    leafCard: () => tex('leafCard', qsize(256), (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 95; i++) {
        const x = s * (0.14 + Math.random() * 0.72), y = s * (0.14 + Math.random() * 0.72);
        const r = s * (0.07 + Math.random() * 0.09);
        const a = Math.random() * Math.PI * 2;
        const t = 198 + Math.random() * 57;
        ctx.fillStyle = `rgba(${t | 0},${(t * 1.03) | 0},${(t * 0.9) | 0},0.95)`;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, a, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,130,110,0.5)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, a, 0, Math.PI * 2); ctx.stroke();
      }
    }),

    /* ---- 野花（透明底；花瓣近白，便于按实例着色）---- */
    flower: () => tex('flower', qsize(128), (ctx, s) => {
      baseFill(ctx, s, [238, 238, 228], 0.10);
      const bloom = (x, y, r, a0) => {
        for (let p = 0; p < 5; p++) {
          const a = a0 + p / 5 * Math.PI * 2;
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.4, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,240,190,0.95)';
        ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill();
      };
      for (let i = 0; i < 8; i++) {
        bloom(s * (0.14 + Math.random() * 0.72), s * (0.16 + Math.random() * 0.72), s * (0.06 + Math.random() * 0.05), Math.random() * Math.PI);
      }
    }),

    /* ---- 水波（用于水面的简易法线贴图）---- */
    waterNormal: () => dataTex('waterNormal', qsize(512), (ctx, s) => {
      const n = new MT.Noise(31), n2 = new MT.Noise(77);
      const img = ctx.createImageData(s, s);
      const d = img.data;
      const f = 0.03;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const h = n.fbm(x * f, y * f, 4) * 0.7 + n2.fbm(x * 0.11, y * 0.11, 3) * 0.3;
          const hx = n.fbm((x + 1) * f, y * f, 4) * 0.7 + n2.fbm((x + 1) * 0.11, y * 0.11, 3) * 0.3;
          const hy = n.fbm(x * f, (y + 1) * f, 4) * 0.7 + n2.fbm(x * 0.11, (y + 1) * 0.11, 3) * 0.3;
          const dx = (hx - h) * 6, dy = (hy - h) * 6;
          const l = Math.hypot(dx, dy, 1);
          const i = (y * s + x) * 4;
          d[i] = (-dx / l * 0.5 + 0.5) * 255;
          d[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
          d[i + 2] = (1 / l * 0.5 + 0.5) * 255;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }),
  };

  /* =========================================================
   *  材质库
   * ========================================================= */
  const M = {
    /** 通用标准材质工厂 */
    std(map, opts = {}) {
      const m = new THREE.MeshStandardMaterial(Object.assign({
        map: map || null,
        roughness: 0.92,
        metalness: 0.0,
      }, opts));
      return m;
    },
    /* 带凹凸（法线）的贴图材质：颜色 + 由明度推导的法线图 */
    bump(mapKey, rx, ry, rough, nscale) {
      const m = M.std(cloneTex(mapKey, rx, ry), { roughness: rough });
      const n = nrm(mapKey, rx, ry);
      if (n) { m.normalMap = n; const s = nscale || 0.5; m.normalScale = new THREE.Vector2(s, s); }
      const rg = roughMap(mapKey, rx, ry);
      if (rg) m.roughnessMap = rg;
      return m;
    },
    /* 注意：重复次数用两个数字传参，例如 MT.mat.tile(2, 2) */
    brickRed(rx = 1, ry = 1) {
      const m = M.bump('brickRed', rx, ry, 0.95, 0.55);
      m.userData.baseMap = 'brickRed';
      return m;
    },
    brickGrey(rx = 1, ry = 1) { return M.bump('brickGrey', rx, ry, 0.95, 0.55); },
    whitewash(rx = 1, ry = 1) { return M.std(cloneTex('whitewash', rx, ry), { roughness: 0.9 }); },
    mud(rx = 1, ry = 1) { return M.bump('mudWall', rx, ry, 1.0, 0.7); },
    tile(rx = 1, ry = 1) { return M.bump('roofTile', rx, ry, 0.7, 0.9); },
    concrete(rx = 1, ry = 1) { return M.bump('concrete', rx, ry, 0.85, 0.3); },
    cement(rx = 1, ry = 1) { return M.bump('cementRoad', rx, ry, 0.88, 0.3); },
    dirt(rx = 1, ry = 1) { return M.bump('dirtRoad', rx, ry, 0.98, 0.5); },
    soil(rx = 1, ry = 1) { return M.bump('soil', rx, ry, 1.0, 0.45); },
    grass(rx = 1, ry = 1) { return M.bump('grass', rx, ry, 1.0, 0.45); },
    bark() { return M.bump('bark', 1, 1, 0.95, 0.8); },
    wood(rx = 1, ry = 1) { return M.bump('wood', rx, ry, 0.85, 0.45); },
    door() { return M.bump('door', 1, 1, 0.7, 0.6); },
    window() {
      return M.std(cloneTex('window', 1, 1), { roughness: 0.18, metalness: 0.15, color: 0xffffff });
    },
    straw() { return M.bump('straw', 1, 1, 1.0, 0.6); },
    vegBed(rx = 1, ry = 1) { return M.bump('vegetableBed', rx, ry, 1.0, 0.4); },
    snow(rx = 1, ry = 1) { return M.std(cloneTex('snow', rx, ry), { roughness: 0.75 }); },

    /** 纯色材质 */
    solid(color, opts = {}) { return M.std(null, Object.assign({ color }, opts)); },

    /** 平顶 / 水泥顶 */
    roofConcrete() { return M.std(cloneTex('concrete', 2, 2), { color: 0xb6b2a8, roughness: 0.9 }); },

    /** 金属：铁皮、栏杆、农机 */
    metal(color = 0x9aa0a6, rough = 0.45) {
      return M.std(null, { color, roughness: rough, metalness: 0.7 });
    },

    /** 发光窗（夜晚点亮） */
    windowLit(color = 0xffd9a0) {
      const m = M.std(cloneTex('window', 1, 1), {
        color: 0xffffff, emissive: new THREE.Color(color), emissiveIntensity: 0.0,
        roughness: 0.25, metalness: 0.1,
      });
      m.userData.lightColor = color;
      return m;
    },

    /** 水面（简单标准材质 + 法线动画由 water 模块驱动） */
    water(color = 0x2f6b63, opacity = 0.86) {
      const n = cloneTex('waterNormal', 26, 26);
      const m = new THREE.MeshStandardMaterial({
        color, roughness: 0.16, metalness: 0.18,
        normalMap: n, normalScale: new THREE.Vector2(0.55, 0.55),
        transparent: true, opacity,
        envMapIntensity: 1.35,
        // 一点自发光，保证没有环境贴图时水面也不会变成"黑洞"
        emissive: new THREE.Color(color).multiplyScalar(0.12),
      });
      m.userData.normalMapRef = n;
      return m;
    },

    /** 稻草人/庄稼用的双面材质（配合 InstancedMesh.instanceColor 使用） */
    foliage(color, opts = {}) {
      return M.std(null, Object.assign({
        color, roughness: 1.0, side: THREE.DoubleSide,
      }, opts));
    },
  };

  /* 预生成所有贴图（在 loading 阶段调用，可报告进度） */
  const LIST = Object.keys(T);
  /** 让出主线程：可见标签页用 rAF（流畅），后台标签页用 setTimeout（rAF 会被节流而"卡死"） */
  let rafStalled = false;
  /**
   * 让出主线程。可见标签页用 rAF（流畅）；若 rAF 被节流（后台标签、
   * 嵌入式 WebView 等）则自动退回到 setTimeout，保证载入不会"卡死"。
   */
  function nextTick() {
    // MT.NO_YIELD：同步生成（用于自动化测试或特殊环境）
    if (MT.NO_YIELD) return Promise.resolve();
    return new Promise((res) => {
      if (rafStalled || (typeof document !== 'undefined' && document.hidden)) { setTimeout(res, 0); return; }
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true; rafStalled = true;
        console.warn('[textures] requestAnimationFrame 被节流，改用定时器继续生成。');
        res();
      }, 250);
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(() => { if (!done) { done = true; clearTimeout(timer); res(); } });
      } else {
        clearTimeout(timer); setTimeout(res, 0);
      }
    });
  }
  function preload(onProgress) {
    return new Promise((resolve) => {
      let i = 0;
      const CHUNK = 3;   // 每批生成 3 张，减少让出次数
      const step = () => {
        if (i >= LIST.length) { resolve(); return; }
        for (let c = 0; c < CHUNK && i < LIST.length; c++) {
          const k = LIST[i++];
          try { T[k](); } catch (e) { console.warn('[textures] 生成失败', k, e); }
          if (onProgress) onProgress(i / LIST.length, k);
        }
        nextTick().then(step);
      };
      step();
    });
  }

  /* =========================================================
   *  中文文字贴图（石碑 / 标语 / 招牌 / 匾额 / 春联）
   * ========================================================= */
  const CN_FONT = '"Microsoft YaHei","微软雅黑","SimHei","黑体","STKaiti","KaiTi","楷体",sans-serif';
  const CN_FONT_SERIF = '"STKaiti","KaiTi","楷体","STSong","SimSun","宋体",serif';

  /**
   * opts: { w,h, bg, color, font, fontSize, vertical, border, borderColor,
   *         align, pad, lines, lineGap, shadow, bold }
   */
  function textTex(key, text, opts = {}) {
    const ck = 'txt:' + key;
    if (cache[ck]) return cache[ck];
    const w = opts.w || 512, h = opts.h || 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const bg = opts.bg === undefined ? '#f2ead6' : opts.bg;
    if (bg === 'none' || bg === null) ctx.clearRect(0, 0, w, h);
    else { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    if (opts.grain !== false && bg !== 'none' && bg !== null) {
      grain(ctx, Math.min(w, h), 6);   // putImageData 忽略 globalAlpha，改用较小的量级
    }
    const lines = opts.lines || String(text).split('\n');
    const vertical = !!opts.vertical;
    const fontSize = opts.fontSize || Math.min(w / Math.max(1, lines.length) * 0.6, h * 0.62);
    ctx.font = `${opts.bold === false ? '' : 'bold '}${fontSize}px ${opts.font || (opts.serif ? CN_FONT_SERIF : CN_FONT)}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color || '#2b2318';
    if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = fontSize * 0.12; }
    const pad = opts.pad === undefined ? 0.08 : opts.pad;
    if (vertical) {
      const chars = lines.join('').split('');
      const n = chars.length;
      const step = (h * (1 - pad * 2)) / n;
      const fs = Math.min(fontSize, step * 0.92, w * 0.7);
      ctx.font = `${opts.bold === false ? '' : 'bold '}${fs}px ${opts.font || CN_FONT_SERIF}`;
      for (let i = 0; i < n; i++) {
        ctx.fillText(chars[i], w / 2, h * pad + step * (i + 0.5));
      }
    } else {
      const lineH = h * (1 - pad * 2) / lines.length;
      lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h * pad + lineH * (i + 0.5)));
    }
    if (opts.border) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = opts.borderColor || '#8a2b1e';
      ctx.lineWidth = opts.borderWidth || Math.max(3, fontSize * 0.06);
      const m = ctx.lineWidth * 1.2;
      ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso();
    cache[ck] = t;
    return t;
  }
  /** 由文字贴图生成材质 */
  function textMat(text, opts = {}) {
    return new THREE.MeshStandardMaterial({
      map: textTex(opts.key || text + JSON.stringify(opts).slice(0, 24), text, opts),
      roughness: opts.roughness === undefined ? 0.85 : opts.roughness,
      metalness: 0.02,
      side: opts.side || THREE.FrontSide,
      transparent: opts.transparent || false,
    });
  }
  /** 木匾（带文字的长方体） */
  function plaque(text, w, h, opts = {}) {
    const d = opts.depth || 0.09;
    const g = new THREE.BoxGeometry(w, h, d);
    const face = new THREE.MeshStandardMaterial({
      map: textTex('pq:' + text + (opts.bg || ''), text, Object.assign({
        w: 512, h: 160, bg: opts.bg || '#4a2a1c', color: opts.color || '#e8c96a',
        serif: true, border: opts.border === undefined ? true : opts.border,
      }, opts)),
      roughness: 0.7,
    });
    const side = new THREE.MeshStandardMaterial({ color: opts.sideColor || 0x2f1c12, roughness: 0.85 });
    // BoxGeometry 材质顺序: +x,-x,+y,-y,+z,-z
    const mesh = new THREE.Mesh(g, [side, side, side, side, face, side]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.plaqueText = text;
    return mesh;
  }

  MT.tex = T;
  MT.mat = M;
  MT.texture = {
    preload, tex, dataTex, cloneTex, makeCanvas, grain, splotch, cache,
    textTex, textMat, plaque, CN_FONT, CN_FONT_SERIF,
  };
})();
