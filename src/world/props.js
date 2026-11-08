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

  P.stoneMill = function () { // 石磨
    const m = M(), g = P.g();
    const wood = m.wood;
    // 木架 + 托盘
    const tray = B().cyl(0.88, 0.88, 0.07, wood, 18); tray.position.y = 0.42; g.add(tray);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = B().cyl(0.05, 0.062, 0.42, wood, 8);
      leg.position.set(sx * 0.62, 0.21, sz * 0.62); g.add(leg);
    }
    // 上下磨盘
    const lower = B().cyl(0.6, 0.6, 0.16, m.stone, 20); lower.position.y = 0.53; g.add(lower);
    const upper = B().cyl(0.56, 0.56, 0.22, m.stone, 20); upper.position.y = 0.72; g.add(upper);
    // 磨盘凿纹
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const groove = B().box(0.4, 0.02, 0.03, m.stone, 0.5);
      groove.position.set(Math.cos(a) * 0.3, 0.835, Math.sin(a) * 0.3);
      groove.rotation.y = -a; g.add(groove);
    }
    // 漏斗 + 磨眼
    const funnel = B().cyl(0.16, 0.05, 0.22, wood, 12); funnel.position.set(0.12, 1.0, 0); g.add(funnel);
    const eye = B().cyl(0.045, 0.045, 0.3, m.solidMud || m.mud, 8); eye.position.set(0.12, 0.78, 0); g.add(eye);
    // 磨棍
    const stick = B().cyl(0.04, 0.045, 0.9, wood, 8); stick.position.set(0.5, 0.98, 0); stick.rotation.z = rad(80); g.add(stick);
    const handle = B().cyl(0.03, 0.03, 0.3, wood, 8); handle.position.set(0.86, 1.06, 0); handle.rotation.x = rad(90); g.add(handle);
    return prop(g);
  };

  P.jar = function (r, h, color) { // 缸 / 坛子
    const m = M(), g = P.g();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.86, r * 0.72, h, 14, 1),
      new THREE.MeshStandardMaterial({ color: color || 0x4a3b2c, roughness: 0.4, metalness: 0.05 })
    );
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.86, r * 0.09, 6, 16), body.material);
    rim.rotation.x = Math.PI / 2; rim.position.y = h - 0.02; g.add(rim);
    if (Math.random() < 0.4) { // 盖
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.85, 0.06, 14), m.wood);
      lid.position.y = h + 0.03; g.add(lid);
    }
    return prop(g);
  };

  P.laundryLine = function (len) { // 晾衣绳
    const m = M(), g = P.g();
    for (const sx of [-1, 1]) {
      const post = B().box(0.09, 2.3, 0.09, m.wood, 0.6);
      post.position.set(sx * len / 2, 1.15, 0); g.add(post);
    }
    const rope = B().cyl(0.014, 0.014, len, m.metalDark, 5);
    rope.rotation.z = Math.PI / 2; rope.position.y = 2.24; g.add(rope);
    const cols = [m.cloth, m.clothBlue, m.clothRed, m.cloth, m.clothBlue];
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const w = 0.5 + Math.random() * 0.5;
      const h = 0.7 + Math.random() * 0.6;
      const c = B().plane(w, h, cols[(Math.random() * cols.length) | 0], 1, 1);
      c.position.set(-len / 2 + (i + 1) * (len / (n + 1)), 2.2 - h / 2, 0.01);
      c.castShadow = true;
      g.add(c);
    }
    // 被面 / 床单
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
    const bed = B().box(1.3, 0.08, 2.2, m.wood, 0.8);
    bed.position.set(0, 0.62, 0); g.add(bed);
    for (const sz of [-1, 1]) {
      const side = B().box(1.3, 0.34, 0.06, m.wood, 0.8);
      side.position.set(0, 0.82, sz * 1.08); g.add(side);
    }
    for (const sx of [-1, 1]) {
      const side = B().box(0.06, 0.3, 2.2, m.wood, 0.8);
      side.position.set(sx * 0.64, 0.8, 0); g.add(side);
    }
    const wheel = (x) => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 16), m.metalDark);
      w.position.set(x, 0.34, 0); w.rotation.y = Math.PI / 2; w.castShadow = true;
      const disc = B().cyl(0.3, 0.3, 0.05, m.metalDark, 14);
      disc.rotation.z = Math.PI / 2; w.add(disc);
      return w;
    };
    g.add(wheel(-0.72)); g.add(wheel(0.72));
    const axle = B().cyl(0.04, 0.04, 1.5, m.metalDark, 8);
    axle.rotation.z = Math.PI / 2; axle.position.set(0, 0.34, 0); g.add(axle);
    for (const sx of [-1, 1]) {
      const shaft = B().cyl(0.045, 0.045, 1.5, m.wood, 8);
      shaft.rotation.x = rad(84);
      shaft.position.set(sx * 0.45, 0.55, 1.85);
      g.add(shaft);
    }
    // 车上的粮食袋
    for (let i = 0; i < 3; i++) {
      const sack = B().box(0.5, 0.36, 0.7, m.straw, 0.5);
      sack.position.set(-0.3 + i * 0.3, 0.86 + (i % 2) * 0.02, -0.6 + i * 0.6);
      sack.rotation.y = (Math.random() - 0.5) * 0.4;
      g.add(sack);
    }
    return prop(g);
  };

  P.tricycle = function (electrified) { // 三轮车 / 电动三轮车
    const m = M(), g = P.g();
    const isE = electrified !== false;
    const box = B().box(1.25, 0.62, 1.6, isE ? m.blue : m.wood, 0.9);
    box.position.set(0, 0.86, -0.55); g.add(box);
    const bigWheel = () => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 14), m.metalDark);
      w.rotation.y = Math.PI / 2; w.castShadow = true;
      const d = B().cyl(0.27, 0.27, 0.05, m.metalDark, 12);
      d.rotation.z = Math.PI / 2; w.add(d); return w;
    };
    const w1 = bigWheel(); w1.position.set(-0.62, 0.3, -0.6); g.add(w1);
    const w2 = bigWheel(); w2.position.set(0.62, 0.3, -0.6); g.add(w2);
    const front = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 14), m.metalDark);
    front.rotation.y = Math.PI / 2; front.position.set(0, 0.28, 0.95); g.add(front);
    const frame = B().box(0.09, 0.09, 1.5, m.metalDark, 0.6);
    frame.position.set(0, 0.62, 0.3); g.add(frame);
    if (isE) {
      const cab = B().box(1.15, 1.0, 0.9, m.blue, 1.0);
      cab.position.set(0, 1.5, 0.45); g.add(cab);
      const windshield = B().plane(1.05, 0.85, m.glassDark, 1, 1);
      windshield.position.set(0, 1.5, 0.92); g.add(windshield);
      const cabTop = B().box(1.25, 0.1, 1.0, m.blue, 0.8);
      cabTop.position.set(0, 2.05, 0.45); g.add(cabTop);
      const motor = B().cyl(0.16, 0.16, 0.28, m.metalDark, 10);
      motor.rotation.z = Math.PI / 2; motor.position.set(0, 0.3, -0.6); g.add(motor);
    } else {
      const seat = B().box(0.34, 0.08, 0.3, m.metalDark, 0.4);
      seat.position.set(0, 0.95, 0.5); g.add(seat);
      const bar = B().box(0.5, 0.05, 0.05, m.metalDark, 0.4);
      bar.position.set(0, 1.08, 0.9); g.add(bar);
    }
    return prop(g);
  };

  P.tractor = function () { // 小四轮拖拉机 + 拖斗
    const m = M(), g = P.g();
    const body = B().box(1.1, 0.7, 1.7, m.metalDark, 1.0);
    body.position.set(0, 1.0, 0); g.add(body);
    const hood = B().box(0.9, 0.6, 1.0, m.green, 1.0);
    hood.position.set(0, 1.15, 1.35); g.add(hood);
    const grill = B().box(0.8, 0.4, 0.1, m.metalDark, 0.6);
    grill.position.set(0, 1.05, 1.88); g.add(grill);
    const seat = B().box(0.42, 0.1, 0.42, m.metalDark, 0.5);
    seat.position.set(0, 1.45, -0.4); g.add(seat);
    const wheel = (r, tw, x, z) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, tw, 16), m.metalDark);
      w.rotation.z = Math.PI / 2; w.position.set(x, r, z); w.castShadow = true;
      const tread = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.06, 5, 18), m.metalDark);
      tread.rotation.y = Math.PI / 2; w.add(tread);
      return w;
    };
    g.add(wheel(0.62, 0.3, -0.72, -0.55));
    g.add(wheel(0.62, 0.3, 0.72, -0.55));
    g.add(wheel(0.34, 0.2, -0.62, 1.5));
    g.add(wheel(0.34, 0.2, 0.62, 1.5));
    const pipe = B().cyl(0.055, 0.06, 1.1, m.metalDark, 8);
    pipe.position.set(0.35, 1.9, 0.9); g.add(pipe);
    const steer = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 14), m.metalDark);
    steer.rotation.x = rad(60); steer.position.set(0, 1.65, 0.15); g.add(steer);
    const column = B().cyl(0.035, 0.035, 0.6, m.metalDark, 6);
    column.position.set(0, 1.4, 0.2); column.rotation.x = rad(28); g.add(column);
    const canopy = B().box(1.5, 0.08, 1.6, m.metal, 1.0);
    canopy.position.set(0, 2.35, 0.1); g.add(canopy);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = B().cyl(0.04, 0.04, 1.0, m.metal, 6);
      post.position.set(sx * 0.66, 1.9, 0.1 + sz * 0.7); g.add(post);
    }
    // 拖斗
    const trailer = B().box(1.5, 0.7, 2.4, m.metal, 1.0);
    trailer.position.set(0, 0.85, -2.6); g.add(trailer);
    const tw = (x) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14), m.metalDark);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, -2.6); w.castShadow = true; return w;
    };
    g.add(tw(-0.82)); g.add(tw(0.82));
    const hitch = B().cyl(0.05, 0.05, 1.1, m.metalDark, 6);
    hitch.rotation.x = Math.PI / 2; hitch.position.set(0, 0.6, -1.4); g.add(hitch);
    // 车斗里的粮食
    for (let i = 0; i < 4; i++) {
      const p = B().box(0.5, 0.3, 0.6, m.straw, 0.5);
      p.position.set(-0.4 + (i % 2) * 0.8, 1.35, -3.2 + Math.floor(i / 2) * 0.8);
      g.add(p);
    }
    return prop(g);
  };

  P.stoneRoller = function () { // 石磙（碾场）
    const m = M(), g = P.g();
    const roll = B().cyl(0.45, 0.5, 0.85, m.stone, 18);
    roll.rotation.z = Math.PI / 2; roll.position.y = 0.48; g.add(roll);
    for (const sx of [-1, 1]) {
      const disc = B().cyl(0.16, 0.16, 0.06, m.wood, 10);
      disc.rotation.z = Math.PI / 2; disc.position.set(sx * 0.45, 0.48, 0); g.add(disc);
    }
    const axle = B().cyl(0.04, 0.04, 1.3, m.wood, 8);
    axle.rotation.z = Math.PI / 2; axle.position.y = 0.48; g.add(axle);
    for (const sx of [-1, 1]) {
      const arm = B().cyl(0.045, 0.045, 1.0, m.wood, 8);
      arm.rotation.x = rad(80); arm.position.set(sx * 0.62, 0.5, 0.5); g.add(arm);
    }
    return prop(g);
  };

  P.haystack = function (r, h) { // 草垛
    const m = M(), g = P.g();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r || 1.5, h || 2.2, 14, 3), m.straw);
    cone.position.y = (h || 2.2) / 2; cone.castShadow = true; cone.receiveShadow = true;
    g.add(cone);
    const top = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 10, 6), m.straw);
    top.position.y = (h || 2.2); g.add(top);
    return prop(g);
  };

  P.grainHeap = function (r, h) { // 粮堆
    const m = M(), g = P.g();
    const geo = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd9b95c, roughness: 1 }));
    mesh.scale.set(r || 1.6, h || 0.8, r || 1.6);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
    return prop(g);
  };

  P.basket = function (r, h) { // 箩筐
    const m = M(), g = P.g();
    const b = B().cyl(r, r * 0.8, h, m.straw, 12);
    b.position.y = h / 2; g.add(b);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 5, 14), m.straw);
    rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
    return prop(g);
  };

  P.dogHouse = function () { // 狗窝
    const m = M(), g = P.g();
    const b = B().box(0.9, 0.6, 0.8, m.wood, 0.6);
    b.position.y = 0.3; g.add(b);
    const roof = B().box(1.05, 0.1, 0.95, m.tileBlue, 0.7);
    roof.position.y = 0.66; roof.rotation.x = rad(12); g.add(roof);
    const hole = B().plane(0.4, 0.4, m.glassDark, 1, 1);
    hole.position.set(0, 0.3, 0.41); g.add(hole);
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
    const bodyMat = new THREE.MeshStandardMaterial({ color: white ? 0xf2ece0 : 0xc8873c, roughness: 0.9 });
    const combMat = new THREE.MeshStandardMaterial({ color: 0xc8342a, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 11), bodyMat);
    body.scale.set(1.3, 1.0, 1.0); body.position.y = 0.27; body.castShadow = true; g.add(body);
    // 翅膀
    for (const sz of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat);
      wing.scale.set(1.2, 0.72, 0.34); wing.position.set(-0.02, 0.3, sz * 0.13);
      wing.rotation.y = sz * rad(8); g.add(wing);
    }
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 3, 9), bodyMat);
    neck.position.set(0.19, 0.4, 0); neck.rotation.z = rad(-30); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 9), bodyMat);
    head.position.set(0.26, 0.48, 0); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.09, 6), m.yellow);
    beak.rotation.z = rad(-90); beak.position.set(0.33, 0.47, 0); g.add(beak);
    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), combMat);
    comb.scale.set(1.7, 0.9, 0.5); comb.position.set(0.26, 0.55, 0); g.add(comb);
    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), combMat);
    wattle.position.set(0.3, 0.44, 0); g.add(wattle);
    for (const sz of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), EYE_MAT);
      eye.position.set(0.3, 0.5, sz * 0.035); g.add(eye);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 7), bodyMat);
    tail.rotation.z = rad(64); tail.position.set(-0.2, 0.38, 0); tail.scale.set(1, 1, 0.5); g.add(tail);
    for (const sz of [-1, 1]) {
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), bodyMat);
      feather.rotation.z = rad(74); feather.rotation.y = sz * rad(18);
      feather.position.set(-0.2, 0.36, sz * 0.045); g.add(feather);
      const leg = legCap(0.013, 0.13, m.yellow);
      leg.position.set(0.02, 0.1, sz * 0.05); g.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), m.yellow);
      foot.scale.set(1.5, 0.35, 1.0); foot.position.set(0.05, 0.012, sz * 0.05); g.add(foot);
    }
    const head0 = head.position.clone();
    anim(g, (t, dt, self) => {
      const peck = Math.sin(t * 1.4 + self.position.x * 2.1);
      const k = Math.max(0, peck) * 0.5;
      head.position.set(0.26 + k * 0.06, 0.48 - k * 0.22, head0.z);
      neck.position.y = 0.4 - k * 0.11;
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
