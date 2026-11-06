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
    t.anisotropy = opts.aniso === undefined ? 4 : opts.aniso;
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
  function brickPattern(ctx, size, cols, rows, mortar, faces) {
    ctx.fillStyle = mortar; ctx.fillRect(0, 0, size, size);
    const bw = size / cols, bh = size / rows, m = Math.max(1.5, bh * 0.14);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw * 0.5;
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off + m * 0.5;
        const y = r * bh + m * 0.5;
        const w = bw - m, h = bh - m;
        const f = faces();
        ctx.fillStyle = f;
        ctx.fillRect(x, y, w, h);
        // 砖面轻微明暗
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, y, w, Math.max(1, h * 0.18));
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.fillRect(x, y + h - Math.max(1, h * 0.16), w, Math.max(1, h * 0.16));
      }
    }
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
    brickRed: () => tex('brickRed', 512, (ctx, s) => {
      const base = [[196, 96, 74], [176, 78, 60], [212, 112, 88], [160, 70, 56], [188, 88, 68]];
      brickPattern(ctx, s, 8, 26, '#c9bfae', () => {
        const c = base[(Math.random() * base.length) | 0];
        const k = 0.88 + Math.random() * 0.24;
        return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
      });
      grain(ctx, s, 16);
    }),

    /* ---- 青砖墙 ---- */
    brickGrey: () => tex('brickGrey', 512, (ctx, s) => {
      const base = [[124, 128, 126], [104, 110, 110], [136, 138, 134], [92, 98, 100], [116, 120, 118]];
      brickPattern(ctx, s, 8, 26, '#a8a49a', () => {
        const c = base[(Math.random() * base.length) | 0];
        const k = 0.9 + Math.random() * 0.2;
        return `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
      });
      grain(ctx, s, 14);
    }),

    /* ---- 白石灰墙（刷白灰/月白）---- */
    whitewash: () => tex('whitewash', 512, (ctx, s) => {
      ctx.fillStyle = '#e8e4d8'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 90, 20, 90, () => ['rgba(214,208,190,0.35)', 'rgba(214,208,190,0)']);
      splotch(ctx, s, 60, 10, 50, () => ['rgba(255,253,244,0.5)', 'rgba(255,253,244,0)']);
      // 墙裙灰
      const g = ctx.createLinearGradient(0, s * 0.72, 0, s);
      g.addColorStop(0, 'rgba(120,116,104,0)');
      g.addColorStop(1, 'rgba(104,100,90,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, s * 0.72, s, s * 0.28);
      grain(ctx, s, 10);
    }),

    /* ---- 夯土墙（老屋土坯）---- */
    mudWall: () => tex('mudWall', 512, (ctx, s) => {
      ctx.fillStyle = '#bfa47c'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 140, 12, 70, () => ['rgba(168,142,104,0.45)', 'rgba(168,142,104,0)']);
      splotch(ctx, s, 90, 8, 40, () => ['rgba(214,192,158,0.5)', 'rgba(214,192,158,0)']);
      // 麦草筋
      ctx.strokeStyle = 'rgba(198,176,130,0.55)';
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI;
        const l = 6 + Math.random() * 16;
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
      grain(ctx, s, 20);
    }),

    /* ---- 青灰小瓦（屋瓦）---- */
    roofTile: () => tex('roofTile', 512, (ctx, s) => {
      ctx.fillStyle = '#4d5359'; ctx.fillRect(0, 0, s, s);
      const cols = 22, rows = 8;
      const cw = s / cols, ch = s / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cw, y = r * ch;
          const g = ctx.createLinearGradient(x, y, x + cw, y);
          const k = 0.82 + Math.random() * 0.36;
          const c1 = `rgb(${(86 * k) | 0},${(94 * k) | 0},${(101 * k) | 0})`;
          const c2 = `rgb(${(52 * k) | 0},${(58 * k) | 0},${(64 * k) | 0})`;
          g.addColorStop(0, c1); g.addColorStop(0.45, c2); g.addColorStop(1, c1);
          ctx.fillStyle = g;
          ctx.fillRect(x + 0.6, y, cw - 1.2, ch);
          // 瓦楞阴影
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x, y, 1.4, ch);
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(x + cw * 0.42, y, cw * 0.1, ch);
          // 横向搭接
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(x, y + ch - 2, cw, 2);
        }
      }
      splotch(ctx, s, 40, 8, 40, () => ['rgba(120,132,110,0.16)', 'rgba(120,132,110,0)']);
      grain(ctx, s, 14);
    }),

    /* ---- 水泥屋面 / 平顶 ---- */
    concrete: () => tex('concrete', 512, (ctx, s) => {
      ctx.fillStyle = '#a9a49a'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 120, 14, 80, () => ['rgba(150,146,136,0.35)', 'rgba(150,146,136,0)']);
      splotch(ctx, s, 60, 6, 30, () => ['rgba(196,192,182,0.4)', 'rgba(196,192,182,0)']);
      grain(ctx, s, 22);
    }),

    /* ---- 水泥路面 / 打谷场 ---- */
    cementRoad: () => tex('cementRoad', 512, (ctx, s) => {
      ctx.fillStyle = '#b3b0a8'; ctx.fillRect(0, 0, s, s);
      grain(ctx, s, 30);
      splotch(ctx, s, 90, 10, 60, () => ['rgba(146,142,132,0.3)', 'rgba(146,142,132,0)']);
      // 伸缩缝
      ctx.strokeStyle = 'rgba(90,86,78,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(s, s * 0.5 + 4); ctx.stroke();
    }),

    /* ---- 土路 ---- */
    dirtRoad: () => tex('dirtRoad', 512, (ctx, s) => {
      ctx.fillStyle = '#a3906d'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 150, 10, 70, () => ['rgba(140,120,90,0.4)', 'rgba(140,120,90,0)']);
      splotch(ctx, s, 80, 6, 40, () => ['rgba(190,172,138,0.45)', 'rgba(190,172,138,0)']);
      // 车辙
      ctx.fillStyle = 'rgba(120,104,78,0.35)';
      ctx.fillRect(0, s * 0.24, s, s * 0.06);
      ctx.fillRect(0, s * 0.68, s, s * 0.06);
      grain(ctx, s, 26);
    }),

    /* ---- 田地土壤 ---- */
    soil: () => tex('soil', 512, (ctx, s) => {
      ctx.fillStyle = '#6d5a41'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 200, 8, 60, () => ['rgba(88,72,52,0.5)', 'rgba(88,72,52,0)']);
      splotch(ctx, s, 120, 6, 40, () => ['rgba(128,108,80,0.45)', 'rgba(128,108,80,0)']);
      grain(ctx, s, 30);
    }),

    /* ---- 草地 ---- */
    grass: () => tex('grass', 512, (ctx, s) => {
      ctx.fillStyle = '#5d7a3c'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 5200; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const h = 3 + Math.random() * 8;
        const k = 0.7 + Math.random() * 0.7;
        ctx.strokeStyle = `rgba(${(96 * k) | 0},${(126 * k) | 0},${(58 * k) | 0},0.75)`;
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 3, y - h); ctx.stroke();
      }
      splotch(ctx, s, 70, 16, 70, () => ['rgba(126,146,72,0.25)', 'rgba(126,146,72,0)']);
      grain(ctx, s, 14);
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
    bark: () => tex('bark', 256, (ctx, s) => {
      ctx.fillStyle = '#7a6a56'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * s;
        ctx.strokeStyle = `rgba(${40 + Math.random() * 60},${32 + Math.random() * 50},${24 + Math.random() * 40},0.5)`;
        ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y < s; y += 12) ctx.lineTo(x + (Math.random() - 0.5) * 5, y);
        ctx.stroke();
      }
      grain(ctx, s, 20);
    }),

    /* ---- 木料 / 门板 ---- */
    wood: () => tex('wood', 256, (ctx, s) => {
      ctx.fillStyle = '#8a6a45'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 90; i++) {
        const y = Math.random() * s;
        ctx.strokeStyle = `rgba(${70 + Math.random() * 60},${50 + Math.random() * 45},${30 + Math.random() * 35},0.45)`;
        ctx.lineWidth = 1 + Math.random() * 4;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x < s; x += 16) ctx.lineTo(x, y + (Math.random() - 0.5) * 4);
        ctx.stroke();
      }
      grain(ctx, s, 16);
    }),

    /* ---- 木门（带门板与门钉）---- */
    door: () => tex('door', 256, (ctx, s) => {
      ctx.fillStyle = '#5d4128'; ctx.fillRect(0, 0, s, s);
      const panels = 2;
      const pw = s / panels;
      for (let i = 0; i < panels; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(i * pw, 0, pw, s);
        ctx.strokeStyle = '#3d2a17'; ctx.lineWidth = 5;
        ctx.strokeRect(i * pw + 8, 8, pw - 16, s - 16);
      }
      ctx.fillStyle = '#3a2916'; ctx.fillRect(s * 0.46, 0, s * 0.08, s);
      // 铜环
      ctx.strokeStyle = '#b9a06a'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(s * 0.3, s * 0.52, s * 0.07, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.7, s * 0.52, s * 0.07, 0, Math.PI * 2); ctx.stroke();
    }),

    /* ---- 玻璃窗（深色反光）---- */
    window: () => tex('window', 256, (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#5b7280'); g.addColorStop(0.5, '#33454f'); g.addColorStop(1, '#22303a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.fill();
      // 窗框
      ctx.strokeStyle = '#e6e2d6'; ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, s - 14, s - 14);
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(s * 0.5, 0); ctx.lineTo(s * 0.5, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(s, s * 0.5); ctx.stroke();
    }),

    /* ---- 稻草 / 柴草 ---- */
    straw: () => tex('straw', 256, (ctx, s) => {
      ctx.fillStyle = '#c8ab63'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2200; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const a = Math.random() * Math.PI;
        const l = 8 + Math.random() * 22;
        const k = 0.75 + Math.random() * 0.5;
        ctx.strokeStyle = `rgba(${(206 * k) | 0},${(174 * k) | 0},${(96 * k) | 0},0.8)`;
        ctx.lineWidth = 1 + Math.random() * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
      }
      grain(ctx, s, 16);
    }),

    /* ---- 菜地土垄 ---- */
    vegetableBed: () => tex('vegetableBed', 256, (ctx, s) => {
      ctx.fillStyle = '#5b4a34'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 7; i++) {
        const x = (i / 7) * s;
        const g = ctx.createLinearGradient(x, 0, x + s / 7, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.22)');
        g.addColorStop(0.5, 'rgba(150,124,88,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = g; ctx.fillRect(x, 0, s / 7, s);
      }
      splotch(ctx, s, 80, 6, 40, () => ['rgba(80,100,50,0.25)', 'rgba(80,100,50,0)']);
      grain(ctx, s, 20);
    }),

    /* ---- 云 ---- */
    cloud: () => tex('cloud', 256, (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const x = s * (0.15 + Math.random() * 0.7);
        const y = s * (0.3 + Math.random() * 0.4);
        const r = s * (0.08 + Math.random() * 0.16);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
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
    snow: () => tex('snow', 512, (ctx, s) => {
      ctx.fillStyle = '#eef2f6'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 120, 10, 60, () => ['rgba(214,224,234,0.5)', 'rgba(214,224,234,0)']);
      splotch(ctx, s, 60, 6, 30, () => ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']);
      grain(ctx, s, 8);
    }),

    /* ---- 中国古代风格纸纹（UI 备用）---- */
    paper: () => tex('paper', 256, (ctx, s) => {
      ctx.fillStyle = '#efe7d5'; ctx.fillRect(0, 0, s, s);
      splotch(ctx, s, 60, 10, 60, () => ['rgba(206,192,164,0.4)', 'rgba(206,192,164,0)']);
      grain(ctx, s, 12);
    }),

    /* ---- 草叶（带透明通道，用于草地/芦苇）---- */
    blade: () => tex('blade', 128, (ctx, s) => {
      baseFill(ctx, s, [86, 118, 48], 0.3);
      const n = 11;
      for (let i = 0; i < n; i++) {
        const x0 = s * (0.06 + Math.random() * 0.88);
        const h = s * (0.42 + Math.random() * 0.56);
        const w = s * (0.022 + Math.random() * 0.03);
        const lean = (Math.random() - 0.5) * s * 0.22;
        const k = 0.55 + Math.random() * 0.6;
        const g = ctx.createLinearGradient(x0, s, x0 + lean, s - h);
        g.addColorStop(0, `rgba(${(44 * k) | 0},${(72 * k) | 0},${(30 * k) | 0},0.96)`);
        g.addColorStop(0.6, `rgba(${(92 * k) | 0},${(134 * k) | 0},${(52 * k) | 0},0.96)`);
        g.addColorStop(1, `rgba(${(132 * k) | 0},${(178 * k) | 0},${(74 * k) | 0},0.9)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - w, s);
        ctx.quadraticCurveTo(x0 + lean * 0.4, s - h * 0.5, x0 + lean, s - h);
        ctx.quadraticCurveTo(x0 + lean * 0.4 + w * 1.2, s - h * 0.5, x0 + w, s);
        ctx.closePath(); ctx.fill();
      }
    }),

    /* ---- 庄稼（麦/稻/玉米/油菜），带透明通道 ---- */
    cropWheat: () => tex('cropWheat', 128, (ctx, s) => {
      baseFill(ctx, s, [198, 172, 100], 0.32);
      for (let i = 0; i < 9; i++) {
        const x0 = s * (0.08 + Math.random() * 0.84);
        const h = s * (0.7 + Math.random() * 0.3);
        const lean = (Math.random() - 0.5) * s * 0.16;
        const k = 0.75 + Math.random() * 0.4;
        ctx.strokeStyle = `rgba(${(206 * k) | 0},${(178 * k) | 0},${(96 * k) | 0},0.95)`;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.5, s - h * 0.6, x0 + lean, s - h * 0.9);
        ctx.stroke();
        // 麦穗
        ctx.fillStyle = `rgba(${(222 * k) | 0},${(196 * k) | 0},${(112 * k) | 0},0.98)`;
        for (let a = 0; a < 6; a++) {
          ctx.beginPath();
          ctx.ellipse(x0 + lean + (a % 2 ? 3 : -3), s - h * (0.72 + a * 0.045), 3.2, 5.4, a % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 麦芒
      ctx.strokeStyle = 'rgba(232,214,150,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * s, y = s * (0.1 + Math.random() * 0.35);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 10, y - 12); ctx.stroke();
      }
    }),
    cropRice: () => tex('cropRice', 128, (ctx, s) => {
      baseFill(ctx, s, [118, 158, 68], 0.32);
      for (let i = 0; i < 13; i++) {
        const x0 = s * (0.06 + Math.random() * 0.88);
        const h = s * (0.62 + Math.random() * 0.38);
        const lean = (Math.random() - 0.5) * s * 0.26;
        const k = 0.7 + Math.random() * 0.5;
        const green = `rgba(${(118 * k) | 0},${(160 * k) | 0},${(64 * k) | 0},0.95)`;
        ctx.strokeStyle = green; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.4, s - h * 0.55, x0 + lean, s - h);
        ctx.stroke();
        // 稻穗（下垂）
        ctx.strokeStyle = `rgba(${(190 * k) | 0},${(196 * k) | 0},${(110 * k) | 0},0.9)`;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x0 + lean, s - h);
        ctx.quadraticCurveTo(x0 + lean + 8, s - h + 6, x0 + lean + 4, s - h + 14);
        ctx.stroke();
      }
    }),
    cropCorn: () => tex('cropCorn', 128, (ctx, s) => {
      baseFill(ctx, s, [128, 168, 68], 0.32);
      for (let i = 0; i < 4; i++) {
        const x0 = s * (0.2 + i * 0.2 + Math.random() * 0.08);
        const h = s * (0.86 + Math.random() * 0.12);
        const k = 0.8 + Math.random() * 0.35;
        ctx.strokeStyle = `rgba(${(126 * k) | 0},${(170 * k) | 0},${(66 * k) | 0},0.97)`;
        ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(x0, s); ctx.lineTo(x0 + (Math.random() - 0.5) * 4, s - h); ctx.stroke();
        // 叶
        for (let a = 0; a < 5; a++) {
          const y = s - h * (0.28 + a * 0.15);
          const dir = a % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.quadraticCurveTo(x0 + dir * 22, y - 10, x0 + dir * 34, y + 6);
          ctx.quadraticCurveTo(x0 + dir * 18, y + 3, x0, y + 4);
          ctx.fillStyle = `rgba(${(140 * k) | 0},${(184 * k) | 0},${(74 * k) | 0},0.96)`;
          ctx.fill();
        }
        // 玉米棒
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(226,202,120,0.95)';
          ctx.beginPath(); ctx.ellipse(x0 + 9, s - h * 0.5, 4.6, 12, 0.3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }),
    cropRape: () => tex('cropRape', 128, (ctx, s) => {
      baseFill(ctx, s, [160, 176, 76], 0.32);
      for (let i = 0; i < 12; i++) {
        const x0 = s * (0.06 + Math.random() * 0.88);
        const h = s * (0.66 + Math.random() * 0.34);
        const lean = (Math.random() - 0.5) * s * 0.2;
        const k = 0.8 + Math.random() * 0.35;
        ctx.strokeStyle = `rgba(${(112 * k) | 0},${(156 * k) | 0},${(62 * k) | 0},0.95)`;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.5, s - h * 0.6, x0 + lean, s - h);
        ctx.stroke();
        // 黄花
        for (let a = 0; a < 5; a++) {
          ctx.fillStyle = `rgba(${(246 * k) | 0},${(216 * k) | 0},${(72 * k) | 0},0.97)`;
          const a2 = a * 1.3;
          ctx.beginPath();
          ctx.arc(x0 + lean + Math.cos(a2) * 6, s - h + Math.sin(a2) * 5 - 2, 4.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }),
    /* ---- 菜地：白菜/青菜 ---- */
    cropGreens: () => tex('cropGreens', 128, (ctx, s) => {
      baseFill(ctx, s, [100, 148, 62], 0.32);
      for (let i = 0; i < 8; i++) {
        const x0 = s * (0.12 + Math.random() * 0.76);
        const y0 = s * (0.55 + Math.random() * 0.42);
        const k = 0.75 + Math.random() * 0.45;
        for (let a = 0; a < 7; a++) {
          const ang = -Math.PI / 2 + (a - 3) * 0.42;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(x0 + Math.cos(ang) * 14, y0 + Math.sin(ang) * 22,
            x0 + Math.cos(ang) * 22, y0 + Math.sin(ang) * 34);
          ctx.lineWidth = 7;
          ctx.strokeStyle = `rgba(${(92 * k) | 0},${(148 * k) | 0},${(58 * k) | 0},0.95)`;
          ctx.stroke();
        }
      }
    }),

    /* ---- 芦苇 ---- */
    reed: () => tex('reed', 128, (ctx, s) => {
      baseFill(ctx, s, [124, 138, 82], 0.3);
      for (let i = 0; i < 7; i++) {
        const x0 = s * (0.12 + Math.random() * 0.76);
        const h = s * (0.72 + Math.random() * 0.27);
        const w = s * 0.02;
        const lean = (Math.random() - 0.5) * s * 0.16;
        const k = 0.6 + Math.random() * 0.5;
        ctx.strokeStyle = `rgba(${(126 * k) | 0},${(140 * k) | 0},${(84 * k) | 0},0.95)`;
        ctx.lineWidth = w * 2;
        ctx.beginPath();
        ctx.moveTo(x0, s);
        ctx.quadraticCurveTo(x0 + lean * 0.5, s - h * 0.55, x0 + lean, s - h * 0.92);
        ctx.stroke();
        // 芦花
        ctx.fillStyle = `rgba(${(196 * k) | 0},${(180 * k) | 0},${(140 * k) | 0},0.9)`;
        ctx.beginPath();
        ctx.ellipse(x0 + lean, s - h * 0.96, w * 1.8, h * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }),

    /* ---- 水波（用于水面的简易法线贴图）---- */
    waterNormal: () => dataTex('waterNormal', 256, (ctx, s) => {
      const n = new MT.Noise(31);
      const img = ctx.createImageData(s, s);
      const d = img.data;
      const f = 0.045;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const h = n.fbm(x * f, y * f, 3);
          const hx = n.fbm((x + 1) * f, y * f, 3);
          const hy = n.fbm(x * f, (y + 1) * f, 3);
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
    /* 注意：重复次数用两个数字传参，例如 MT.mat.tile(2, 2) */
    brickRed(rx = 1, ry = 1) {
      const m = M.std(cloneTex('brickRed', rx, ry), { roughness: 0.95 });
      m.userData.baseMap = 'brickRed';
      return m;
    },
    brickGrey(rx = 1, ry = 1) { return M.std(cloneTex('brickGrey', rx, ry), { roughness: 0.95 }); },
    whitewash(rx = 1, ry = 1) { return M.std(cloneTex('whitewash', rx, ry), { roughness: 0.9 }); },
    mud(rx = 1, ry = 1) { return M.std(cloneTex('mudWall', rx, ry), { roughness: 1.0 }); },
    tile(rx = 1, ry = 1) { return M.std(cloneTex('roofTile', rx, ry), { roughness: 0.72 }); },
    concrete(rx = 1, ry = 1) { return M.std(cloneTex('concrete', rx, ry), { roughness: 0.85 }); },
    cement(rx = 1, ry = 1) { return M.std(cloneTex('cementRoad', rx, ry), { roughness: 0.88 }); },
    dirt(rx = 1, ry = 1) { return M.std(cloneTex('dirtRoad', rx, ry), { roughness: 0.98 }); },
    soil(rx = 1, ry = 1) { return M.std(cloneTex('soil', rx, ry), { roughness: 1.0 }); },
    grass(rx = 1, ry = 1) { return M.std(cloneTex('grass', rx, ry), { roughness: 1.0 }); },
    bark() { return M.std(cloneTex('bark', 1, 1), { roughness: 0.95 }); },
    wood(rx = 1, ry = 1) { return M.std(cloneTex('wood', rx, ry), { roughness: 0.85 }); },
    door() { return M.std(cloneTex('door', 1, 1), { roughness: 0.7 }); },
    window() {
      return M.std(cloneTex('window', 1, 1), { roughness: 0.18, metalness: 0.15, color: 0xffffff });
    },
    straw() { return M.std(cloneTex('straw', 1, 1), { roughness: 1.0 }); },
    vegBed(rx = 1, ry = 1) { return M.std(cloneTex('vegetableBed', rx, ry), { roughness: 1.0 }); },
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
      ctx.save(); ctx.globalAlpha = 0.10; grain(ctx, Math.min(w, h), 14); ctx.restore();
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
    t.anisotropy = 4;
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
