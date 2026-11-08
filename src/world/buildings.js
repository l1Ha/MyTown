/* =============================================================
 *  MyTown · 我的家乡 3D  —  建筑工厂（豫南 / 淮河沿岸民居）
 *  buildings.js : 几何助手 / 共享材质 / 砖瓦房 / 土坯老屋 / 两层小楼
 *                 / 院落 / 院墙 / 门楼 / 附属房 / 可进入的室内
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad, lerp } = MT.util;

  MT.colliders = MT.colliders || [];

  /* =========================================================
   *  共享材质
   * ========================================================= */
  let SM = null;
  function M() {
    if (SM) return SM;
    SM = {
      brickRed: MT.mat.brickRed(1, 1),
      brickGrey: MT.mat.brickGrey(1, 1),
      white: MT.mat.whitewash(1, 1),
      mud: MT.mat.mud(1, 1),
      tile: MT.mat.tile(1, 1),
      tileDark: MT.mat.tile(1, 1),
      concrete: MT.mat.concrete(1, 1),
      cement: MT.mat.cement(1, 1),
      wood: MT.mat.wood(1, 1),
      woodDark: MT.mat.solid(0x5a4028, { roughness: 0.85 }),
      door: MT.mat.door(),
      doorRed: MT.mat.solid(0x8d3a2a, { roughness: 0.6 }),
      window: MT.mat.window(),
      windowLit: (() => {
        const wm = MT.mat.window();
        wm.emissive = new THREE.Color(0xffd08a);
        wm.emissiveIntensity = 0;
        return wm;
      })(),
      metal: MT.mat.metal(0xa8aeb4, 0.4),
      metalDark: MT.mat.metal(0x5d6469, 0.5),
      steel: MT.mat.metal(0xcdd3d8, 0.3),
      stone: MT.mat.solid(0x9a998f, { roughness: 0.95 }),
      red: MT.mat.solid(0xa8321f, { roughness: 0.7 }),
      yellow: MT.mat.solid(0xd8b23c, { roughness: 0.7 }),
      green: MT.mat.solid(0x3f6b3a, { roughness: 0.8 }),
      blue: MT.mat.solid(0x2f5f86, { roughness: 0.7 }),
      tileBlue: MT.mat.solid(0x4a6b8a, { roughness: 0.6 }),
      straw: MT.mat.straw(),
      cloth: MT.mat.solid(0xd8d4c8, { roughness: 0.95, side: THREE.DoubleSide }),
      clothRed: MT.mat.solid(0xb8342a, { roughness: 0.9, side: THREE.DoubleSide }),
      clothBlue: MT.mat.solid(0x3a5f96, { roughness: 0.9, side: THREE.DoubleSide }),
      glassDark: MT.mat.solid(0x2a3a44, { roughness: 0.15, metalness: 0.5 }),
      solar: MT.mat.solid(0x1b2a3a, { roughness: 0.2, metalness: 0.6 }),
      ceramic: MT.mat.solid(0x4a3b2c, { roughness: 0.35 }),
      mudBrick: MT.mat.solid(0xa08a63, { roughness: 1.0 }),
    };
    return SM;
  }
  MT.M = M;

  /* =========================================================
   *  几何助手
   * ========================================================= */
  const G = {};

  /** 世界尺度一致的盒体 UV（tile = 一个贴图单位对应的米数） */
  function scaleBoxUV(geo, w, h, d, tile) {
    const uv = geo.attributes.uv;
    const spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const su = spans[f][0] / tile, sv = spans[f][1] / tile;
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  G.box = function (w, h, d, mat, tile) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (tile) scaleBoxUV(g, w, h, d, tile);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  G.cyl = function (rt, rb, h, mat, seg) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg || 12, 1);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  G.sphere = function (r, mat, seg) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 12, (seg || 12) / 2 | 0), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  G.plane = function (w, h, mat, tileX, tileY) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    if (tileX || tileY) {
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (tileX || 1), uv.getY(i) * (tileY || 1));
    }
    const m = new THREE.Mesh(g, mat);
    m.castShadow = false; m.receiveShadow = true;
    return m;
  };
  /** 三角形（用于山墙） */
  G.tri = function (base, height, mat, tile) {
    const s = new THREE.Shape();
    s.moveTo(-base / 2, 0); s.lineTo(base / 2, 0); s.lineTo(0, height); s.lineTo(-base / 2, 0);
    const g = new THREE.ShapeGeometry(s);
    const uv = g.attributes.uv;
    if (tile) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  G.group = function (x, y, z, ry) {
    const g = new THREE.Group();
    if (x !== undefined) g.position.set(x, y, z);
    if (ry) g.rotation.y = ry;
    return g;
  };
  /** 注册碰撞盒（局部坐标，由调用者给出世界中心/朝向） */
  G.collide = function (x, y, z, w, h, d, ry) {
    MT.colliders.push({
      x, y, z, hw: w / 2, hh: h / 2, hd: d / 2,
      ry: ry || 0, cos: Math.cos(-(ry || 0)), sin: Math.sin(-(ry || 0)), active: true,
    });
  };
  G.collideFrom = function (group, w, h, d, yOff) {
    const p = new THREE.Vector3(); group.getWorldPosition(p);
    G.collide(p.x, p.y + (yOff || h / 2), p.z, w, h, d, group.rotation.y);
  };
  G.walkTop = function (x, z, r, top) {
    // 可行走的平台（台阶/堤顶/屋顶平台），用于玩家站立
    MT.platforms = MT.platforms || [];
    MT.platforms.push({ x, z, r, top, active: true });
  };

  G.tag = function (obj, data) {
    Object.assign(obj.userData, data);
    return obj;
  };
  /** 标记整棵子树不参与碰撞（门、窗、屋顶、台阶、小物件等） */
  G.soft = function (obj, alsoNoBatch) {
    obj.traverse((o) => {
      o.userData.noCollide = true;
      if (alsoNoBatch) o.userData.noBatch = alsoNoBatch;
    });
    return obj;
  };

  /* ---------- 自动碰撞体收集 ----------
   * 世界搭建完成后调用：遍历所有网格，按世界包围盒生成 AABB 碰撞盒。
   * 过滤：显式 noCollide / 太薄太矮 / 完全在头顶以上 / 地形道路水面植被
   */
  G.buildColliders = function (root, opts = {}) {
    const minHeight = opts.minHeight === undefined ? 0.95 : opts.minHeight;
    const maxFloor = opts.maxFloor === undefined ? 2.25 : opts.maxFloor;
    const minArea = opts.minArea === undefined ? 0.4 : opts.minArea;
    const groundAt = opts.groundAt;   // (x,z)->地面高度；用于把 maxFloor 解释为“相对地面的高度”
    const list = [];
    const bbox = new THREE.Box3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const ud = o.userData;
      if (ud.noCollide || ud.terrain || ud.water || ud.vegetation || ud.prop) return;
      if (!o.geometry || !o.geometry.attributes.position) return;
      bbox.setFromObject(o);
      if (!isFinite(bbox.min.x)) return;
      const size = new THREE.Vector3(); bbox.getSize(size);
      if (size.y < minHeight) return;
      if (size.x * size.z < minArea) return;
      // 注意：bbox 是世界坐标，而村庄地面约 5.9m。必须减去当地地面高度，
      // 否则 bbox.min.y > maxFloor 会误杀村庄里所有房屋（原实现即为此 bug）。
      const cx = (bbox.min.x + bbox.max.x) / 2;
      const cz = (bbox.min.z + bbox.max.z) / 2;
      const groundY = groundAt ? groundAt(cx, cz) : 0;
      if (bbox.min.y - groundY > maxFloor) return;
      // 过大的物体（天空穹顶、地形、整片田、道路）不作为碰撞体
      const maxSpan = opts.maxSpan === undefined ? 90 : opts.maxSpan;
      if (size.x > maxSpan || size.z > maxSpan) return;
      if (size.x * size.z > maxSpan * maxSpan) return;
      list.push({
        x: (bbox.min.x + bbox.max.x) / 2,
        y: (bbox.min.y + bbox.max.y) / 2,
        z: (bbox.min.z + bbox.max.z) / 2,
        hw: size.x / 2, hh: size.y / 2, hd: size.z / 2, ry: 0, cos: 1, sin: 0, active: true,
      });
    });
    MT.colliders = MT.colliders.concat(list);
    return list.length;
  };

  MT.G = G;

  /* =========================================================
   *  屋顶
   * ========================================================= */
  /** 双坡屋顶（屋脊沿 X 轴）*/
  G.gableRoof = function (w, d, wallH, opts = {}) {
    const m = M();
    const g = new THREE.Group();
    const a = opts.angle || rad(26);
    const eave = opts.eave === undefined ? 0.55 : opts.eave;
    const rise = (d / 2) * Math.tan(a);
    const slopeLen = Math.hypot(d / 2, rise);
    const len = slopeLen + eave;
    const slabW = w + eave * 2;
    const tileMat = opts.mat || m.tile;
    const tile = opts.tile || 1.6;

    const mkSlab = (sign) => {
      const mesh = G.plane(slabW, len, tileMat, slabW / tile, len / tile);
      mesh.rotation.x = -Math.PI / 2 + sign * a;
      mesh.position.set(0, wallH + rise - (len / 2) * Math.sin(a), sign * (len / 2) * Math.cos(a));
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    };
    g.add(mkSlab(1)); g.add(mkSlab(-1));

    // 山墙（东西两侧三角）
    const gw = opts.gableMat || opts.wallMat || m.brickRed;
    for (const sx of [-1, 1]) {
      const t = G.tri(d + 0.1, rise + 0.05, gw, 2.0);
      t.rotation.y = sx * Math.PI / 2;
      t.position.set(sx * (w / 2 - 0.02), wallH, 0);
      t.scale.z = 1;
      g.add(t);
    }
    // 屋脊
    const ridge = G.box(slabW * 1.01, 0.2, 0.36, opts.ridgeMat || m.tileDark, 1.6);
    ridge.position.set(0, wallH + rise + 0.07, 0);
    g.add(ridge);
    // 檐口封边（滴水）
    for (const sz of [-1, 1]) {
      const f = G.box(slabW, 0.16, 0.1, opts.wallMat || m.white, 1.0);
      f.position.set(0, wallH - eave * Math.sin(a) + 0.02, sz * (d / 2 + eave * Math.cos(a)));
      g.add(f);
    }
    // 檐下椽子（从下往上看得到，最能体现"瓦房"）
    const rafterMat = opts.rafterMat || m.wood;
    const nR = Math.max(5, Math.round(slabW / 0.42));
    for (const sz of [-1, 1]) {
      for (let i = 0; i < nR; i++) {
        const x = -slabW / 2 + (i + 0.5) * (slabW / nR);
        const r = G.box(0.06, 0.09, eave + 0.35, rafterMat, 0.5);
        r.rotation.x = sz * a;
        r.position.set(x, wallH - (eave + 0.35) * 0.5 * Math.sin(a) - 0.04, sz * (d / 2 + (eave + 0.35) * 0.5 * Math.cos(a)));
        G.soft(r);
        g.add(r);
      }
    }
    // 屋脊两端的"翘角"
    for (const sx of [-1, 1]) {
      const up = G.box(0.28, 0.5, 0.34, opts.ridgeMat || m.tileDark, 1.0);
      up.position.set(sx * slabW * 0.5, wallH + rise + 0.22, 0);
      g.add(up);
    }
    g.userData.rise = rise;
    return G.soft(g);
  };

  /** 平屋顶（两层小楼） */
  G.flatRoof = function (w, d, wallH, opts = {}) {
    const m = M();
    const g = new THREE.Group();
    const slab = G.box(w + 0.4, 0.22, d + 0.4, m.concrete, 1.4);
    slab.position.set(0, wallH + 0.1, 0);
    g.add(slab);
    // 女儿墙
    const p = 0.5, t = 0.16;
    const mk = (ww, dd, x, z) => {
      const b = G.box(ww, p, dd, m.white, 1.2);
      b.position.set(x, wallH + 0.22 + p / 2, z);
      g.add(b);
    };
    mk(w + 0.4, t, 0, (d + 0.4) / 2);
    mk(w + 0.4, t, 0, -(d + 0.4) / 2);
    mk(t, d + 0.4, (w + 0.4) / 2, 0);
    mk(t, d + 0.4, -(w + 0.4) / 2, 0);
    if (opts.railing) {
      // 不锈钢栏杆
      const rail = G.box(w + 0.4, 0.05, 0.05, m.steel, 0.6);
      rail.position.set(0, wallH + 0.22 + 1.0, (d + 0.4) / 2);
      g.add(rail);
      for (let i = -3; i <= 3; i++) {
        const post = G.box(0.05, 1.0, 0.05, m.steel, 0.4);
        post.position.set((i / 3) * (w / 2 + 0.2), wallH + 0.22 + 0.5, (d + 0.4) / 2);
        g.add(post);
      }
    }
    return G.soft(g);
  };

  /* =========================================================
   *  门窗
   * ========================================================= */
  G.door = function (w, h, opts = {}) {
    const m = M();
    const g = new THREE.Group();
    const frame = G.box(w + 0.22, h + 0.16, 0.14, opts.frameMat || m.wood, 1.0);
    frame.position.set(0, h / 2, -0.04);
    g.add(frame);
    const leaf = G.box(w, h, 0.07, opts.mat || m.door, 1.0);
    leaf.position.set(0, h / 2, 0.03);
    g.add(leaf);
    // 门槛
    const sill = G.box(w + 0.6, 0.14, 0.5, m.stone, 0.8);
    sill.position.set(0, 0.02, 0.16);
    g.add(sill);
    // 门簪 / 门钉
    if (opts.studs !== false) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14), m.yellow);
      ring.position.set(w * 0.22, h * 0.55, 0.08); ring.rotation.y = Math.PI / 2;
      g.add(ring);
      const ring2 = ring.clone(); ring2.position.x = -w * 0.22; g.add(ring2);
    }
    // 春联
    if (opts.spring) {
      const c1 = G.plane(0.3, h * 1.1, m.clothRed, 1, 1);
      c1.position.set(-(w / 2 + 0.28), h * 0.55, 0.06); g.add(c1);
      const c2 = c1.clone(); c2.position.x = (w / 2 + 0.28); g.add(c2);
      const c3 = G.plane(w + 1.2, 0.34, m.clothRed, 1, 1);
      c3.position.set(0, h + 0.44, 0.06); g.add(c3);
      // 门神/福字
      const fu = G.plane(0.42, 0.42, m.clothRed, 1, 1);
      fu.position.set(0, h * 0.72, 0.075); g.add(fu);
    }
    G.soft(g);
    g.userData.doorway = { w, h };
    return g;
  };

  G.window = function (w, h, opts = {}) {
    const m = M();
    const g = new THREE.Group();
    const frame = G.box(w + 0.16, h + 0.16, 0.1, opts.frameMat || m.white, 1.0);
    frame.position.set(0, h / 2, 0);
    g.add(frame);
    const glass = G.box(w, h, 0.06, opts.mat || (opts.lit ? m.windowLit : m.window), 1.0);
    if (!opts.mat && opts.lit) glass.userData.litWindow = true;
    glass.position.set(0, h / 2, 0.03);
    g.add(glass);
    // 窗台
    const sill = G.box(w + 0.3, 0.08, 0.24, m.stone, 0.8);
    sill.position.set(0, -0.04, 0.1);
    g.add(sill);
    if (opts.bars) {
      for (let i = -1; i <= 1; i++) {
        const bar = G.box(0.04, h, 0.04, m.metal, 0.5);
        bar.position.set(i * w / 3.2, h / 2, 0.07);
        g.add(bar);
      }
    } else if (opts.grid !== false) {
      // 田字格窗棂
      const barMat = opts.frameMat || m.white;
      const v = G.box(0.04, h, 0.05, barMat, 0.5); v.position.set(0, h / 2, 0.062); g.add(v);
      const hz = G.box(w, 0.04, 0.05, barMat, 0.5); hz.position.set(0, h / 2, 0.062); g.add(hz);
      const hz2 = G.box(w, 0.03, 0.05, barMat, 0.5); hz2.position.set(0, h * 0.78, 0.062); g.add(hz2);
      const hz3 = G.box(w, 0.03, 0.05, barMat, 0.5); hz3.position.set(0, h * 0.22, 0.062); g.add(hz3);
    }
    if (opts.awning) {
      const aw = G.box(w + 1.0, 0.06, 0.7, m.metal, 0.7);
      aw.position.set(0, h + 0.25, 0.3);
      aw.rotation.x = rad(-8);
      g.add(aw);
    }
    return G.soft(g);
  };

  /** 带门洞的墙（用于可进入的建筑） */
  G.wallWithDoor = function (w, h, thickness, doorW, doorH, mat, tile) {
    const g = new THREE.Group();
    const side = (w - doorW) / 2;
    if (side > 0.05) {
      const l = G.box(side, h, thickness, mat, tile);
      l.position.set(-(doorW / 2 + side / 2), h / 2, 0);
      const r = G.box(side, h, thickness, mat, tile);
      r.position.set(doorW / 2 + side / 2, h / 2, 0);
      g.add(l, r);
    }
    const top = G.box(doorW, h - doorH, thickness, mat, tile);
    top.position.set(0, doorH + (h - doorH) / 2, 0);
    g.add(top);
    return g;
  };

  /* =========================================================
   *  房屋
   * ========================================================= */
  /**
   * 民居主体
   * opts: { style:'old'|'brick'|'two'|'shop', w,d,h, wallMat, roofAngle,
   *         doorW, spring, open(可进入), facing }
   */
  G.house = function (opts = {}) {
    const m = M();
    const style = opts.style || 'brick';
    const w = opts.w || 10.5;
    const d = opts.d || 6.6;
    const stories = style === 'two' ? 2 : 1;
    const storyH = opts.storyH || (style === 'two' ? 3.3 : 3.15);
    const H = storyH * stories;
    const wallMat = opts.wallMat || (style === 'old' ? m.mud : style === 'two' ? m.white : (opts.grey ? m.brickGrey : m.brickRed));
    const tileSize = style === 'old' ? 1.3 : 1.7;

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    // 墙体
    if (style === 'two') {
      for (let s = 0; s < stories; s++) {
        const b = G.box(w, storyH, d, wallMat, tileSize);
        b.position.y = storyH * s + storyH / 2;
        body.add(b);
        // 楼层分隔线（腰线）
        const line = G.box(w + 0.06, 0.14, d + 0.06, m.white, 1.2);
        line.position.y = storyH * (s + 1);
        body.add(line);
      }
    } else {
      const b = G.box(w, H, d, wallMat, tileSize);
      b.position.y = H / 2;
      body.add(b);
      // 墙裙
      if (style !== 'old') {
        const skirt = G.box(w + 0.07, 0.9, d + 0.07, m.cement, 1.4);
        skirt.position.y = 0.45;
        body.add(skirt);
      }
      // 转角砖柱（略微出挑，破掉"薄板盒子"感）
      const corMat = (opts.grey ? m.brickGrey : m.brickRed);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const c = G.box(0.26, H, 0.26, corMat, tileSize);
          c.position.set(sx * (w / 2 - 0.03), H / 2, sz * (d / 2 - 0.03));
          body.add(c);
        }
      }
    }
    // 地基
    const base = G.box(w + 0.5, 0.35, d + 0.5, m.stone, 1.2);
    base.position.y = 0.05;
    body.add(base);

    // 门
    const doorW = opts.doorW || 1.5;
    const doorH = Math.min(2.1, storyH - 0.5);
    const door = G.door(doorW, doorH, { spring: opts.spring, mat: style === 'two' ? m.metal : m.door, studs: style !== 'two' });
    door.position.set(opts.doorX || 0, 0.2, d / 2 + 0.02);
    body.add(door);
    // 门前台阶
    const steps = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = G.box(doorW + 1.4 + i * 0.35, 0.16, 0.32 + i * 0.16, m.cement, 1.0);
      s.position.set(0, 0.08 + i * 0.16, 0.2 + i * 0.2);
      steps.add(s);
    }
    steps.position.set(opts.doorX || 0, 0.02, d / 2 + 0.3);
    G.soft(steps);
    body.add(steps);

    // 窗
    const winW = 1.35, winH = 1.4;
    const winYs = style === 'two' ? [1.7, storyH + 1.6] : [1.75];
    for (const wy of winYs) {
      const xs = w > 9 ? [-w * 0.3, w * 0.3] : [-w * 0.26, w * 0.26];
      for (const x of xs) {
        if (Math.abs(x - (opts.doorX || 0)) < doorW * 0.5 + 0.3 && wy < 2.4) continue;
        const win = G.window(winW, winH, {
          bars: style === 'old' || opts.bars, awning: opts.awning,
          lit: Math.random() < 0.62,
        });
        win.position.set(x, wy, d / 2 + 0.03);
        body.add(win);
      }
      // 侧面窗
      for (const sx of [-1, 1]) {
        const win = G.window(1.0, 1.1, { bars: true, lit: Math.random() < 0.5 });
        win.rotation.y = sx * Math.PI / 2;
        win.position.set(sx * (w / 2 + 0.03), wy + 0.1, -d * 0.15);
        body.add(win);
      }
    }

    // 屋顶
    let roof;
    if (style === 'two') {
      roof = G.flatRoof(w, d, H, { railing: true });
      root.add(roof);
      // 屋顶楼梯间
      const stairRoom = G.box(2.6, 2.6, 2.6, wallMat, 1.2);
      stairRoom.position.set(w * 0.28, H + 1.5, -d * 0.15);
      root.add(stairRoom);
      const stairRoof = G.box(3.0, 0.18, 3.0, m.concrete, 1.2);
      stairRoof.position.set(w * 0.28, H + 2.9, -d * 0.15);
      root.add(stairRoof);
      // 太阳能热水器
      if (opts.solar !== false) {
        const s = new THREE.Group();
        const tank = G.cyl(0.32, 0.32, 1.9, m.steel, 12);
        tank.rotation.z = Math.PI / 2; tank.position.set(0, 1.0, -0.7);
        s.add(tank);
        const panel = G.box(1.9, 0.09, 1.5, m.solar, 0.6);
        panel.position.set(0, 0.85, 0.1); panel.rotation.x = rad(-32);
        s.add(panel);
        for (const sx of [-1, 1]) {
          const leg = G.box(0.07, 1.0, 0.07, m.steel, 0.5);
          leg.position.set(sx * 0.85, 0.5, 0.5); s.add(leg);
        }
        s.position.set(-w * 0.2, H + 0.2, -d * 0.2);
        root.add(s);
      }
      // 卫星锅
      if (opts.dish) {
        const dish = G.cyl(0.42, 0.42, 0.07, m.steel, 16);
        dish.rotation.x = rad(70); dish.rotation.z = rad(20);
        dish.position.set(w * 0.42, H + 1.4, -d * 0.2);
        root.add(dish);
      }
    } else {
      const roofAngle = opts.roofAngle || (style === 'old' ? rad(24) : rad(27));
      roof = G.gableRoof(w, d, H, {
        angle: roofAngle, mat: opts.roofMat || m.tile, wallMat,
        ridgeMat: m.tileDark, eave: style === 'old' ? 0.5 : 0.6, tile: tileSize,
      });
      root.add(roof);
      // 烟囱（灶屋排烟）
      if (opts.chimney) {
        const ch = G.box(0.5, 1.6, 0.5, m.brickRed, 0.8);
        ch.position.set(w * 0.3, H + (d / 2) * Math.tan(roofAngle) + 0.6, -d * 0.1);
        root.add(ch);
        const cap = G.box(0.7, 0.14, 0.7, m.cement, 0.8);
        cap.position.set(w * 0.3, H + (d / 2) * Math.tan(roofAngle) + 1.42, -d * 0.1);
        root.add(cap);
      }
    }

    // 檐下晾晒（玉米/辣椒串）
    if (opts.hang) {
      const hang = new THREE.Group();
      const n = 3 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const c = G.cyl(0.09, 0.13, 0.95, i % 2 ? m.yellow : m.red, 8);
        c.position.set(-w * 0.3 + i * (w * 0.6 / Math.max(1, n - 1)), H - 0.55, d / 2 + 0.28);
        hang.add(c);
      }
      root.add(hang);
    }

    root.userData.dims = { w, d, H, stories };
    return root;
  };

  /* =========================================================
   *  院墙 / 门楼 / 院落
   * ========================================================= */
  /** 院墙：沿 X 或 Z 方向 */
  G.wall = function (len, opts = {}) {
    const m = M();
    const h = opts.h || 2.05;
    const t = opts.t || 0.26;
    const g = new THREE.Group();
    const mat = opts.mat || m.brickRed;
    const body = G.box(len, h, t, mat, 1.3);
    body.position.y = h / 2;
    g.add(body);
    // 瓦压顶
    const cap = G.box(len, 0.16, t + 0.24, m.tileDark, 1.1);
    cap.position.y = h + 0.08;
    g.add(cap);
    const capTop = G.box(len, 0.12, t + 0.08, m.tileDark, 1.1);
    capTop.position.y = h + 0.22;
    g.add(capTop);
    // 墙垛
    const n = Math.max(1, Math.round(len / 6));
    for (let i = 0; i <= n; i++) {
      const px = -len / 2 + (i / n) * len;
      const p = G.box(0.34, h + 0.3, t + 0.3, mat, 1.1);
      p.position.set(px, (h + 0.3) / 2, 0);
      g.add(p);
      const pc = G.box(0.5, 0.14, t + 0.42, m.tileDark, 1.0);
      pc.position.set(px, h + 0.36, 0);
      G.soft(pc);
      g.add(pc);
    }
    return g;
  };

  /** 门楼（院门） */
  G.gateHouse = function (opts = {}) {
    const m = M();
    const g = new THREE.Group();
    const w = opts.w || 3.2;
    const h = 2.5;
    const wallMat = opts.wallMat || m.brickRed;
    // 两柱
    for (const sx of [-1, 1]) {
      const p = G.box(0.66, h + 0.2, 0.72, wallMat, 1.0);
      p.position.set(sx * (w / 2 - 0.33), (h + 0.2) / 2, 0);
      g.add(p);
    }
    // 门楣
    const lintel = G.box(w, 0.5, 0.7, wallMat, 1.0);
    lintel.position.set(0, h + 0.25, 0);
    g.add(lintel);
    // 小坡顶
    const roof = G.gableRoof(w + 0.8, 1.5, h + 0.5, { angle: rad(22), mat: m.tile, wallMat, eave: 0.45, tile: 1.5 });
    roof.position.z = 0;
    g.add(roof);
    // 双扇木门
    const leafW = (w - 1.32) / 2;
    for (const sx of [-1, 1]) {
      const leaf = G.box(leafW, 2.2, 0.1, m.doorRed, 1.0);
      leaf.position.set(sx * (leafW / 2 + 0.03), 1.1, 0);
      g.add(leaf);
      // 铺首
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), m.yellow);
      ring.position.set(sx * 0.28, 1.2, 0.08);
      g.add(ring);
    }
    // 门匾
    const plaque = G.box(w - 1.0, 0.5, 0.08, m.woodDark, 0.8);
    plaque.position.set(0, h + 0.3, 0.4);
    g.add(plaque);
    if (opts.spring) {
      for (const sx of [-1, 1]) {
        const c = G.plane(0.34, 2.4, m.clothRed, 1, 1);
        c.position.set(sx * (w / 2 - 0.75), 1.35, 0.07);
        g.add(c);
      }
    }
    // 两侧矮墙由调用者拼接
    return g;
  };

  /* =========================================================
   *  附属房 & 院内设施
   * ========================================================= */
  G.outbuilding = function (kind, opts = {}) {
    const m = M();
    const g = new THREE.Group();
    if (kind === 'kitchen') {
      // 灶屋
      const w = 3.6, d = 3.2, h = 2.5;
      const body = G.box(w, h, d, m.brickRed, 1.2);
      body.position.y = h / 2; g.add(body);
      const roof = G.gableRoof(w, d, h, { angle: rad(24), mat: m.tile, wallMat: m.brickRed, eave: 0.4, tile: 1.4 });
      g.add(roof);
      const door = G.door(1.1, 1.9, { studs: false });
      door.position.set(0, 0.1, d / 2 + 0.02); g.add(door);
      // 烟囱
      const ch = G.box(0.42, 2.2, 0.42, m.brickRed, 0.8);
      ch.position.set(-w * 0.3, h + 1.0, -d * 0.2); g.add(ch);
      // 柴堆
      const wood = G.cyl(0.5, 0.55, 1.3, m.wood, 10);
      wood.rotation.z = Math.PI / 2;
      wood.position.set(w / 2 + 0.8, 0.65, 0.6);
      G.soft(wood);
      g.add(wood);
    } else if (kind === 'pigpen') {
      // 猪圈
      const w = 3.4, d = 3.0, h = 1.25;
      for (const sz of [-1, 1]) {
        const wall = G.box(w, h, 0.24, m.cement, 1.0);
        wall.position.set(0, h / 2, sz * d / 2); g.add(wall);
      }
      for (const sx of [-1, 1]) {
        const wall = G.box(0.24, h, d, m.cement, 1.0);
        wall.position.set(sx * w / 2, h / 2, 0); g.add(wall);
      }
      const shed = G.box(w * 0.55, 1.6, d * 0.6, m.tileBlue, 1.0);
      shed.position.set(-w * 0.2, 1.6, -d * 0.2); g.add(shed);
      if (MT.props) {
        const pig = MT.props.pig();
        pig.position.set(w * 0.08, 0, 0); pig.rotation.y = rad(24);
        g.add(pig);
      }
      const shedRoof = G.box(w * 0.62, 0.12, d * 0.7, m.tileDark, 1.2);
      shedRoof.position.set(-w * 0.2, 2.45, -d * 0.2); g.add(shedRoof);
      G.soft(shed); G.soft(shedRoof);
    } else if (kind === 'chicken') {
      // 鸡舍
      const w = 1.8, d = 1.4, h = 1.1;
      const body = G.box(w, h, d, m.wood, 0.9);
      body.position.y = h / 2; g.add(body);
      const roof = G.box(w + 0.3, 0.12, d + 0.3, m.tileBlue, 1.0);
      roof.position.y = h + 0.06; roof.rotation.x = rad(6); g.add(roof);
      const ramp = G.box(0.7, 0.06, 0.9, m.wood, 0.8);
      ramp.position.set(0, 0.3, d / 2 + 0.4); ramp.rotation.x = rad(22); g.add(ramp);
      G.soft(ramp); G.soft(roof);
    } else if (kind === 'toilet') {
      // 旱厕（农村常见的简易厕所）
      const w = 1.6, d = 1.6, h = 2.0;
      const body = G.box(w, h, d, m.brickRed, 1.0);
      body.position.y = h / 2; g.add(body);
      const roof = G.gableRoof(w + 0.3, d + 0.3, h, { angle: rad(20), mat: m.tileBlue, wallMat: m.brickRed, eave: 0.3, tile: 1.2 });
      g.add(roof);
    } else if (kind === 'barn') {
      // 仓房 / 农具房
      const w = 5.0, d = 4.0, h = 2.9;
      const body = G.box(w, h, d, m.brickGrey, 1.4);
      body.position.y = h / 2; g.add(body);
      const roof = G.gableRoof(w, d, h, { angle: rad(22), mat: m.tile, wallMat: m.brickGrey, eave: 0.5, tile: 1.6 });
      g.add(roof);
      const door = G.door(1.6, 2.2, { mat: m.wood, studs: false });
      door.position.set(0, 0.1, d / 2 + 0.02); g.add(door);
    }
    return g;
  };

  /* =========================================================
   *  院落（民居 + 院墙 + 门楼 + 附属房）
   * ========================================================= */
  /**
   * opts: { style, w,d, wallType:'front'|'full'|'none', gateSide:-1|1,
   *         spring, outbuildings:[...], yard:true, trees:false }
   * 返回 { group, houseY }
   */
  G.courtyard = function (rng, opts = {}) {
    const m = M();
    const root = new THREE.Group();
    const house = G.house(opts);
    const hw = house.userData.dims.w, hd = house.userData.dims.d;
    const yardD = opts.yardDepth === undefined ? 7.5 : opts.yardDepth;
    // 正房靠北，院子朝南
    house.position.set(0, 0, -(yardD / 2));
    root.add(house);

    const yardW = Math.max(hw + 4, 12);
    const yMin = -yardD / 2 - hd / 2 - 0.2;
    const yMax = yardD / 2 + 0.2;
    const wallType = opts.wallType || 'front';

    const mkWall = (len, x, z, ry) => {
      const wl = G.wall(len, { mat: opts.wallMat || m.brickRed });
      wl.position.set(x, 0, z); wl.rotation.y = ry;
      root.add(wl);
      return wl;
    };
    const halfYard = (yMax - yMin) / 2;
    if (wallType !== 'none') {
      // 东、西院墙
      mkWall(halfYard * 2, yardW / 2, (yMin + yMax) / 2, Math.PI / 2);
      mkWall(halfYard * 2, -yardW / 2, (yMin + yMax) / 2, Math.PI / 2);
      if (wallType === 'full') {
        mkWall(yardW, 0, yMax, 0);
      } else {
        // 前院墙 + 门楼（留出大门位置）
        const gateSide = opts.gateSide || 1;
        const gateX = gateSide * (yardW / 2 - 2.2);
        const gHalf = 1.7;   // 门洞半宽（与门楼尺寸匹配）
        // 左段墙：-yardW/2 .. gateX-gHalf（缺口对齐门楼位置）
        const w1 = (gateX - gHalf) - (-yardW / 2);
        if (w1 > 0.05) {
          const seg1 = G.wall(w1, { mat: opts.wallMat || m.brickRed });
          seg1.position.set((-yardW / 2 + (gateX - gHalf)) / 2, 0, yMax);
          root.add(seg1);
        }
        // 右段墙：gateX+gHalf .. yardW/2
        const w2 = (yardW / 2) - (gateX + gHalf);
        if (w2 > 0.05) {
          const seg2 = G.wall(w2, { mat: opts.wallMat || m.brickRed });
          seg2.position.set(((gateX + gHalf) + yardW / 2) / 2, 0, yMax);
          root.add(seg2);
        }
        const gate = G.gateHouse({ spring: opts.spring, wallMat: opts.wallMat || m.brickRed });
        gate.position.set(gateX, 0, yMax);
        root.add(gate);
        root.userData.gateX = gateX;
        root.userData.yardZ = yMax;
      }
    }
    // 院内地面
    const floor = G.plane(yardW - 0.6, halfYard * 2 - 0.3, MT.mat.cement(1, 1), (yardW) / 2, halfYard);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.045, (yMin + yMax) / 2);
    root.add(floor);
    // 门前小径
    const path = G.plane(1.4, 4.0, MT.mat.cement(1, 1), 1, 2);
    path.rotation.x = -Math.PI / 2;
    path.position.set(root.userData.gateX || 0, 0.05, yMax - 2.2);
    root.add(path);

    // 附属房（兼容 village.js 使用的 `outs` 与文档里的 `outbuildings`）
    const outs = opts.outs || opts.outbuildings || [];
    const spots = [
      { x: yardW / 2 - 2.4, z: (yMin + yMax) / 2 + 1.0, ry: -Math.PI / 2 },
      { x: -(yardW / 2 - 2.4), z: (yMin + yMax) / 2 + 1.0, ry: Math.PI / 2 },
      { x: -(yardW / 2 - 2.6), z: yMin + 2.4, ry: 0 },
    ];
    outs.forEach((kind, i) => {
      const s = spots[i % spots.length];
      const ob = G.outbuilding(kind);
      ob.position.set(s.x, 0, s.z);
      ob.rotation.y = s.ry;
      root.add(ob);
    });

    // 院内小物件
    if (opts.yard !== false) {
      const r = rng || new MT.RNG(7);
      const props = MT.props;
      if (props) {
        // 压水井 / 石磨 / 水缸
        if (r.chance(0.75)) {
          const pump = props.handPump();
          pump.position.set(-(yardW / 2 - 1.6), 0, yMax - 2.6);
          root.add(pump);
        }
        if (r.chance(0.5)) {
          const mill = props.stoneMill();
          mill.position.set(yardW / 2 - 1.6, 0, yMax - 3.2);
          root.add(mill);
        }
        const jars = 1 + (r.next() * 3 | 0);
        for (let i = 0; i < jars; i++) {
          const jar = props.jar(r.range(0.28, 0.42), r.range(0.7, 1.1), r.chance(0.4) ? 0x4a3b2c : 0x6b5a3a);
          jar.position.set(-(yardW / 2 - 0.9), 0, yMin + 1.2 + i * 0.9);
          root.add(jar);
        }
        if (r.chance(0.7)) {
          const line = props.laundryLine(r.range(3.2, 4.6));
          line.position.set(-1.5, 2.4, yMax - 1.3);
          root.add(line);
        }
        if (r.chance(0.55)) {
          const rack = props.cornRack();
          rack.position.set(yardW / 2 - 1.4, 0, yMin + 1.4);
          root.add(rack);
        }
        if (r.chance(0.35)) {
          const p = props.bicycle();
          p.position.set(-(yardW / 2 - 1.5), 0, yMax - 1.2);
          p.rotation.y = r.range(-1, 1);
          root.add(p);
        }
        if (r.chance(0.4)) {
          const cart = props.handCart();
          cart.position.set(yardW / 2 - 1.9, 0, yMax - 1.4);
          cart.rotation.y = r.range(-0.4, 0.4) + Math.PI;
          root.add(cart);
        }
        if (r.chance(0.5)) {
          const pile = props.woodpile(r.range(1.6, 2.6));
          pile.position.set(-(yardW / 2 - 1.1), 0, (yMin + yMax) / 2 - 1.6);
          root.add(pile);
        }
        if (r.chance(0.6)) {
          const dog = props.dogHouse();
          dog.position.set(yardW / 2 - 1.3, 0, yMax - 4.2);
          root.add(dog);
        }
        // 散养的鸡
        if (r.chance(0.75)) {
          const n = 2 + ((r.next() * 3) | 0);
          for (let i = 0; i < n; i++) {
            const c = props.chicken(r);
            c.position.set(r.range(-yardW / 2 + 1.4, yardW / 2 - 1.4), 0.02, r.range(yMin + 1.4, yMax - 1.4));
            c.rotation.y = r.next() * Math.PI * 2;
            root.add(c);
          }
        }
        if (r.chance(0.3)) {
          const dog = props.dog();
          dog.position.set(-(yardW / 2 - 1.6), 0, yMin + 3.6);
          dog.rotation.y = r.next() * Math.PI * 2;
          root.add(dog);
        }
      }
    }
    root.userData.yardDims = { yardW, yMin, yMax, halfYard };
    return root;
  };

  /* =========================================================
   *  可进入的室内空间
   * ========================================================= */
  /**
   * 返回一个可进入的房间（东/北/西三面墙 + 正面带门洞 + 屋顶）
   * opts: { w,d,h, wallMat, roof:'gable'|'flat', floorMat }
   */
  G.openRoom = function (opts = {}) {
    const m = M();
    const w = opts.w || 9, d = opts.d || 6, h = opts.h || 3.2;
    const wallMat = opts.wallMat || m.brickGrey;
    const t = 0.3;
    const g = new THREE.Group();
    const doorW = opts.doorW || 1.6, doorH = 2.2;

    // 北墙（实体）
    const back = G.box(w, h, t, wallMat, 1.6);
    back.position.set(0, h / 2, -d / 2);
    g.add(back);
    // 东西墙
    for (const sx of [-1, 1]) {
      const side = G.box(t, h, d, wallMat, 1.6);
      side.position.set(sx * w / 2, h / 2, 0);
      g.add(side);
    }
    // 南墙带门洞
    const front = G.wallWithDoor(w, h, t, doorW, doorH, wallMat, 1.6);
    front.position.set(0, 0, d / 2);
    g.add(front);
    // 地面
    const floor = G.box(w - 0.6, 0.12, d - 0.6, opts.floorMat || m.cement, 1.6);
    floor.position.set(0, 0.06, 0);
    g.add(floor);
    // 屋顶（roof:'none' 时不加，交给调用方自行叠加，避免双层屋顶 z-fighting）
    if (opts.roof === 'none') {
      // 无屋顶
    } else if (opts.roof === 'flat') {
      const roof = G.flatRoof(w, d, h, {});
      g.add(roof);
    } else {
      const roof = G.gableRoof(w, d, h, { angle: rad(26), mat: opts.roofMat || m.tile, wallMat, eave: 0.55, tile: 1.7 });
      g.add(roof);
    }
    // 门框（供视觉定位）
    const frame = G.box(doorW + 0.3, doorH + 0.2, 0.16, m.wood, 1.0);
    frame.position.set(0, doorH / 2 + 0.1, d / 2 - 0.1);
    g.add(frame);
    const lintel = G.box(doorW + 0.6, 0.36, 0.2, m.woodDark, 0.8);
    lintel.position.set(0, doorH + 0.35, d / 2 - 0.12);
    g.add(lintel);
    // 屋梁
    for (let i = -1; i <= 1; i++) {
      const beam = G.box(w - 0.4, 0.24, 0.24, m.wood, 1.0);
      beam.position.set(0, h - 0.35, i * (d / 3.4));
      G.soft(beam);
      g.add(beam);
    }
    G.soft(frame); G.soft(lintel);
    g.userData.roomDims = { w, d, h };
    return g;
  };

  MT.Build = G;
})();
