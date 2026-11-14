/* =============================================================
 *  MyTown · 我的家乡 3D  —  小物件 / 农具 / 家禽家畜
 *  props.js : 压水井、石磨、水缸、晾衣绳、玉米架、自行车、板车、
 *             三轮车、拖拉机、石磙、草垛、电线杆、太阳能路灯、
 *             鸡、鸭、狗、猪、水牛、羊、猫
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad } = MT.util;

  const P = {};

  function M() { return MT.M(); }
  function B() { return MT.Build; }
  function rngOf(o, seed) { return (o && o.rng) || new MT.RNG(seed || 3); }

  /** 标记为小物件（不参与自动碰撞） */
  function prop(obj) {
    obj.traverse((o) => { o.userData.prop = true; });
    return obj;
  }
  /** 注册逐帧动画 */
  MT.animated = MT.animated || [];
  function anim(obj, fn) {
    obj.userData.anim = fn;
    MT.animated.push(obj);
    return obj;
  }
  P.prop = prop;
  P.anim = anim;

  P.g = function (x, y, z, ry) {
    const g = new THREE.Group();
    if (x !== undefined) g.position.set(x, y, z);
    if (ry) g.rotation.y = ry;
    return g;
  };

  /* =========================================================
   *  院内 / 田间小物件
   * ========================================================= */
  P.handPump = function () { // 压水井
    const m = M(), g = P.g();
    // 水泥井台
    const base = B().cyl(0.62, 0.72, 0.22, m.cement, 16); base.position.y = 0.11; g.add(base);
    const apron = B().cyl(0.5, 0.56, 0.06, m.concrete, 16); apron.position.y = 0.235; g.add(apron);
    // 井管 + 泵头
    const pipe = B().cyl(0.075, 0.085, 1.05, m.steel, 12); pipe.position.y = 0.72; g.add(pipe);
    const head = B().cyl(0.14, 0.14, 0.34, m.metalDark, 14); head.position.y = 1.32; g.add(head);
    const cap = B().cyl(0.15, 0.14, 0.06, m.steel, 14); cap.position.y = 1.52; g.add(cap);
    // 出水嘴（弯）
    const spout = B().cyl(0.05, 0.05, 0.34, m.steel, 10); spout.rotation.x = rad(78); spout.position.set(0.22, 1.28, 0.16); g.add(spout);
    const spoutTip = B().cyl(0.055, 0.045, 0.08, m.steel, 10); spoutTip.rotation.x = rad(78); spoutTip.position.set(0.28, 1.22, 0.26); g.add(spoutTip);
    // 压杆 + 木柄 + 支点
    const arm = B().box(0.05, 0.05, 0.9, m.metal, 0.5); arm.position.set(0, 1.56, 0.34); arm.rotation.x = rad(-10); g.add(arm);
    const grip = B().cyl(0.035, 0.035, 0.34, m.wood, 8); grip.rotation.x = rad(90); grip.position.set(0, 1.62, 0.78); g.add(grip);
    const pivot = B().cyl(0.045, 0.045, 0.24, m.metalDark, 10); pivot.rotation.z = rad(90); pivot.position.set(0, 1.42, 0.02); g.add(pivot);
    // 水槽
    const trough = B().box(1.5, 0.36, 0.62, m.cement, 0.9); trough.position.set(1.0, 0.18, 0); g.add(trough);
    const tIn = B().box(1.34, 0.02, 0.46, m.cement, 0.5); tIn.position.set(1.0, 0.3, 0); g.add(tIn);
    return prop(g);
  };

  P.stoneMill = function () { // 石磨：木盘托 + 上下石扇（带凿齿、磨眼）+ 磨棍 + 面堆和刷子
    const m = M(), g = P.g();
    const wood = m.wood;
    const stoneTex = MT.texture.cloneTex('concrete', 2, 2);
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x9d988c, roughness: 1.0 });
    const stoneDark = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x87837a, roughness: 1.0 });
    // 木架：四条腿 + 交叉撑
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = B().cyl(0.05, 0.062, 0.42, wood, 8);
      leg.position.set(sx * 0.62, 0.21, sz * 0.62); g.add(leg);
    }
    for (const sz of [-1, 1]) {
      const brace = B().box(0.05, 0.05, 1.2, m.woodDark, 0.4);
      brace.position.set(0, 0.2, sz * 0.62); g.add(brace);
    }
    // 磨盘（接面）：圆木盘 + 一圈盘沿（面粉不会撒出去）
    const tray = B().cyl(0.88, 0.88, 0.07, wood, 20); tray.position.y = 0.42; tray.receiveShadow = true; g.add(tray);
    const trayRim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.045, 6, 24), m.woodDark);
    trayRim.rotation.x = Math.PI / 2; trayRim.position.y = 0.48; g.add(trayRim);
    const trayEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 20, 1, true), m.woodDark);
    trayEdge.position.y = 0.45; g.add(trayEdge);
    // 下扇（固定）
    const lower = B().cyl(0.6, 0.6, 0.16, stoneMat, 22);
    lower.position.y = 0.53; lower.castShadow = true; lower.receiveShadow = true; g.add(lower);
    // 上扇（转动，比下扇略小、略高）
    const upper = B().cyl(0.545, 0.56, 0.2, stoneMat, 22);
    upper.position.y = 0.71; upper.castShadow = true; g.add(upper);
    // 上扇表面：放射状的凿齿（磨齿一组组斜着排）
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const groove = B().box(0.34, 0.016, 0.026, stoneDark, 0.3);
      groove.position.set(Math.cos(a) * 0.28, 0.815, Math.sin(a) * 0.28);
      groove.rotation.y = -a + 0.32;      // 斜齿，不是正十字
      g.add(groove);
    }
    // 上下扇之间的一圈磨缝 + 磨眼 + 漏斗
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 5, 22), stoneDark);
    seam.rotation.x = Math.PI / 2; seam.position.y = 0.62; g.add(seam);
    const eye = B().cyl(0.045, 0.05, 0.24, stoneDark, 10);
    eye.position.set(0.19, 0.8, 0); g.add(eye);
    const funnel = B().cyl(0.17, 0.055, 0.2, wood, 12);
    funnel.position.set(0.19, 0.94, 0); g.add(funnel);
    // 磨棍：插在上扇边缘的方孔里，末端有木握把
    const stick = B().cyl(0.032, 0.04, 0.86, wood, 8);
    stick.position.set(0.66, 0.92, 0); stick.rotation.z = rad(72); g.add(stick);
    const pin = B().box(0.05, 0.1, 0.05, m.woodDark, 0.3);
    pin.position.set(0.53, 0.83, 0); pin.rotation.z = rad(12); g.add(pin);
    const handle = B().cyl(0.026, 0.026, 0.24, wood, 8);
    handle.position.set(1.02, 1.06, 0); handle.rotation.x = rad(90); g.add(handle);
    // 盘上的一小堆面粉 + 刷子 + 靠在架上的罗（筛面箩）
    const flour = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      MT.mat.solid(0xe8e2d2, { roughness: 1 }));
    flour.scale.set(1.15, 0.28, 1); flour.position.set(-0.45, 0.47, 0.42); g.add(flour);
    const brush = P.g();
    const bh = B().cyl(0.02, 0.024, 0.26, m.woodDark, 6); bh.position.y = 0.13; brush.add(bh);
    const bristle = B().box(0.09, 0.05, 0.05, MT.mat.solid(0xc9ad74, { roughness: 1 }), 0.3);
    bristle.position.y = 0.02; brush.add(bristle);
    brush.position.set(0.42, 0.47, -0.52); brush.rotation.z = rad(78); brush.rotation.y = rad(-30);
    g.add(brush);
    const sifter = B().cyl(0.3, 0.24, 0.14, m.straw, 12);
    sifter.position.set(-0.86, 0.53, -0.5); sifter.rotation.z = rad(-22);
    g.add(sifter);
    return prop(g);
  };

  P.jar = function (r, h, color) { // 缸 / 坛子：鼓肚、收口、厚唇、缸脚，水缸里还有水和瓢
    const m = M(), g = P.g();
    const R = r || 0.36, H = h || 0.8;
    const isWater = Math.random() < 0.45;
    const glaze = new THREE.MeshStandardMaterial({
      color: color || (isWater ? 0x4a3b2c : 0x5c4632),
      roughness: 0.35, metalness: 0.06,
    });
    const glazeD = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.45 });
    // 缸身：鼓肚（用两段圆台拼出弧线）
    const bellyLo = B().cyl(R, R * 0.62, H * 0.45, glaze, 18);
    bellyLo.position.y = H * 0.225; bellyLo.castShadow = true; g.add(bellyLo);
    const bellyHi = B().cyl(R * 0.78, R, H * 0.45, glaze, 18);
    bellyHi.position.y = H * 0.675; bellyHi.castShadow = true; g.add(bellyHi);
    const bellyMax = new THREE.Mesh(new THREE.TorusGeometry(R, H * 0.1, 6, 20), glaze);
    bellyMax.rotation.x = Math.PI / 2; bellyMax.position.y = H * 0.45; g.add(bellyMax);
    // 缸脚（底圈）
    const foot = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, H * 0.035, 5, 16), glazeD);
    foot.rotation.x = Math.PI / 2; foot.position.y = H * 0.02; g.add(foot);
    // 缸口：厚唇
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.79, H * 0.055, 7, 20), glazeD);
    rim.rotation.x = Math.PI / 2; rim.position.y = H * 0.98; g.add(rim);
    // 缸里：水或粮
    if (isWater) {
      const water = new THREE.Mesh(new THREE.CircleGeometry(R * 0.72, 16), MT.mat.water(0x2f4a4a, 0.5));
      water.rotation.x = -Math.PI / 2; water.position.y = H * 0.82; g.add(water);
      // 葫芦瓢：浮在水面 / 挂在缸沿
      const gourd = P.g();
      const gb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 9),
        MT.mat.solid(0xd8b878, { roughness: 0.7 }));
      gb.scale.set(1, 0.8, 1); gourd.add(gb);
      const gneck = B().cyl(0.03, 0.045, 0.07, MT.mat.solid(0xc9a464, { roughness: 0.7 }), 8);
      gneck.position.set(0.09, 0.05, 0); gourd.add(gneck);
      gourd.position.set(R * 0.35, H * 0.86, -R * 0.2);
      gourd.rotation.set(rad(14), rad(30), rad(-10));
      g.add(gourd);
    } else if (Math.random() < 0.5) {
      const grainTop = new THREE.Mesh(new THREE.CircleGeometry(R * 0.72, 14),
        MT.mat.solid(0xd0b264, { roughness: 1 }));
      grainTop.rotation.x = -Math.PI / 2; grainTop.position.y = H * 0.84; g.add(grainTop);
    }
    // 盖：木盖带提手 / 或者一块压缸石
    const rnd = Math.random();
    if (rnd < 0.35) {
      const lid = B().cyl(R * 0.85, R * 0.82, 0.05, m.wood, 16);
      lid.position.y = H + 0.03; g.add(lid);
      const knob = B().cyl(0.035, 0.045, 0.06, m.woodDark, 8);
      knob.position.y = H + 0.08; g.add(knob);
    } else if (rnd < 0.6) {
      const stone = B().box(R * 1.1, 0.09, R * 1.1, MT.mat.solid(0x8d8a80, { roughness: 1 }), 0.4);
      stone.position.y = H + 0.03; stone.rotation.y = rad(12); g.add(stone);
    }
    // 缸根的苔痕 / 水渍
    const stain = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.75, R * 0.8, H * 0.16, 16, 1, true),
      MT.mat.solid(0x5c5a4a, { roughness: 1 }));
    stain.position.y = H * 0.09; g.add(stain);
    return prop(g);
  };

  P.laundryLine = function (len) { // 晾衣绳：两根木桩 + 下垂的尼龙绳 + 带褶的衣服和床单
    const m = M(), g = P.g();
    const L = len || 4;
    // 木桩（顶上钉了个钉子）
    for (const sx of [-1, 1]) {
      const post = B().box(0.09, 2.3, 0.09, m.wood, 0.6);
      post.position.set(sx * L / 2, 1.15, 0); post.castShadow = true; g.add(post);
      const nail = B().cyl(0.012, 0.012, 0.06, m.metalDark, 6);
      nail.rotation.z = Math.PI / 2; nail.position.set(sx * (L / 2 - 0.06), 2.12, 0); g.add(nail);
      const brace = B().box(0.07, 0.07, 0.5, m.woodDark, 0.4);
      brace.position.set(sx * L / 2, 0.05, 0.2); g.add(brace);
    }
    // 绳子：中间下垂（用曲线管做出来，不是一根直棍）
    const sag = Math.max(0.12, L * 0.05);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-L / 2, 2.12, 0),
      new THREE.Vector3(-L / 4, 2.12 - sag * 0.6, 0.01),
      new THREE.Vector3(0, 2.12 - sag, 0.02),
      new THREE.Vector3(L / 4, 2.12 - sag * 0.6, 0.01),
      new THREE.Vector3(L / 2, 2.12, 0),
    ]);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.013, 5, false),
      MT.mat.solid(0x9a8f7a, { roughness: 0.9 }));
    rope.castShadow = true; g.add(rope);
    const ropeY = (t) => 2.12 - Math.sin(Math.PI * t) * sag;   // 绳子在某处的高度
    // 衣服：带褶的布片（布面顶点做正弦起伏），顶上夹两个木夹子
    const clothMats = [
      MT.mat.cloth(0xd8d2c4, 2, 2), MT.mat.cloth(0x6f8fb0, 2, 2),
      MT.mat.cloth(0xb0685c, 2, 2), MT.mat.cloth(0xa8b09a, 2, 2),
    ];
    const n = 3 + ((Math.random() * 3) | 0);
    let tCursor = 0.12;
    for (let i = 0; i < n; i++) {
      const big = i === 0;                                  // 第一件挂被单
      const w = big ? Math.min(1.5, L * 0.34) : 0.42 + Math.random() * 0.3;
      const h = big ? 1.5 : 0.62 + Math.random() * 0.55;
      const geo = new THREE.PlaneGeometry(w, h, 6, 5);
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k);
        // 布的褶皱：横向波浪 + 下摆略微收拢
        pos.setZ(k, Math.sin((x / w) * Math.PI * 2.2 + i) * 0.035
                  + Math.sin((y / h) * Math.PI * 1.4) * 0.02);
        if (y < -h * 0.3) pos.setX(k, x * 0.96);
      }
      geo.computeVertexNormals();
      const c = new THREE.Mesh(geo, clothMats[i % clothMats.length]);
      const t = tCursor + (w / L) * 0.5;
      tCursor += w / L + 0.06;
      c.position.set(-L / 2 + t * L, ropeY(t) - h / 2 + 0.02, 0.02);
      c.rotation.y = (Math.random() - 0.5) * 0.16;
      c.castShadow = true;
      g.add(c);
      // 木夹子
      for (const sx of [-1, 1]) {
        const peg = B().box(0.035, 0.09, 0.03, m.woodDark, 0.3);
        peg.position.set(-L / 2 + t * L + sx * w * 0.42, ropeY(t) + 0.01, 0.04);
        g.add(peg);
      }
    }
    // 挂在绳头的一条裤子（两条裤腿）
    const pantMat = MT.mat.cloth(0x4a5a70, 2, 2);
    for (const sx of [-1, 1]) {
      const leg = B().plane(0.2, 0.66, pantMat, 1, 1);
      leg.position.set(-L / 2 + L * 0.92 + sx * 0.11, ropeY(0.92) - 0.33, 0.02);
      leg.rotation.y = sx * rad(3);
      leg.castShadow = true;
      g.add(leg);
    }
    return prop(g);
  };

  P.cornRack = function () { // 玉米架（挂玉米棒）
    const m = M(), g = P.g();
    const h = 2.4, w = 2.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = B().box(0.1, h, 0.1, m.wood, 0.6);
      post.position.set(sx * w / 2, h / 2, sz * 0.35); g.add(post);
    }
    for (let i = 0; i < 4; i++) {
      const bar = B().box(w, 0.06, 0.06, m.wood, 0.6);
      bar.position.set(0, 0.55 + i * 0.55, -0.3 + (i % 2) * 0.6); g.add(bar);
      const bar2 = bar.clone(); bar2.position.z *= -1; bar2.position.z = -bar.position.z; g.add(bar2);
    }
    const corn = m.yellow;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const y = 0.45 + Math.random() * 1.7;
      const c = B().cyl(0.055, 0.06, 0.24, corn, 6);
      c.rotation.z = rad(78 + Math.random() * 20);
      c.position.set(-w / 2 + Math.random() * w, y, (Math.random() - 0.5) * 0.7);
      c.castShadow = false;
      g.add(c);
    }
    return prop(g);
  };

  P.woodpile = function (len, h) { // 柴火垛
    const m = M(), g = P.g();
    const L = len || 2.2, H = h || 1.2;
    let y = 0.09;
    let l = L;
    while (l > 0.4) {
      const logs = Math.max(2, Math.round(l / 0.18));
      for (let i = 0; i < logs; i++) {
        const log = B().cyl(0.09, 0.1, L * 0.98, m.wood, 7);
        log.rotation.z = Math.PI / 2;
        log.position.set((i / Math.max(1, logs - 1) - 0.5) * l * 0.9 * 0, 0, 0);
        log.position.x = (i / Math.max(1, logs - 1) - 0.5) * (l - 0.2);
        log.position.y = y + (Math.random() - 0.5) * 0.02;
        log.rotation.x = (Math.random() - 0.5) * 0.06;
        g.add(log);
      }
      y += 0.17; l *= 0.92;
      if (y > H) break;
    }
    return prop(g);
  };

  P.bicycle = function () { // 二八大杠
    const m = M(), g = P.g();
    const wheel = (x) => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 20), m.metalDark);
      w.position.set(x, 0.33, 0); w.castShadow = true;
      w.userData.spin = true;
      const spokes = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.004, 12), m.metal);
      spokes.rotation.x = Math.PI / 2; w.add(spokes);
      return w;
    };
    g.add(wheel(-0.52)); g.add(wheel(0.52));
    const frame = B().box(1.08, 0.045, 0.045, m.metalDark, 0.6);
    frame.position.set(0, 0.62, 0); frame.rotation.z = rad(-6); g.add(frame);
    const down = B().box(0.045, 0.5, 0.045, m.metalDark, 0.5);
    down.position.set(-0.2, 0.5, 0); down.rotation.z = rad(22); g.add(down);
    const seatTube = B().box(0.045, 0.42, 0.045, m.metalDark, 0.5);
    seatTube.position.set(0.28, 0.66, 0); seatTube.rotation.z = rad(-10); g.add(seatTube);
    const fork = B().box(0.04, 0.62, 0.04, m.metalDark, 0.5);
    fork.position.set(0.5, 0.62, 0); fork.rotation.z = rad(-16); g.add(fork);
    const seat = B().box(0.26, 0.07, 0.13, m.metalDark, 0.4);
    seat.position.set(0.3, 0.92, 0); g.add(seat);
    const bar = B().box(0.05, 0.05, 0.5, m.metalDark, 0.5);
    bar.position.set(0.56, 0.98, 0); g.add(bar);
    const basket = B().box(0.3, 0.22, 0.26, m.wood, 0.4);
    basket.position.set(0.62, 0.82, 0); g.add(basket);
    const stand = B().box(0.03, 0.36, 0.03, m.metalDark, 0.4);
    stand.position.set(-0.4, 0.18, 0.1); stand.rotation.z = rad(16); g.add(stand);
    return prop(g);
  };

  P.handCart = function () { // 板车
    const m = M(), g = P.g();
    // 车架大梁
    for (const sx of [-1, 1]) {
      const rail = B().box(0.08, 0.1, 2.3, m.wood, 0.8);
      rail.position.set(sx * 0.6, 0.6, 0); g.add(rail);
    }
    // 车板（木条）
    for (let i = 0; i < 6; i++) {
      const board = B().box(1.32, 0.05, 0.3, m.wood, 0.6);
      board.position.set(0, 0.66, -1.0 + i * 0.4); g.add(board);
    }
    // 侧栏（立柱 + 上枨）
    for (const sz of [-1, 1]) {
      const rail = B().box(1.3, 0.06, 0.05, m.wood, 0.6);
      rail.position.set(0, 1.02, sz * 1.05); g.add(rail);
      for (const sx of [-1, 0, 1]) {
        const post = B().cyl(0.025, 0.025, 0.4, m.wood, 6);
        post.position.set(sx * 0.6, 0.82, sz * 1.05); g.add(post);
      }
    }
    // 车轮：木头辐条轮（木轮辋 + 铁皮箍 + 轮毂 + 12 根辐条）
    const wheel = (x) => {
      const w = P.g();
      w.position.set(x, 0.37, 0);
      w.rotation.y = Math.PI / 2;
      const rimWood = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.042, 7, 24), m.wood);
      rimWood.castShadow = true; w.add(rimWood);
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.372, 0.016, 5, 26), m.metalDark);
      w.add(hoop);
      const hub = B().cyl(0.08, 0.08, 0.17, m.woodDark, 12);
      hub.rotation.z = Math.PI / 2; w.add(hub);
      const hubBand = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 5, 14), m.metalDark);
      hubBand.rotation.y = Math.PI / 2; w.add(hubBand);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const sp = B().cyl(0.011, 0.013, 0.28, m.wood, 5);
        sp.position.set(Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0);
        sp.rotation.z = -a;
        w.add(sp);
      }
      return w;
    };
    g.add(wheel(-0.74)); g.add(wheel(0.74));
    // 木轴 + 轴座
    const axle = B().cyl(0.045, 0.045, 1.62, m.woodDark, 8);
    axle.rotation.z = Math.PI / 2; axle.position.set(0, 0.37, 0); g.add(axle);
    // 车把：两根长木 + 布缠的握把 + 横撑
    for (const sx of [-1, 1]) {
      const shaft = B().cyl(0.042, 0.05, 1.55, m.wood, 8);
      shaft.rotation.x = rad(84); shaft.position.set(sx * 0.52, 0.6, 1.85); shaft.castShadow = true; g.add(shaft);
      const wrap = B().cyl(0.055, 0.055, 0.3, MT.mat.solid(0x8a7a5a, { roughness: 0.95 }), 8);
      wrap.rotation.x = rad(84); wrap.position.set(sx * 0.52, 0.68, 2.62); g.add(wrap);
    }
    const barGrip = B().cyl(0.028, 0.028, 1.04, m.wood, 8);
    barGrip.rotation.z = Math.PI / 2; barGrip.position.set(0, 0.72, 2.62); g.add(barGrip);
    // 支脚（停车时撑住车把）
    const propLeg = B().box(0.05, 0.62, 0.05, m.woodDark, 0.4);
    propLeg.position.set(0.18, 0.33, 1.6); propLeg.rotation.x = rad(-16); g.add(propLeg);
    // 车上的粮袋（鼓鼓的麻袋 + 扎口）
    for (const [bx, bz, r] of [[-0.34, -0.62, 0.34], [0.14, -0.72, 0.3], [-0.12, 0.42, 0.32]]) {
      const sack = P.g();
      const body = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m.straw);
      body.scale.set(1.16, 0.86, 1.0); body.position.y = r * 0.86;
      body.castShadow = true; sack.add(body);
      const neck = B().cyl(0.055, 0.075, 0.1, m.straw, 8);
      neck.position.y = r * 1.66; sack.add(neck);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 4, 10), m.woodDark);
      tie.rotation.x = Math.PI / 2; tie.position.y = r * 1.7; sack.add(tie);
      sack.position.set(bx, 0.68, bz);
      sack.rotation.y = (Math.random() - 0.5) * 0.5;
      g.add(sack);
    }
    // 捆扎的麻绳：两道拱形绳圈勒在袋子外面
    for (const bz of [-0.15, 0.45]) {
      const rope = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.016, 5, 12, Math.PI), m.straw);
      rope.position.set(0, 0.7, bz);
      g.add(rope);
    }
    return prop(g);
  };

  P.tricycle = function (electrified) { // 三轮车 / 电动三轮车
    const m = M(), g = P.g();
    const isE = electrified !== false;
    const boxMat = isE ? m.blue : m.wood;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.95 });
    const hubMat = MT.mat.metal(0x9aa0a6, 0.45);

    // 车轮：轮胎 + 轮毂 + 辐条（原来只有两圈细铁环）
    const wheel = (r, w) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18), tireMat);
      tire.rotation.z = Math.PI / 2; tire.castShadow = true; wg.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.38, w * 1.02, 12), hubMat);
      hub.rotation.z = Math.PI / 2; wg.add(hub);
      for (let i = 0; i < 4; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, r * 0.62, 0.03), hubMat);
        sp.rotation.x = i * Math.PI / 4; wg.add(sp);
      }
      return wg;
    };
    const w1 = wheel(0.32, 0.12); w1.position.set(-0.65, 0.32, -0.55); g.add(w1);
    const w2 = wheel(0.32, 0.12); w2.position.set(0.65, 0.32, -0.55); g.add(w2);
    const wf = wheel(0.29, 0.09); wf.position.set(0, 0.29, 0.98); g.add(wf);
    // 后挡泥板
    for (const sx of [-1, 1]) {
      const fender = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.055, 6, 16, Math.PI), boxMat);
      fender.rotation.y = Math.PI / 2; fender.position.set(sx * 0.65, 0.33, -0.55); g.add(fender);
    }
    // 前叉 / 前挡泥板
    const frontFender = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 6, 14, Math.PI), boxMat);
    frontFender.rotation.y = Math.PI / 2; frontFender.position.set(0, 0.3, 0.98); g.add(frontFender);
    for (const sx of [-1, 1]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 6), m.metalDark);
      fork.position.set(sx * 0.09, 0.58, 0.95); fork.rotation.x = rad(-12); g.add(fork);
    }

    // 车架 / 踏板
    const frame = B().box(0.12, 0.1, 1.65, m.metalDark, 0.6); frame.position.set(0, 0.6, 0.22); g.add(frame);
    const floor = B().box(0.86, 0.06, 0.62, m.metalDark, 0.6); floor.position.set(0, 0.52, 0.34); g.add(floor);

    // 车斗：底板 + 四面挡板 + 竖筋 + 尾门
    const bedY = 0.88, bedZ = -0.62;
    const bedFloor = B().box(1.3, 0.08, 1.65, boxMat, 0.8); bedFloor.position.set(0, bedY - 0.31, bedZ); g.add(bedFloor);
    for (const sx of [-1, 1]) {
      const side = B().box(0.06, 0.62, 1.65, boxMat, 0.7); side.position.set(sx * 0.65, bedY, bedZ); g.add(side);
      // 侧板竖筋
      for (let i = 0; i < 4; i++) {
        const rib = B().box(0.075, 0.56, 0.035, m.metalDark, 0.3);
        rib.position.set(sx * 0.665, bedY, bedZ - 0.62 + i * 0.42); g.add(rib);
      }
      // 反光条
      const refl = B().box(0.02, 0.06, 0.5, m.yellow, 0.2);
      refl.position.set(sx * 0.687, bedY + 0.16, bedZ + 0.45); g.add(refl);
    }
    const tail = B().box(1.3, 0.6, 0.06, boxMat, 0.7); tail.position.set(0, bedY, -1.44); g.add(tail);
    // 尾门横筋 + 合页
    const tailRib = B().box(1.24, 0.05, 0.03, m.metalDark, 0.3);
    tailRib.position.set(0, bedY + 0.18, -1.475); g.add(tailRib);
    for (const sx of [-1, 1]) {
      const hinge = B().box(0.1, 0.06, 0.035, m.metalDark, 0.2);
      hinge.position.set(sx * 0.45, bedY + 0.26, -1.478); g.add(hinge);
    }
    // 尾灯
    for (const sx of [-1, 1]) {
      const lamp = B().box(0.14, 0.1, 0.04, new THREE.MeshStandardMaterial({ color: 0x9a2018, emissive: 0x3a0805, roughness: 0.5 }), 0.3);
      lamp.position.set(sx * 0.55, bedY - 0.26, -1.48); g.add(lamp);
    }
    const rail = B().box(1.36, 0.05, 1.7, m.metalDark, 0.5); rail.position.set(0, 1.22, bedZ); g.add(rail);
    // 车斗里的货
    for (let i = 0; i < 3; i++) {
      const sack = B().box(0.38, 0.28, 0.5, m.straw, 0.8);
      sack.position.set(-0.28 + i * 0.3, 1.04, bedZ - 0.2 + i * 0.16);
      sack.rotation.y = (i - 1) * 0.2; g.add(sack);
    }
    const crate = B().box(0.5, 0.26, 0.4, m.wood, 0.6);
    crate.position.set(0.25, 1.02, bedZ + 0.45); g.add(crate);

    if (isE) {
      // 驾驶室：壳体 + 立柱 + 玻璃 + 车顶
      const cab = B().box(1.15, 1.0, 0.9, boxMat, 1.0); cab.position.set(0, 1.5, 0.45); g.add(cab);
      const windshield = B().plane(1.02, 0.72, m.glassDark, 1, 1); windshield.position.set(0, 1.62, 0.905); g.add(windshield);
      for (const sx of [-1, 1]) {
        const win = B().plane(0.62, 0.58, m.glassDark, 1, 1);
        win.rotation.y = Math.PI / 2; win.position.set(sx * 0.579, 1.62, 0.45); g.add(win);
        // 车门缝 + 把手
        const seam = B().box(0.012, 0.86, 0.02, m.metalDark, 0.2);
        seam.position.set(sx * 0.581, 1.44, 0.04); g.add(seam);
        const handle = B().box(0.02, 0.03, 0.12, m.metalDark, 0.2);
        handle.position.set(sx * 0.588, 1.33, 0.22); g.add(handle);
      }
      // 后窗
      const rearWin = B().plane(0.9, 0.46, m.glassDark, 1, 1);
      rearWin.rotation.y = Math.PI; rearWin.position.set(0, 1.7, 0.0); g.add(rearWin);
      // A/B 柱与车顶
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const pillar = B().box(0.055, 0.92, 0.055, boxMat, 0.3);
        pillar.position.set(sx * 0.545, 1.5, 0.45 + sz * 0.42); g.add(pillar);
      }
      const cabTop = B().box(1.3, 0.09, 1.06, boxMat, 0.8); cabTop.position.set(0, 2.03, 0.45); g.add(cabTop);
      const cabTrim = B().cyl(0.1, 0.1, 1.06, boxMat, 8); cabTrim.rotation.x = Math.PI / 2; cabTrim.position.set(0, 2.09, 0.45); g.add(cabTrim);
      // 后视镜
      for (const sx of [-1, 1]) {
        const stem = B().cyl(0.015, 0.015, 0.28, m.metalDark, 6); stem.position.set(sx * 0.6, 1.83, 0.86); g.add(stem);
        const mir = B().box(0.14, 0.1, 0.03, m.glassDark, 0.3); mir.position.set(sx * 0.66, 1.97, 0.9); g.add(mir);
      }
      // 方向把、仪表、大灯、前保险杠
      const bar = B().box(0.7, 0.05, 0.05, m.metalDark, 0.4); bar.position.set(0, 1.22, 0.72); g.add(bar);
      const dash = B().box(0.5, 0.16, 0.18, m.metalDark, 0.4); dash.position.set(0, 1.2, 0.72); g.add(dash);
      const head = B().cyl(0.1, 0.1, 0.06, m.yellow, 12); head.rotation.x = Math.PI / 2; head.position.set(0, 1.03, 0.99); g.add(head);
      const headRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 5, 12), m.metalDark);
      headRim.rotation.x = Math.PI / 2; headRim.position.set(0, 1.03, 0.995); g.add(headRim);
      const bumper = B().box(0.9, 0.08, 0.1, m.metalDark, 0.4); bumper.position.set(0, 0.56, 1.02); g.add(bumper);
      const plate = B().box(0.28, 0.09, 0.02, MT.mat.solid(0x2f6b4a, { roughness: 0.6 }), 0.2);
      plate.position.set(0, 0.69, 1.07); g.add(plate);
      // 座椅（透过玻璃能看到）
      const seat = B().box(0.56, 0.1, 0.42, m.metalDark, 0.4); seat.position.set(0, 1.12, 0.3); g.add(seat);
      const back = B().box(0.56, 0.4, 0.07, m.metalDark, 0.4); back.position.set(0, 1.3, 0.11); g.add(back);
      const motor = B().cyl(0.16, 0.16, 0.28, m.metalDark, 10); motor.rotation.z = Math.PI / 2; motor.position.set(0, 0.3, -0.55); g.add(motor);
    } else {
      const seat = B().box(0.36, 0.09, 0.3, m.metalDark, 0.4); seat.position.set(0, 0.96, 0.5); g.add(seat);
      const back = B().box(0.36, 0.26, 0.05, m.metalDark, 0.4); back.position.set(0, 1.1, 0.36); g.add(back);
      const bar = B().box(0.56, 0.05, 0.05, m.metalDark, 0.4); bar.position.set(0, 1.1, 0.9); g.add(bar);
    }
    return prop(g);
  };

  P.tractor = function () { // 小四轮拖拉机 + 拖斗
    const m = M(), g = P.g();
    const metal = m.metalDark, green = m.green;
    // 机身后段
    const body = B().box(1.05, 0.6, 1.1, metal, 1.0); body.position.set(0, 1.0, -0.35); g.add(body);
    // 引擎盖（圆脊）
    const hoodBase = B().box(0.92, 0.5, 1.4, green, 1.0); hoodBase.position.set(0, 1.08, 0.8); g.add(hoodBase);
    const hoodRidge = B().cyl(0.2, 0.2, 1.4, green, 12); hoodRidge.rotation.x = Math.PI / 2; hoodRidge.position.set(0, 1.35, 0.8); g.add(hoodRidge);
    // 侧面散热条
    for (let i = 0; i < 4; i++) { const lv = B().box(0.02, 0.05, 1.2, metal, 0.4); lv.position.set(0.47, 0.95 + i * 0.11, 0.8); g.add(lv); const lv2 = lv.clone(); lv2.position.x = -0.47; g.add(lv2); }
    // 前脸格栅 + 大灯
    const grill = B().box(0.84, 0.44, 0.08, metal, 0.6); grill.position.set(0, 1.06, 1.5); g.add(grill);
    for (let i = 0; i < 4; i++) { const bar = B().box(0.78, 0.04, 0.03, m.steel, 0.3); bar.position.set(0, 0.92 + i * 0.1, 1.54); g.add(bar); }
    for (const sx of [-1, 1]) { const hl = B().cyl(0.09, 0.09, 0.06, m.yellow, 12); hl.rotation.x = Math.PI / 2; hl.position.set(sx * 0.33, 1.24, 1.54); g.add(hl); }
    // 排气筒 + 消声器
    const pipe = B().cyl(0.05, 0.055, 1.0, metal, 8); pipe.position.set(0.36, 1.95, 0.9); g.add(pipe);
    const muf = B().cyl(0.075, 0.075, 0.34, metal, 10); muf.position.set(0.36, 2.32, 0.9); g.add(muf);
    const mufCap = B().cyl(0.085, 0.072, 0.05, metal, 10); mufCap.position.set(0.36, 2.51, 0.9); g.add(mufCap);
    // 驾驶位（座 + 靠背 + 立柱）
    const sb = B().cyl(0.06, 0.06, 0.42, metal, 8); sb.position.set(0, 1.34, -0.5); g.add(sb);
    const seat = B().box(0.44, 0.09, 0.42, metal, 0.5); seat.position.set(0, 1.57, -0.5); g.add(seat);
    const back = B().box(0.44, 0.32, 0.06, metal, 0.5); back.position.set(0, 1.74, -0.7); g.add(back);
    // 方向盘（轮圈 + 辐条）+ 立柱
    const col = B().cyl(0.035, 0.035, 0.62, metal, 8); col.position.set(0, 1.55, 0.02); col.rotation.x = rad(26); g.add(col);
    const steer = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 6, 18), metal); steer.rotation.x = rad(64); steer.position.set(0, 1.87, 0.18); g.add(steer);
    for (let i = 0; i < 3; i++) {
      const sp = B().box(0.32, 0.02, 0.02, metal, 0.3); sp.position.set(0, 1.87, 0.18);
      sp.rotation.x = rad(64); sp.rotation.z = i * Math.PI / 3; g.add(sp);
    }
    // 挡泥板（后轮上方弧形）
    for (const sx of [-1, 1]) {
      const fender = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 6, 16, Math.PI), green);
      fender.rotation.y = Math.PI / 2; fender.position.set(sx * 0.72, 0.6, -0.55); fender.castShadow = true; g.add(fender);
    }
    // 车轮：橡胶胎面 + 两侧胎壁 + 银灰轮辋 + 轮毂螺栓 + 人字花纹
    const rubber = MT.mat.solid(0x2b2d31, { roughness: 0.95 });
    const rubberD = MT.mat.solid(0x1f2124, { roughness: 0.95 });
    const rimMat = MT.mat.metal(0xb9bec3, 0.35);
    const wheel = (r, tw, x, z) => {
      const w = P.g();
      w.position.set(x, r, z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, tw, 20), rubber);
      tire.rotation.z = Math.PI / 2; tire.castShadow = true; w.add(tire);
      // 胎壁：比胎面窄一点、颜色更深，让轮子有"厚度"
      for (const sx of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, tw * 0.06, 18), rubberD);
        wall.rotation.z = Math.PI / 2; wall.position.x = sx * (tw / 2 + 0.006); w.add(wall);
      }
      // 轮辋（亮银色圆盘）+ 轮毂 + 螺栓
      for (const sx of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, tw * 0.1, 16), rimMat);
        rim.rotation.z = Math.PI / 2; rim.position.x = sx * (tw / 2 + 0.012); w.add(rim);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, tw + 0.06, 12), metal);
      hub.rotation.z = Math.PI / 2; w.add(hub);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), rimMat);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(tw / 2 + 0.03, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        w.add(bolt);
      }
      // 人字花纹：胎面上的一圈斜条
      const nT = Math.max(8, Math.round(r * 22));
      for (let k = 0; k < nT; k++) {
        const a = (k / nT) * Math.PI * 2;
        const lug = B().box(tw * 0.92, 0.03, 0.05, rubberD, 0.2);
        lug.position.set(0, Math.cos(a) * (r + 0.01), Math.sin(a) * (r + 0.01));
        lug.rotation.x = -a; lug.rotation.y = 0.5;
        w.add(lug);
      }
      return w;
    };
    g.add(wheel(0.62, 0.3, -0.72, -0.55));
    g.add(wheel(0.62, 0.3, 0.72, -0.55));
    g.add(wheel(0.34, 0.2, -0.62, 1.22));
    g.add(wheel(0.34, 0.2, 0.62, 1.22));
    // 驾驶棚
    const canopy = B().box(1.5, 0.08, 1.7, m.metal, 1.0); canopy.position.set(0, 2.35, 0.0); g.add(canopy);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = B().cyl(0.04, 0.04, 1.0, m.metal, 8); post.position.set(sx * 0.68, 1.9, 0.0 + sz * 0.78); g.add(post);
    }
    // 拖斗
    const trailer = B().box(1.5, 0.7, 2.4, m.metal, 1.0); trailer.position.set(0, 0.85, -2.6); g.add(trailer);
    const tRail = B().box(1.62, 0.08, 2.5, m.metal, 1.0); tRail.position.set(0, 1.22, -2.6); g.add(tRail);
    g.add(wheel(0.38, 0.24, -0.82, -2.6));
    g.add(wheel(0.38, 0.24, 0.82, -2.6));
    const hitch = B().cyl(0.05, 0.05, 1.1, metal, 6); hitch.rotation.x = Math.PI / 2; hitch.position.set(0, 0.6, -1.4); g.add(hitch);
    for (let i = 0; i < 4; i++) {
      const p = B().box(0.5, 0.3, 0.6, m.straw, 0.5);
      p.position.set(-0.4 + (i % 2) * 0.8, 1.35, -3.2 + Math.floor(i / 2) * 0.8); g.add(p);
    }
    return prop(g);
  };

  P.stoneRoller = function () { // 石磙（碾场）：带凿痕的石滚 + 铁轴 + 木碾架
    const m = M(), g = P.g();
    const stoneTex = MT.texture.cloneTex('concrete', 2, 1);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex, color: 0x9a968b, roughness: 1.0,
    });
    const stoneDark = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x7e7a70, roughness: 1.0 });
    const R = 0.46, L = 0.86;
    // 滚身：中间略粗、两头收一点的圆柱（石磙都是这样凿出来的）
    const drum = B().cyl(R, R * 0.94, L, stoneMat, 20);
    drum.rotation.z = Math.PI / 2; drum.position.y = R + 0.02;
    drum.castShadow = true; drum.receiveShadow = true; g.add(drum);
    // 凿痕：滚身一圈竖向浅槽
    const nG = 14;
    for (let i = 0; i < nG; i++) {
      const a = (i / nG) * Math.PI * 2;
      const groove = B().box(L * 0.94, 0.022, 0.016, stoneDark, 0.3);
      groove.position.set(0, R + 0.02 + Math.sin(a) * R * 0.99, Math.cos(a) * R * 0.99);
      groove.rotation.x = -a;
      g.add(groove);
    }
    // 两端的石台肩 + 铁轴头
    for (const sx of [-1, 1]) {
      const shoulder = B().cyl(R * 0.99, R * 0.9, 0.05, stoneDark, 18);
      shoulder.rotation.z = Math.PI / 2; shoulder.position.set(sx * (L / 2 + 0.02), R + 0.02, 0); g.add(shoulder);
      const axleEnd = B().cyl(0.035, 0.035, 0.16, m.metalDark, 10);
      axleEnd.rotation.z = Math.PI / 2; axleEnd.position.set(sx * (L / 2 + 0.1), R + 0.02, 0); g.add(axleEnd);
    }
    // 铁轴
    const axle = B().cyl(0.032, 0.032, 1.5, m.metalDark, 10);
    axle.rotation.z = Math.PI / 2; axle.position.y = R + 0.02; g.add(axle);
    // 木碾架：两侧立板 + 轴孔铁箍 + 前面的牵引横杆
    for (const sx of [-1, 1]) {
      const board = B().box(0.05, 0.72, 0.28, m.woodDark, 0.7);
      board.position.set(sx * (L / 2 + 0.2), 0.5, 0); board.castShadow = true; g.add(board);
      const brace = B().cyl(0.028, 0.028, 0.62, m.wood, 8);
      brace.position.set(sx * (L / 2 + 0.2), 1.02, 0.2); brace.rotation.x = rad(38); g.add(brace);
      const topRail = B().box(0.05, 0.06, 0.9, m.wood, 0.5);
      topRail.position.set(sx * (L / 2 + 0.2), 1.03, -0.24); g.add(topRail);
    }
    const crossRail = B().cyl(0.03, 0.03, (L + 0.5), m.wood, 8);
    crossRail.rotation.z = Math.PI / 2; crossRail.position.set(0, 1.03, -0.68); g.add(crossRail);
    // 牵引杆（往前伸，套牲口用的）
    const bar = B().cyl(0.035, 0.045, 1.15, m.wood, 8);
    bar.rotation.x = rad(84); bar.position.set(0, 0.92, -1.16); g.add(bar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 5, 12), m.metalDark);
    ring.position.set(0, 0.9, -1.72); g.add(ring);
    return prop(g);
  };

  P.haystack = function (r, h) { // 草垛：一层层码起来的麦秸垛，顶上压草压帽
    const m = M(), g = P.g();
    const R = r || 1.5, H = h || 2.2;
    const strawD = MT.mat.solid(0xa88c4e, { roughness: 1.0 });
    // 底层压边（散落的麦秸）
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(R * 1.12, H * 0.16, 16, 1, true), strawD);
    skirt.position.y = H * 0.08; skirt.castShadow = true; g.add(skirt);
    // 主体：三层略带偏心的圆台叠起来，别像一个规整的圆锥
    const layers = 3;
    let y = H * 0.05, rr = R;
    for (let i = 0; i < layers; i++) {
      // 层与层压得比较紧（只露一小截边），才像码起来的麦秸垛而不是摞盘子
      const lh = H * (0.44 - i * 0.03);
      const topR = rr * (0.76 - i * 0.05);
      const layer = new THREE.Mesh(new THREE.CylinderGeometry(topR, rr, lh, 16, 1), m.straw);
      layer.position.set(Math.cos(i * 2.1) * R * 0.05, y + lh / 2, Math.sin(i * 2.1) * R * 0.05);
      layer.rotation.y = i * 0.7;
      layer.castShadow = true; layer.receiveShadow = true;
      g.add(layer);
      y += lh * 0.8; rr = topR;
    }
    // 顶帽：一小团收口的草 + 压顶的草绳
    const cap = new THREE.Mesh(new THREE.ConeGeometry(rr * 1.25, H * 0.2, 12, 1), m.straw);
    cap.position.y = y + H * 0.09; cap.castShadow = true; g.add(cap);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.92, 0.02, 5, 14), MT.mat.solid(0xb09a6a, { roughness: 1 }));
    rope.rotation.x = Math.PI / 2; rope.position.y = y + 0.02; g.add(rope);
    // 四周戳出来的乱草
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const yy = H * (0.08 + Math.random() * 0.8);
      const t = yy / H;
      const rad2 = R * (1.02 - t * 0.55) * (0.9 + Math.random() * 0.2);
      const stick = B().box(0.02, 0.16 + Math.random() * 0.2, 0.02, m.straw, 0.4);
      stick.position.set(Math.cos(a) * rad2, yy, Math.sin(a) * rad2);
      stick.rotation.z = Math.cos(a) * rad(52 + Math.random() * 30);
      stick.rotation.x = -Math.sin(a) * rad(52 + Math.random() * 30);
      g.add(stick);
    }
    // 靠在垛上的木杈
    const fork = P.g();
    const pole = B().cyl(0.025, 0.03, 1.5, m.wood, 8);
    pole.position.y = 0.75; fork.add(pole);
    for (const sx of [-1, 1]) {
      const tine = B().cyl(0.012, 0.016, 0.34, m.wood, 6);
      tine.position.set(sx * 0.06, 1.62, 0.02); tine.rotation.z = sx * rad(22); fork.add(tine);
    }
    fork.position.set(R * 1.0, 0, -R * 0.35);
    fork.rotation.z = rad(-13); fork.rotation.y = rad(24);
    g.add(fork);
    return prop(g);
  };

  /** 摊晒的粮食：不规则的薄薄一层（带颗粒贴图），边上散落一些
   *  以前是几个纯色圆片，看起来像地上刷的油漆 */
  P.grainSpread = function (r) {
    const g = P.g();
    const R = r || 2.6;
    const mat = MT.mat.grain(3, 3);
    // 不规则外缘：圆盘顶点半径加噪声
    const geo = new THREE.CircleGeometry(R, 30);
    const pos = geo.attributes.position;
    const n = new MT.Noise(Math.round(R * 1000) % 97 + 7);
    const uv = geo.attributes.uv;
    for (let i = 1; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const a = Math.atan2(y, x);
      const k = 1 + (n.fbm(Math.cos(a) * 1.6 + 10, Math.sin(a) * 1.6 + 4, 2)) * 0.22;
      pos.setXY(i, x * k, y * k);
    }
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    const disc = new THREE.Mesh(geo, mat);
    disc.position.y = 0.02; disc.receiveShadow = true;
    g.add(disc);
    // 中间略厚一点（粮食刚摊开的样子）
    const mound = new THREE.Mesh(new THREE.SphereGeometry(R * 0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    mound.scale.set(1, 0.045, 1); mound.position.y = 0.02; mound.receiveShadow = true;
    g.add(mound);
    // 边缘散落的谷粒
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = R * (0.86 + Math.random() * 0.3);
      const seed = B().box(0.03, 0.012, 0.02, mat, 0.2);
      seed.position.set(Math.cos(a) * rr, 0.02, Math.sin(a) * rr);
      seed.rotation.y = Math.random() * Math.PI;
      g.add(seed);
    }
    // 一柄靠着的木推板
    const pusher = B().box(0.42, 0.04, 0.2, M().wood, 0.6);
    pusher.position.set(R * 0.75, 0.1, -R * 0.7); pusher.rotation.set(rad(10), rad(24), rad(-16));
    g.add(pusher);
    return prop(g);
  };

  P.grainHeap = function (r, h) { // 粮堆：席子上的一堆粮食 + 木锨和扫帚
    const m = M(), g = P.g();
    const R = r || 1.6, H = h || 0.8;
    const grain = new THREE.MeshStandardMaterial({ color: 0xd9b95c, roughness: 1 });
    // 底下的苇席（圆席 + 一圈席边）
    const matDisc = B().cyl(R * 1.18, R * 1.18, 0.02, m.straw, 20);
    matDisc.position.y = 0.01; matDisc.receiveShadow = true; g.add(matDisc);
    const matRim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.16, 0.022, 5, 22), MT.mat.solid(0xbfa468, { roughness: 1 }));
    matRim.rotation.x = Math.PI / 2; matRim.position.y = 0.03; g.add(matRim);
    // 粮堆：半球 + 顶部收平，表面撒一层颗粒
    const heap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), grain);
    heap.scale.set(R, H, R);
    heap.position.y = 0.02; heap.castShadow = true; heap.receiveShadow = true; g.add(heap);
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
      const px = Math.cos(a) * rr * R * 0.96, pz = Math.sin(a) * rr * R * 0.96;
      const py = 0.03 + Math.sqrt(Math.max(0, 1 - rr * rr)) * H;
      const seed = B().box(0.026, 0.012, 0.018, grain, 0.2);
      seed.position.set(px, py, pz); seed.rotation.y = Math.random() * Math.PI;
      g.add(seed);
    }
    // 木锨：长柄 + 铲板
    const shovel = P.g();
    const handle = B().cyl(0.022, 0.026, 1.5, m.wood, 8);
    handle.position.y = 0.75; shovel.add(handle);
    const blade = B().box(0.3, 0.03, 0.42, m.wood, 0.6);
    blade.position.set(0, 0.14, 0.2); blade.rotation.x = rad(12); shovel.add(blade);
    shovel.position.set(R * 0.95, 0.04, R * 0.8); shovel.rotation.y = rad(-38); shovel.rotation.z = rad(-24);
    g.add(shovel);
    // 扫帚：柄 + 竹梢
    const broom = P.g();
    const bs = B().cyl(0.02, 0.024, 1.15, m.wood, 8);
    bs.position.y = 0.62; broom.add(bs);
    const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 8), MT.mat.solid(0xc0a25e, { roughness: 1 }));
    bristle.position.y = 0.2; broom.add(bristle);
    broom.position.set(-R * 1.0, 0.02, -R * 0.55); broom.rotation.z = rad(18); broom.rotation.y = rad(30);
    g.add(broom);
    return prop(g);
  };

  P.basket = function (r, h) { // 箩筐（竹篾编的：竖向篾条 + 箍圈 + 提手 + 深色内壁）
    const m = M(), g = P.g();
    const R = r || 0.3, H = h || 0.3;
    const splint = MT.mat.solid(0xc9ae74, { roughness: 0.98 });        // 竹篾本色
    const splintD = MT.mat.solid(0xa2874f, { roughness: 0.98 });       // 阴面 / 箍圈
    const dark = MT.mat.solid(0x6b5a3c, { roughness: 1.0 });           // 筐里没装满的部分
    // 筐身：上大下小的圆台
    const body = B().cyl(R, R * 0.76, H, splint, 16);
    body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    // 内壁压暗：从上口往里看不是实心的
    const cavity = B().cyl(R * 0.9, R * 0.7, H * 0.94, dark, 14);
    cavity.position.y = H * 0.5; g.add(cavity);
    const cavityFloor = B().cyl(R * 0.72, R * 0.72, 0.012, dark, 12);
    cavityFloor.position.y = H * 0.06; g.add(cavityFloor);
    // 竖向篾条：一圈窄条，编出竖纹
    const nS = Math.max(8, Math.round(R * 44));
    for (let i = 0; i < nS; i++) {
      const a = (i / nS) * Math.PI * 2;
      const bar = B().box(0.016, H * 0.94, 0.012, i % 2 ? splint : splintD, 0.5);
      const rr = R * 0.995;
      bar.position.set(Math.cos(a) * rr, H * 0.5, Math.sin(a) * rr);
      bar.rotation.y = -a;
      bar.rotation.z = rad(-4);     // 顺着圆台的收分
      g.add(bar);
    }
    // 上口箍圈 + 中腰箍圈
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 6, 18), splintD);
    rim.rotation.x = Math.PI / 2; rim.position.y = H; rim.castShadow = true; g.add(rim);
    const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.88, 0.014, 5, 16), splintD);
    band.rotation.x = Math.PI / 2; band.position.y = H * 0.55; g.add(band);
    // 底圈（筐脚）
    const foot = new THREE.Mesh(new THREE.TorusGeometry(R * 0.76, 0.018, 5, 14), splintD);
    foot.rotation.x = Math.PI / 2; foot.position.y = 0.02; g.add(foot);
    // 两只竹提手
    for (const sx of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(R * 0.5, 0.014, 5, 12, Math.PI), splint);
      handle.position.set(0, H * 0.96, 0);
      handle.rotation.y = Math.PI / 2;            // 提手立在 Z 方向、跨过筐口
      handle.position.z = sx * R * 0.72;
      handle.rotation.x = sx * rad(6);
      g.add(handle);
    }
    return prop(g);
  };

  P.dogHouse = function () { // 狗窝：砖砌窝身 + 两坡小瓦顶 + 洞口 + 食盆 + 拴狗桩
    const m = M(), g = P.g();
    const brick = new THREE.MeshStandardMaterial({
      map: MT.texture.cloneTex('brickRed', 2, 1), color: 0xd8cfc4, roughness: 1.0,
    });
    const W = 0.95, D = 0.85, Hh = 0.62;
    // 窝身
    const body = B().box(W, Hh, D, brick, 0.9);
    body.position.y = Hh / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    // 窝口：深色的洞（洞框用青砖压边）
    const holeDark = B().box(0.44, 0.42, 0.06, MT.mat.solid(0x241d16, { roughness: 1 }), 0.3);
    holeDark.position.set(0, 0.26, D / 2 + 0.01); g.add(holeDark);
    for (const sx of [-1, 1]) {
      const jamb = B().box(0.06, 0.5, 0.08, m.brickGrey, 0.5);
      jamb.position.set(sx * 0.26, 0.27, D / 2 + 0.02); g.add(jamb);
    }
    const lintel = B().box(0.62, 0.07, 0.08, m.brickGrey, 0.5);
    lintel.position.set(0, 0.53, D / 2 + 0.02); g.add(lintel);
    // 窝里的干草：洞口露出一层
    const bed = B().box(0.5, 0.05, 0.3, m.straw, 0.6);
    bed.position.set(0, 0.08, D / 2 - 0.16); g.add(bed);
    // 两坡瓦顶 + 瓦脊 + 檐口
    for (const sz of [-1, 1]) {
      const slope = B().box(W + 0.24, 0.06, D * 0.62, m.tileBlue, 0.8);
      slope.position.set(0, Hh + 0.17, sz * D * 0.27);
      slope.rotation.x = sz * rad(-26);
      slope.castShadow = true; g.add(slope);
      const eave = B().box(W + 0.28, 0.05, 0.05, m.tileDark, 0.6);
      eave.position.set(0, Hh + 0.04, sz * (D * 0.54)); g.add(eave);
    }
    const ridge = B().cyl(0.05, 0.05, W + 0.26, m.tileDark, 8);
    ridge.rotation.z = Math.PI / 2; ridge.position.y = Hh + 0.33; g.add(ridge);
    // 食盆（搪瓷碗）和啃剩的骨头
    const bowl = B().cyl(0.13, 0.1, 0.08, MT.mat.solid(0xd6d2c8, { roughness: 0.6 }), 14);
    bowl.position.set(W / 2 + 0.28, 0.04, D / 2 - 0.1); g.add(bowl);
    const bowlIn = B().cyl(0.11, 0.11, 0.02, MT.mat.solid(0x8a7a58, { roughness: 1 }), 12);
    bowlIn.position.set(W / 2 + 0.28, 0.06, D / 2 - 0.1); g.add(bowlIn);
    // 拴狗的木桩 + 铁链
    const post = B().cyl(0.06, 0.07, 0.9, m.woodDark, 8);
    post.position.set(-W / 2 - 0.4, 0.45, D / 2 - 0.2); post.castShadow = true; g.add(post);
    const chainMat = MT.mat.solid(0x8a8a8a, { roughness: 0.6, metalness: 0.5 });
    for (let i = 0; i < 7; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.009, 4, 8), chainMat);
      link.position.set(-W / 2 - 0.4 + 0.05, 0.86 - i * 0.055, D / 2 - 0.2 + Math.sin(i) * 0.02);
      link.rotation.y = i % 2 ? 0 : Math.PI / 2;
      g.add(link);
    }
    return prop(g);
  };

  P.waterTrough = function () {
    const m = M(), g = P.g();
    const t = B().box(1.4, 0.4, 0.6, m.cement, 0.7);
    t.position.y = 0.2; g.add(t);
    const water = B().plane(1.24, 0.46, MT.mat.water(0x3a6b66, 0.8), 2, 1);
    water.rotation.x = -Math.PI / 2; water.position.y = 0.36; g.add(water);
    return prop(g);
  };

  /* =========================================================
   *  村口 / 公共设施小品
   * ========================================================= */
  P.powerPole = function (opts = {}) { // 电线杆（含大喇叭）
    const m = M(), g = P.g();
    const h = opts.h || 7.5;
    const pole = B().cyl(0.11, 0.16, h, m.cement, 10);
    pole.position.y = h / 2; g.add(pole);
    const cross = B().box(1.4, 0.09, 0.09, m.wood, 0.6);
    cross.position.y = h - 0.45; g.add(cross);
    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue;
      const ins = B().cyl(0.05, 0.06, 0.12, m.ceramic, 8);
      ins.position.set(i * 0.55, h - 0.32, 0); g.add(ins);
    }
    const lamp = B().box(0.24, 0.3, 0.24, m.metalDark, 0.4);
    lamp.position.set(0.3, h - 1.1, 0); g.add(lamp);
    if (opts.loudspeaker) {
      for (const sx of [-1, 1]) {
        const horn = B().cyl(0.09, 0.24, 0.42, m.metalDark, 10);
        horn.position.set(sx * 0.3, h - 1.7, 0.1);
        horn.rotation.x = rad(-70); horn.rotation.z = sx * rad(18);
        g.add(horn);
      }
      const box = B().box(0.3, 0.24, 0.2, m.metalDark, 0.4);
      box.position.set(0, h - 1.9, 0.02); g.add(box);
    }
    return prop(g);
  };

  /** 两根电线杆之间的电线（弧垂） */
  P.wire = function (a, b, sag) {
    const m = M();
    const g = P.g();
    const pts = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const y = a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * (sag === undefined ? 0.9 : sag);
      pts.push(new THREE.Vector3(x - (a.x + b.x) / 2, y, z - (a.z + b.z) / 2));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 14, 0.022, 4, false);
    const mesh = new THREE.Mesh(geo, m.metalDark);
    mesh.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    g.add(mesh);
    return prop(g);
  };

  P.streetLamp = function () { // 太阳能路灯
    const m = M(), g = P.g();
    const h = 5.2;
    const pole = B().cyl(0.07, 0.1, h, m.metal, 10);
    pole.position.y = h / 2; g.add(pole);
    const arm = B().cyl(0.05, 0.05, 1.0, m.metal, 8);
    arm.rotation.z = rad(72); arm.position.set(0.42, h - 0.16, 0); g.add(arm);
    const head = B().box(0.6, 0.1, 0.28, m.metalDark, 0.5);
    head.position.set(0.86, h - 0.3, 0); g.add(head);
    const lampMat = MT.mat.solid(0xfff0c0, { emissive: 0xffe9a8, emissiveIntensity: 0.0, roughness: 0.4 });
    lampMat.userData.lampMat = true;
    const led = B().box(0.5, 0.05, 0.2, lampMat, 0.4);
    led.position.set(0.86, h - 0.36, 0); g.add(led);
    const panel = B().box(0.8, 0.05, 0.6, m.solar, 0.5);
    panel.position.set(0, h + 0.22, 0); panel.rotation.x = rad(-18); g.add(panel);
    g.userData.lampMat = lampMat;
    return prop(g);
  };

  P.noticeBoard = function (text, opts = {}) { // 标语墙 / 公开栏
    const m = M(), g = P.g();
    const w = opts.w || 6.2, h = opts.h || 2.2;
    const wall = B().box(w, h, 0.28, m.white, 1.6);
    wall.position.y = h / 2; g.add(wall);
    const cap = B().box(w + 0.4, 0.18, 0.5, m.tileDark, 1.0);
    cap.position.y = h + 0.09; g.add(cap);
    const boardMat = MT.texture.textMat(text || '乡村振兴　产业兴旺', {
      key: 'notice:' + (text || 'default'),
      w: 1024, h: 360, bg: '#f4efe2', color: '#b3271b',
      fontSize: 150, serif: false,
    });
    const board = B().plane(w - 0.5, h * 0.62, boardMat, 1, 1);
    board.position.set(0, h * 0.56, 0.15); g.add(board);
    return prop(g);
  };

  P.stele = function (text) { // 村口石碑
    const m = M(), g = P.g();
    const base = B().box(1.5, 0.35, 0.9, m.stone, 1.0);
    base.position.y = 0.17; g.add(base);
    const body = B().box(1.1, 2.0, 0.42, m.stone, 1.2);
    body.position.y = 1.3; g.add(body);
    const cap = B().box(1.35, 0.22, 0.62, m.stone, 1.0);
    cap.position.y = 2.4; g.add(cap);
    const plaqueMat = MT.texture.textMat(text || '任庄村', {
      key: 'stele:' + text, w: 256, h: 640, bg: 'none', color: '#7a1f12',
      vertical: true, fontSize: 120, serif: true, bold: true,
    });
    const pm = new THREE.MeshStandardMaterial({ map: plaqueMat.map, roughness: 0.95, transparent: true, color: 0xc9c4b4 });
    const face = B().plane(0.85, 1.7, pm, 1, 1);
    face.position.set(0, 1.35, 0.22); g.add(face);
    return prop(g);
  };

  P.busStop = function (name) { // 公交站牌
    const m = M(), g = P.g();
    const pole = B().cyl(0.05, 0.05, 2.6, m.metal, 8);
    pole.position.y = 1.3; g.add(pole);
    const mat = MT.texture.textMat(name || '任庄村 · 公交站', {
      key: 'bus:' + name, w: 512, h: 256, bg: '#1a4a7a', color: '#ffffff', fontSize: 60, pad: 0.12,
    });
    const board = B().plane(0.9, 0.5, mat, 1, 1);
    board.position.set(0, 2.45, 0.03); g.add(board);
    const back = B().box(0.94, 0.54, 0.04, m.metal, 0.5);
    back.position.set(0, 2.45, 0); g.add(back);
    return prop(g);
  };

  P.lantern = function (color) { // 红灯笼
    const m = M(), g = P.g();
    const mat = new THREE.MeshStandardMaterial({
      color: color === undefined ? 0xc8281e : color, roughness: 0.7,
      emissive: color === undefined ? 0xff4422 : color, emissiveIntensity: 0.35,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), mat);
    body.scale.y = 0.82; body.position.y = 0.3; g.add(body);
    for (const y of [0.14, 0.46]) {
      const cap = B().cyl(0.07, 0.07, 0.06, m.yellow, 8);
      cap.position.y = y; g.add(cap);
    }
    const tassel = B().cyl(0.02, 0.03, 0.3, m.red, 6);
    tassel.position.y = 0.02; g.add(tassel);
    return prop(g);
  };

  P.incenseBurner = function () { // 香炉
    const m = M(), g = P.g();
    const ding = B().cyl(0.4, 0.3, 0.42, m.metalDark, 14);
    ding.position.y = 0.55; g.add(ding);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 16), m.metalDark);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.76; g.add(rim);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      const leg = B().cyl(0.055, 0.05, 0.36, m.metalDark, 7);
      leg.position.set(Math.cos(a) * 0.26, 0.18, Math.sin(a) * 0.26); g.add(leg);
    }
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 5, 10), m.metalDark);
      ear.position.set(sx * 0.42, 0.72, 0); g.add(ear);
    }
    // 香
    for (let i = 0; i < 3; i++) {
      const st = B().cyl(0.012, 0.012, 0.34, m.red, 5);
      st.position.set((i - 1) * 0.06, 0.95, 0.02); st.rotation.z = rad((i - 1) * 6); g.add(st);
    }
    return prop(g);
  };

  /* =========================================================
   *  家禽家畜
   * ========================================================= */
  function legs(g, m, n, spread, len, r) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const leg = B().cyl(r || 0.03, r || 0.03, len, m, 6);
      leg.position.set(Math.cos(a) * spread, len / 2, Math.sin(a) * spread);
      g.add(leg);
    }
  }

  const EYE_MAT = new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.45 });
  function legCap(rad2, len, mat) { return new THREE.Mesh(new THREE.CapsuleGeometry(rad2, len, 3, 8), mat); }

  P.chicken = function (rng) { // 鸡
    const m = M(), g = P.g();
    const r = rng || new MT.RNG(1);
    const white = r.chance(0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: white ? 0xece6d8 : 0xc08644, roughness: 0.92 });
    const wingMat = new THREE.MeshStandardMaterial({ color: white ? 0xdad2c0 : 0xa9652c, roughness: 0.95 });
    const combMat = new THREE.MeshStandardMaterial({ color: 0xc8342a, roughness: 0.7 });
    // 身体：略向前倾的蛋形
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 11), bodyMat);
    body.scale.set(1.3, 0.95, 0.9); body.position.set(0, 0.27, 0); body.rotation.z = rad(-8);
    body.castShadow = true; g.add(body);
    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 9), bodyMat);
    breast.scale.set(0.95, 0.9, 0.85); breast.position.set(0.09, 0.3, 0); g.add(breast);
    // 翅膀：深一号的颜色 + 三层羽毛，避免整个身体是一团白
    for (const sz of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), wingMat);
      wing.scale.set(1.3, 0.62, 0.3); wing.position.set(-0.015, 0.29, sz * 0.125);
      wing.rotation.y = sz * rad(9); wing.rotation.z = rad(-6); g.add(wing);
      for (let a = 0; a < 3; a++) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.11, 5), wingMat);
        tip.rotation.z = rad(105); tip.position.set(-0.11 - a * 0.018, 0.27 - a * 0.008, sz * 0.14);
        g.add(tip);
      }
    }
    // 脖子 / 头
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, 0.12, 3, 9), bodyMat);
    neck.position.set(0.16, 0.41, 0); neck.rotation.z = rad(-32); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 9), bodyMat);
    head.position.set(0.255, 0.49, 0); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.075, 6), m.yellow);
    beak.rotation.z = rad(-90); beak.position.set(0.325, 0.478, 0); g.add(beak);
    // 鸡冠：三个小瓣
    for (let a = 0; a < 3; a++) {
      const comb = new THREE.Mesh(new THREE.SphereGeometry(0.024 - a * 0.003, 6, 5), combMat);
      comb.scale.set(1.3, 1.25, 0.45);
      comb.position.set(0.225 + a * 0.028, 0.552 + Math.sin(a) * 0.006, 0);
      g.add(comb);
    }
    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), combMat);
    wattle.scale.set(1, 1.35, 0.7); wattle.position.set(0.3, 0.443, 0); g.add(wattle);
    for (const sz of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 5), EYE_MAT);
      eye.position.set(0.295, 0.505, sz * 0.034); g.add(eye);
    }
    // 尾巴：几根长尾羽
    for (let a = 0; a < 4; a++) {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04 - a * 0.005, 0.24 + a * 0.02, 6), wingMat);
      tail.rotation.z = rad(68 + a * 3); tail.rotation.x = rad((a - 1.5) * 9);
      tail.position.set(-0.2 - a * 0.01, 0.34 + a * 0.012, (a - 1.5) * 0.028);
      g.add(tail);
    }
    for (const sz of [-1, 1]) {
      const leg = legCap(0.012, 0.13, m.yellow);
      leg.position.set(0.02, 0.1, sz * 0.05); g.add(leg);
      // 三根脚趾
      for (let a = -1; a <= 1; a++) {
        const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.055, 2, 5), m.yellow);
        toe.rotation.x = Math.PI / 2; toe.rotation.z = a * 0.32;
        toe.position.set(0.05 + a * 0.008, 0.012, sz * 0.05 + a * 0.024);
        g.add(toe);
      }
    }
    const head0 = head.position.clone();
    anim(g, (t, dt, self) => {
      const peck = Math.sin(t * 1.4 + self.position.x * 2.1);
      const k = Math.max(0, peck) * 0.5;
      head.position.set(0.255 + k * 0.06, 0.49 - k * 0.22, head0.z);
      neck.position.y = 0.41 - k * 0.11;
      self.rotation.z = Math.sin(t * 2.2 + self.position.z) * 0.03;
    });
    return prop(g);
  };

  P.duck = function (rng) { // 鸭
    const m = M(), g = P.g();
    const white = new THREE.MeshStandardMaterial({ color: 0xf6f4ec, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 11), white);
    body.scale.set(1.5, 0.88, 1.0); body.position.y = 0.2; body.castShadow = true; g.add(body);
    for (const sz of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), white);
      wing.scale.set(1.25, 0.7, 0.35); wing.position.set(0, 0.22, sz * 0.13); g.add(wing);
    }
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 3, 9), white);
    neck.position.set(0.2, 0.34, 0); neck.rotation.z = rad(-22); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 9), white);
    head.position.set(0.25, 0.44, 0); g.add(head);
    const bill = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m.yellow);
    bill.scale.set(1.8, 0.7, 1.0); bill.position.set(0.33, 0.43, 0); g.add(bill);
    for (const sz of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), EYE_MAT);
      eye.position.set(0.29, 0.46, sz * 0.035); g.add(eye);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), white);
    tail.rotation.z = rad(80); tail.position.set(-0.26, 0.26, 0); tail.scale.set(1, 1, 0.7); g.add(tail);
    for (const sz of [-1, 1]) {
      const leg = legCap(0.012, 0.1, m.yellow);
      leg.position.set(0.0, 0.06, sz * 0.05); g.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), m.yellow);
      foot.scale.set(1.2, 0.3, 1.6); foot.position.set(0.03, 0.01, sz * 0.05); g.add(foot);
    }
    anim(g, (t, dt, self) => { self.rotation.z = Math.sin(t * 1.6 + self.position.x) * 0.05; });
    return prop(g);
  };

  P.dog = function () { // 狗
    const m = M(), g = P.g();
    const fur = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 });
    const fur2 = new THREE.MeshStandardMaterial({ color: 0xa5835a, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), fur);
    body.scale.set(1.7, 0.95, 1.0); body.position.y = 0.42; body.castShadow = true; g.add(body);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur2);
    chest.scale.set(0.9, 1.0, 0.95); chest.position.set(0.22, 0.42, 0); g.add(chest);
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.1, 3, 9), fur);
    neck.position.set(0.3, 0.55, 0); neck.rotation.z = rad(-40); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), fur);
    head.position.set(0.4, 0.63, 0); g.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), fur2);
    snout.scale.set(1.5, 0.8, 0.85); snout.position.set(0.53, 0.6, 0); g.add(snout);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), m.metalDark);
    nose.position.set(0.61, 0.62, 0); g.add(nose);
    for (const sz of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), EYE_MAT);
      eye.position.set(0.49, 0.67, sz * 0.06); g.add(eye);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), fur);
      ear.scale.set(0.7, 1.1, 0.5); ear.position.set(0.35, 0.75, sz * 0.085);
      ear.rotation.z = sz * rad(-14); g.add(ear);
    }
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.22, 3, 8), fur);
    tail.position.set(-0.34, 0.52, 0); tail.rotation.z = rad(-55); g.add(tail);
    for (const sx of [0.16, -0.16]) for (const sz of [-1, 1]) {
      const leg = legCap(0.036, 0.24, fur);
      leg.position.set(sx, 0.17, sz * 0.1); g.add(leg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), fur2);
      paw.scale.set(1.0, 0.6, 1.3); paw.position.set(sx, 0.035, sz * 0.1 + 0.02); g.add(paw);
    }
    anim(g, (t, dt, self) => {
      tail.rotation.y = Math.sin(t * 8 + self.position.x) * 0.7;
      tail.rotation.x = Math.sin(t * 8 + self.position.x) * 0.2;
      head.position.y = 0.63 + Math.sin(t * 2.5) * 0.012;
    });
    return prop(g);
  };

  P.pig = function () { // 猪
    const m = M(), g = P.g();
    const skin = new THREE.MeshStandardMaterial({ color: 0xe3b3a4, roughness: 0.9 });
    const skinD = new THREE.MeshStandardMaterial({ color: 0xd6a091, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 11), skin);
    body.scale.set(1.5, 1.0, 1.05); body.position.y = 0.5; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
    head.position.set(0.5, 0.48, 0); g.add(head);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.12, 12), skinD);
    snout.rotation.z = Math.PI / 2; snout.position.set(0.71, 0.45, 0); g.add(snout);
    for (const sz of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), m.metalDark);
      nostril.position.set(0.775, 0.45, sz * 0.035); g.add(nostril);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 6), skinD);
      ear.position.set(0.44, 0.66, sz * 0.14); ear.rotation.z = sz * rad(-28); g.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), EYE_MAT);
      eye.position.set(0.62, 0.54, sz * 0.1); g.add(eye);
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 5, 12, Math.PI * 1.6), skin);
    tail.position.set(-0.52, 0.6, 0); tail.rotation.y = Math.PI / 2; g.add(tail);
    for (const sx of [0.24, -0.24]) for (const sz of [-1, 1]) {
      const leg = legCap(0.055, 0.2, skin);
      leg.position.set(sx, 0.18, sz * 0.18); g.add(leg);
      const hoof = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skinD);
      hoof.scale.set(1, 0.6, 1.1); hoof.position.set(sx, 0.035, sz * 0.18); g.add(hoof);
    }
    anim(g, (t, dt, self) => { tail.rotation.z = Math.sin(t * 4) * 0.4; });
    return prop(g);
  };

  P.buffalo = function () { // 水牛
    const m = M(), g = P.g();
    const skin = new THREE.MeshStandardMaterial({ color: 0x4b4740, roughness: 0.95 });
    const skinD = new THREE.MeshStandardMaterial({ color: 0x3c3833, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 11), skin);
    body.scale.set(1.6, 0.98, 1.0); body.position.y = 1.15; body.castShadow = true; g.add(body);
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
    hump.scale.set(1.0, 0.7, 0.8); hump.position.set(0.5, 1.62, 0); g.add(hump);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 12), skin);
    neck.position.set(0.85, 1.3, 0); neck.rotation.z = rad(-55); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), skin);
    head.scale.set(1.35, 0.9, 0.85); head.position.set(1.15, 1.45, 0); g.add(head);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.22, 12), skinD);
    muzzle.rotation.z = Math.PI / 2; muzzle.position.set(1.46, 1.4, 0); g.add(muzzle);
    for (const sz of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), EYE_MAT);
      eye.position.set(1.32, 1.5, sz * 0.17); g.add(eye);
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 14, Math.PI * 1.1), new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 0.6 }));
      horn.position.set(1.1, 1.62, sz * 0.2);
      horn.rotation.set(Math.PI / 2, 0, sz * rad(30));
      g.add(horn);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), skin);
      ear.scale.set(1.0, 0.5, 1.5); ear.position.set(1.0, 1.52, sz * 0.34); g.add(ear);
    }
    for (const sx of [0.6, -0.6]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 1.0, 9), skin);
      leg.position.set(sx, 0.5, sz * 0.34); g.add(leg);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 9), skinD);
      hoof.position.set(sx, 0.05, sz * 0.34); g.add(hoof);
    }
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.6, 3, 7), skin);
    tail.position.set(-0.97, 1.0, 0); tail.rotation.z = rad(-16); g.add(tail);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skinD);
    tuft.scale.set(0.7, 1.8, 0.7); tuft.position.set(-1.05, 0.66, 0); g.add(tuft);
    anim(g, (t, dt, self) => {
      tail.rotation.y = Math.sin(t * 2) * 0.5;
      head.position.y = 1.45 + Math.sin(t * 1.1) * 0.03;
    });
    return prop(g);
  };

  P.goat = function () { // 羊
    const m = M(), g = P.g();
    const wool = new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 1.0 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 11), wool);
    body.scale.set(1.45, 1.0, 1.0); body.position.y = 0.62; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), wool);
    head.position.set(0.45, 0.72, 0); g.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.95 }));
    muzzle.scale.set(1.2, 0.9, 0.9); muzzle.position.set(0.57, 0.69, 0); g.add(muzzle);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), wool);
    beard.position.set(0.57, 0.6, 0); beard.rotation.z = rad(6); g.add(beard);
    for (const sz of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), EYE_MAT);
      eye.position.set(0.54, 0.74, sz * 0.07); g.add(eye);
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.22, 7), new THREE.MeshStandardMaterial({ color: 0xb0a890, roughness: 0.6 }));
      horn.position.set(0.4, 0.87, sz * 0.08); horn.rotation.z = sz * rad(-22); g.add(horn);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), wool);
      ear.scale.set(1.0, 0.5, 1.6); ear.position.set(0.4, 0.76, sz * 0.15); g.add(ear);
    }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), wool);
    tail.scale.set(0.7, 1.3, 0.7); tail.position.set(-0.4, 0.72, 0); g.add(tail);
    for (const sx of [0.2, -0.2]) for (const sz of [-1, 1]) {
      const leg = legCap(0.04, 0.4, new THREE.MeshStandardMaterial({ color: 0x6a6055, roughness: 0.9 }));
      leg.position.set(sx, 0.24, sz * 0.13); g.add(leg);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 7), hoofMat);
      hoof.position.set(sx, 0.025, sz * 0.13); g.add(hoof);
    }
    return prop(g);
  };

  P.cat = function () { // 猫（常在墙头）
    const m = M(), g = P.g();
    const fur = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.95 });
    const fur2 = new THREE.MeshStandardMaterial({ color: 0x554e46, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), fur);
    body.scale.set(1.7, 0.85, 0.9); body.position.y = 0.2; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), fur);
    head.position.set(0.26, 0.29, 0); g.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), fur2);
    muzzle.scale.set(1.1, 0.8, 0.9); muzzle.position.set(0.33, 0.26, 0); g.add(muzzle);
    for (const sz of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 4), fur);
      ear.position.set(0.24, 0.4, sz * 0.06); g.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 5), EYE_MAT);
      eye.position.set(0.32, 0.32, sz * 0.05); g.add(eye);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), new THREE.MeshStandardMaterial({ color: 0xb87f7f, roughness: 0.6 }));
    nose.position.set(0.37, 0.3, 0); g.add(nose);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.3, 3, 7), fur);
    tail.position.set(-0.36, 0.26, 0); tail.rotation.z = rad(-45); g.add(tail);
    for (const sx of [0.1, -0.1]) for (const sz of [-1, 1]) {
      const leg = legCap(0.025, 0.11, fur);
      leg.position.set(sx, 0.08, sz * 0.06); g.add(leg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), fur2);
      paw.scale.set(1, 0.6, 1.3); paw.position.set(sx, 0.02, sz * 0.06 + 0.015); g.add(paw);
    }
    anim(g, (t, dt, self) => { tail.rotation.y = Math.sin(t * 3) * 0.8; });
    return prop(g);
  };

  MT.props = P;
})();
