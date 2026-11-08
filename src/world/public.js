/* =============================================================
 *  MyTown · 我的家乡 3D  —  公共建筑与地标
 *  public.js : 村委会、村小、小卖部、卫生室、碾米房、土地庙、
 *              任氏祠堂、水塔、电灌站、淮河渡口、任家老屋（可进入）
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad } = MT.util;

  const A = {};
  const B = () => MT.Build;
  const M = () => MT.M();
  const P = () => MT.props;
  function g(x, y, z, ry) {
    const o = new THREE.Group();
    if (x !== undefined) o.position.set(x, y, z);
    if (ry) o.rotation.y = ry;
    return o;
  }

  /* ---------- 室内家具 ---------- */
  A.furniture = {
    /** 长条几 + 八仙桌 + 太师椅（堂屋中堂） */
    hallSet() {
      const m = M(), o = g();
      const leg4 = (parent, h2, x, z, rt, rb) => { const l = B().cyl(rt, rb, h2, m.woodDark, 10); l.position.set(x, h2 / 2, z); parent.add(l); };
      // 长条几（翘头案）：圆腿 + 牙板 + 横枨 + 足托
      const table = g();
      const top = B().box(2.1, 0.08, 0.44, m.woodDark, 0.8);
      top.position.set(0, 0.88, 0); table.add(top);
      for (const sz of [-1, 1]) { const ap = B().box(1.98, 0.12, 0.05, m.woodDark, 0.5); ap.position.set(0, 0.8, sz * 0.185); table.add(ap); }
      for (const sx of [-1, 1]) {
        leg4(table, 0.84, sx * 0.96, 0.17, 0.055, 0.045);
        leg4(table, 0.84, sx * 0.96, -0.17, 0.055, 0.045);
        const foot = B().cyl(0.058, 0.07, 0.05, m.woodDark, 10); foot.position.set(sx * 0.96, 0.03, 0.17); table.add(foot);
        const foot2 = foot.clone(); foot2.position.z = -0.17; table.add(foot2);
        const str = B().box(0.04, 0.06, 0.32, m.woodDark, 0.4); str.position.set(sx * 0.96, 0.2, 0); table.add(str);
      }
      o.add(table);
      // 八仙桌：牙板 + 横枨 + 圆腿 + 束腰
      const bt = g();
      const btop = B().box(1.08, 0.06, 1.08, m.woodDark, 0.7); btop.position.y = 0.8; bt.add(btop);
      const waist = B().box(1.0, 0.05, 1.0, m.woodDark, 0.5); waist.position.y = 0.76; bt.add(waist);
      for (const sz of [-1, 1]) { const ap = B().box(0.98, 0.12, 0.06, m.woodDark, 0.5); ap.position.set(0, 0.7, sz * 0.48); bt.add(ap); }
      for (const sx of [-1, 1]) { const ap = B().box(0.06, 0.12, 0.98, m.woodDark, 0.5); ap.position.set(sx * 0.48, 0.7, 0); bt.add(ap); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        leg4(bt, 0.72, sx * 0.46, sz * 0.46, 0.05, 0.04);
        const foot = B().cyl(0.055, 0.068, 0.05, m.woodDark, 10); foot.position.set(sx * 0.46, 0.025, sz * 0.46); bt.add(foot);
      }
      for (const sz of [-1, 1]) { const st = B().box(0.88, 0.045, 0.045, m.woodDark, 0.4); st.position.set(0, 0.2, sz * 0.46); bt.add(st); }
      for (const sx of [-1, 1]) { const st = B().box(0.045, 0.045, 0.88, m.woodDark, 0.4); st.position.set(sx * 0.46, 0.2, 0); bt.add(st); }
      bt.position.set(0, 0, 1.15);
      o.add(bt);
      // 太师椅 ×2：卷书搭脑 + 靠背竖枨 + 扶手 + 踏枨
      for (const sx of [-1, 1]) {
        const ch = g();
        const seat = B().box(0.54, 0.06, 0.5, m.woodDark, 0.5); seat.position.y = 0.5; ch.add(seat);
        const sap = B().box(0.5, 0.08, 0.05, m.woodDark, 0.4); sap.position.set(0, 0.45, 0.23); ch.add(sap);
        const sap2 = sap.clone(); sap2.position.z = -0.23; ch.add(sap2);
        const backPlate = B().box(0.48, 0.32, 0.035, m.woodDark, 0.4); backPlate.position.set(0, 0.76, -0.23); ch.add(backPlate);
        for (const ax of [-1, 0, 1]) { const p = B().cyl(0.022, 0.022, 0.5, m.woodDark, 8); p.position.set(ax * 0.22, 0.78, -0.23); ch.add(p); }
        const topRail = B().box(0.56, 0.08, 0.07, m.woodDark, 0.4); topRail.position.set(0, 1.02, -0.23); ch.add(topRail);
        for (const ax of [-1, 1]) for (const az of [-1, 1]) leg4(ch, 0.5, ax * 0.23, az * 0.21, 0.03, 0.026);
        const footRail = B().box(0.5, 0.04, 0.04, m.woodDark, 0.4); footRail.position.set(0, 0.14, 0.21); ch.add(footRail);
        for (const ax of [-1, 1]) {
          const arm = B().box(0.05, 0.05, 0.46, m.woodDark, 0.4); arm.position.set(ax * 0.25, 0.72, 0); ch.add(arm);
          const armPost = B().cyl(0.02, 0.02, 0.2, m.woodDark, 6); armPost.position.set(ax * 0.25, 0.62, 0.2); ch.add(armPost);
        }
        ch.position.set(sx * 0.88, 0, 1.15);
        ch.rotation.y = -sx * rad(12);
        o.add(ch);
      }
      // 中堂画 / 家训
      const scroll = B().plane(1.5, 0.95, MT.texture.textMat('天地君亲师', {
        key: 'zhongtang', w: 640, h: 400, bg: '#e8dcc0', color: '#3a2a1a', fontSize: 96, serif: true,
      }), 1, 1);
      scroll.position.set(0, 2.05, -0.13);
      o.add(scroll);
      return MT.props.prop(o);
    },
    /** 碗柜 / 橱柜 */
    cupboard() {
      const m = M(), o = g();
      const body = B().box(1.0, 1.6, 0.45, m.wood, 0.8);
      body.position.y = 0.8; o.add(body);
      for (let i = 0; i < 2; i++) {
        const d = B().box(0.44, 0.6, 0.03, m.woodDark, 0.4);
        d.position.set(i ? 0.25 : -0.25, 1.1, 0.24); o.add(d);
      }
      const bowl = B().cyl(0.13, 0.09, 0.07, m.white, 12);
      bowl.position.set(-0.2, 1.63, 0); o.add(bowl);
      return MT.props.prop(o);
    },
    /** 灶台 */
    stove() {
      const m = M(), o = g();
      const body = B().box(1.8, 0.8, 0.9, m.brickRed, 1.0);
      body.position.y = 0.4; o.add(body);
      const top = B().box(1.9, 0.1, 1.0, m.cement, 0.8);
      top.position.y = 0.85; o.add(top);
      const pot = B().cyl(0.34, 0.3, 0.26, m.metalDark, 16);
      pot.position.set(-0.45, 1.0, 0); o.add(pot);
      const pot2 = B().cyl(0.26, 0.24, 0.2, m.metalDark, 16);
      pot2.position.set(0.45, 0.99, 0); o.add(pot2);
      const mouth = B().box(0.7, 0.6, 0.1, m.metalDark, 0.5);
      mouth.position.set(0, 0.35, 0.47); o.add(mouth);
      const chimney = B().cyl(0.14, 0.14, 2.4, m.brickRed, 10);
      chimney.position.set(-0.8, 1.2, -0.3); o.add(chimney);
      return MT.props.prop(o);
    },
    /** 木床 */
    bed() {
      const m = M(), o = g();
      const frame = B().box(1.3, 0.35, 2.0, m.wood, 0.8);
      frame.position.y = 0.28; o.add(frame);
      const mattress = B().box(1.24, 0.14, 1.94, m.cloth, 1.0);
      mattress.position.y = 0.5; o.add(mattress);
      const quilt = B().box(1.28, 0.2, 1.3, m.clothRed, 1.0);
      quilt.position.set(0, 0.62, 0.3); o.add(quilt);
      const pillow = B().box(0.5, 0.14, 0.3, m.cloth, 0.8);
      pillow.position.set(0, 0.62, -0.78); o.add(pillow);
      const net = B().box(1.4, 0.06, 0.06, m.wood, 0.5);
      net.position.set(0, 1.9, -1.0); o.add(net);
      for (const sx of [-1, 1]) {
        const post = B().box(0.06, 1.6, 0.06, m.wood, 0.5);
        post.position.set(sx * 0.68, 1.0, -1.0); o.add(post);
      }
      const netT = B().plane(1.4, 1.5, m.cloth, 1, 1);
      netT.material = new THREE.MeshStandardMaterial({ color: 0xeeeae0, roughness: 0.95, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      netT.position.set(0, 1.0, -1.02); o.add(netT);
      return MT.props.prop(o);
    },
    /** 板凳 */
    stool() {
      const m = M(), o = g();
      const top = B().box(0.36, 0.05, 0.24, m.wood, 0.4);
      top.position.y = 0.45; o.add(top);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = B().cyl(0.02, 0.017, 0.45, m.wood, 8);
        leg.position.set(sx * 0.15, 0.225, sz * 0.09); o.add(leg);
      }
      for (const sz of [-1, 1]) {
        const st = B().box(0.3, 0.025, 0.025, m.wood, 0.3);
        st.position.set(0, 0.18, sz * 0.09); o.add(st);
      }
      return MT.props.prop(o);
    },
    /** 老式挂钟 */
    clock() {
      const m = M(), o = g();
      const body = B().box(0.34, 0.76, 0.16, m.woodDark, 0.5); body.position.y = 1.9; o.add(body);
      const crown = B().box(0.4, 0.08, 0.2, m.woodDark, 0.4); crown.position.y = 2.3; o.add(crown);
      const base = B().box(0.4, 0.08, 0.2, m.woodDark, 0.4); base.position.y = 1.5; o.add(base);
      const face = B().cyl(0.13, 0.13, 0.02, m.white, 18); face.rotation.x = Math.PI / 2; face.position.set(0, 2.14, 0.09); o.add(face);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.012, 6, 20), m.yellow); ring.position.set(0, 2.14, 0.095); o.add(ring);
      const glass = B().box(0.28, 0.32, 0.01, m.window, 0.3); glass.position.set(0, 1.72, 0.085); o.add(glass);
      const pend = B().box(0.02, 0.34, 0.02, m.yellow, 0.3); pend.position.set(0, 1.6, 0.06); o.add(pend);
      const bob = B().cyl(0.055, 0.055, 0.02, m.yellow, 14); bob.rotation.x = Math.PI / 2; bob.position.set(0, 1.42, 0.07); o.add(bob);
      return MT.props.prop(o);
    },
    /** 神龛 / 供桌 */
    shrine() {
      const m = M(), o = g();
      const tbl = B().box(1.1, 0.08, 0.5, m.woodDark, 0.6);
      tbl.position.y = 0.82; o.add(tbl);
      for (const sx of [-1, 1]) {
        const leg = B().box(0.08, 0.8, 0.44, m.woodDark, 0.5);
        leg.position.set(sx * 0.48, 0.4, 0); o.add(leg);
      }
      const niche = B().box(0.8, 0.7, 0.3, m.woodDark, 0.6);
      niche.position.set(0, 1.25, -0.05); o.add(niche);
      const nicheIn = B().box(0.66, 0.56, 0.26, m.red, 0.5);
      nicheIn.position.set(0, 1.25, 0.01); o.add(nicheIn);
      const tablet = B().box(0.16, 0.42, 0.03, m.woodDark, 0.2);
      tablet.position.set(0, 1.2, 0.16); o.add(tablet);
      // 蜡烛
      for (const sx of [-1, 1]) {
        const c = B().cyl(0.035, 0.035, 0.22, m.red, 8);
        c.position.set(sx * 0.36, 0.97, 0.14); o.add(c);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6),
          new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xff9a2a, emissiveIntensity: 1.6 }));
        flame.position.set(sx * 0.36, 1.12, 0.14); o.add(flame);
      }
      const burner = P().incenseBurner();
      burner.position.set(0, 0.86, 0.3);
      burner.scale.setScalar(0.7);
      o.add(burner);
      return MT.props.prop(o);
    },
    /** 织布机（老物件） */
    loom() {
      const m = M(), o = g();
      const frame = B().box(0.9, 0.08, 1.5, m.wood, 0.6);
      frame.position.y = 0.72; o.add(frame);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = B().box(0.07, 0.72, 0.07, m.wood, 0.5);
        leg.position.set(sx * 0.4, 0.36, sz * 0.68); o.add(leg);
      }
      for (let i = 0; i < 5; i++) {
        const warp = B().cyl(0.012, 0.012, 1.4, m.cloth, 5);
        warp.rotation.x = Math.PI / 2; warp.position.set(-0.3 + i * 0.15, 0.8, 0); o.add(warp);
      }
      const beam = B().cyl(0.06, 0.06, 0.9, m.wood, 8);
      beam.rotation.z = Math.PI / 2; beam.position.set(0, 1.15, -0.6); o.add(beam);
      const cloth = B().plane(0.5, 0.9, m.clothRed, 1, 1);
      cloth.rotation.x = -Math.PI / 2; cloth.position.set(0.05, 0.78, 0.1); o.add(cloth);
      return MT.props.prop(o);
    },
  };

  /* =========================================================
   *  任家老屋（可进入的土坯老宅，含堂屋陈设）
   * ========================================================= */
  A.oldHouse = function () {
    const m = M();
    const root = g();
    const w = 10.8, d = 6.8, h = 3.4;
    const room = B().openRoom({
      w, d, h, wallMat: m.mud, doorW: 1.7, doorH: 2.25, roof: 'none',
      floorMat: MT.mat.solid(0x8a7a60, { roughness: 1 }),
    });
    // 土坯墙的岁月痕迹：加一圈墙裙与裂缝
    root.add(room);
    const roof = B().gableRoof(w, d, h, { angle: rad(25), mat: m.tile, wallMat: m.mud, eave: 0.55, tile: 1.5 });
    roof.position.y = 0;
    root.add(roof);
    // 门（半掩的木门）
    const door = B().door(1.7, 2.25, { mat: m.wood, spring: true });
    door.position.set(0, 0.02, d / 2 + 0.16);
    root.add(door);
    // 窗
    for (const sx of [-1, 1]) {
      const win = B().window(1.2, 1.25, { bars: true });
      win.position.set(sx * w * 0.3, 1.75, d / 2 + 0.17);
      root.add(win);
    }
    // 室内陈设
    const fs = A.furniture;
    const hall = fs.hallSet();
    hall.position.set(0, 0.12, -d / 2 + 1.4);
    root.add(hall);
    const stool = fs.stool(); stool.position.set(-1.6, 0.12, -d / 2 + 2.2); root.add(stool);
    const stool2 = fs.stool(); stool2.position.set(1.7, 0.12, -d / 2 + 2.3); stool2.rotation.y = rad(30); root.add(stool2);
    const clock = fs.clock(); clock.position.set(-w * 0.28, 0.12, -d / 2 + 0.2); root.add(clock);
    const loom = fs.loom(); loom.position.set(w * 0.32, 0.12, -d * 0.12); loom.rotation.y = rad(-8); root.add(loom);
    const shrine = fs.shrine(); shrine.position.set(w * 0.34, 0.12, d / 2 - 0.9); root.add(shrine);
    const bed = fs.bed(); bed.position.set(-w * 0.3, 0.12, d * 0.06); bed.rotation.y = rad(90); root.add(bed);
    const cupboard = fs.cupboard(); cupboard.position.set(w * 0.05, 0.12, d / 2 - 0.5); root.add(cupboard);
    // 农具靠墙
    const hoe = B().cyl(0.03, 0.03, 1.5, m.wood, 6);
    hoe.position.set(w * 0.46, 0.9, -d * 0.28); hoe.rotation.z = rad(8); root.add(hoe);
    const hoeHead = B().box(0.06, 0.16, 0.26, m.metalDark, 0.4);
    hoeHead.position.set(w * 0.53, 0.16, -d * 0.28); root.add(hoeHead);
    // 梁上挂玉米
    root.userData.enterable = true;
    root.userData.roomInfo = { w, d, h };
    return root;
  };

  /* =========================================================
   *  土地庙
   * ========================================================= */
  A.temple = function () {
    const m = M();
    const root = g();
    const w = 2.4, d = 2.0, h = 2.2;
    // 台基
    const base = B().box(w + 1.0, 0.4, d + 1.0, m.stone, 1.0);
    base.position.y = 0.2; root.add(base);
    // 后墙与侧墙
    const back = B().box(w, h, 0.24, m.brickGrey, 1.2);
    back.position.set(0, h / 2 + 0.4, -d / 2); root.add(back);
    for (const sx of [-1, 1]) {
      const side = B().box(0.24, h, d, m.brickGrey, 1.2);
      side.position.set(sx * w / 2, h / 2 + 0.4, 0); root.add(side);
    }
    // 神像（土地公、土地婆）
    for (const [sx, c] of [[-0.45, 0xc9a86a], [0.45, 0xd8c090]]) {
      const statue = g();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.7, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
      body.position.y = 0.35; statue.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), body.material);
      head.position.y = 0.86; statue.add(head);
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 12), body.material);
      hat.position.y = 1.0; statue.add(hat);
      statue.position.set(sx, 0.4, -d * 0.1);
      root.add(statue);
    }
    // 供桌 + 香炉
    const tbl = B().box(1.6, 0.1, 0.6, m.woodDark, 0.6);
    tbl.position.set(0, 0.9, 0.42); root.add(tbl);
    for (const sx of [-1, 1]) {
      const leg = B().box(0.1, 0.5, 0.5, m.woodDark, 0.5);
      leg.position.set(sx * 0.68, 0.65, 0.42); root.add(leg);
    }
    const burner = P().incenseBurner();
    burner.position.set(0, 0.95, 0.42); burner.scale.setScalar(0.8); root.add(burner);
    // 供品
    for (let i = 0; i < 3; i++) {
      const bowl = B().cyl(0.09, 0.06, 0.06, m.white, 10);
      bowl.position.set(-0.4 + i * 0.4, 1.0, 0.55); root.add(bowl);
    }
    // 屋顶（带翘角感觉的小坡顶）
    const roof = B().gableRoof(w + 1.1, d + 1.1, h + 0.4, { angle: rad(28), mat: m.tile, wallMat: m.brickGrey, eave: 0.5, tile: 1.3 });
    root.add(roof);
    // 匾额与楹联
    const pl = MT.texture.plaque('土地庙', 1.5, 0.44, { bg: '#3a2a1a', color: '#e8c96a' });
    pl.position.set(0, h + 0.36, d / 2 + 0.5); root.add(pl);
    for (const sx of [-1, 1]) {
      const couplet = B().plane(0.3, 1.8, MT.texture.textMat(
        sx < 0 ? '土能生白玉' : '地可出黄金',
        { key: 'couplet' + sx, w: 220, h: 900, bg: '#c8342a', color: '#ffe9b0', vertical: true, fontSize: 130, serif: true }
      ), 1, 1);
      couplet.position.set(sx * (w / 2 + 0.3), 1.35, d / 2 + 0.3);
      root.add(couplet);
    }
    // 灯笼
    for (const sx of [-1, 1]) {
      const l = P().lantern();
      l.position.set(sx * (w / 2 + 0.55), 1.5, d / 2 + 0.35);
      root.add(l);
    }
    // 小树 / 柏
    return root;
  };

  /* =========================================================
   *  任氏祠堂（可进入）
   * ========================================================= */
  A.ancestralHall = function (surname) {
    const m = M();
    const root = g();
    const w = 12, d = 8, h = 4.2;
    // 台基
    const base = B().box(w + 2.4, 0.5, d + 2.4, m.stone, 1.6);
    base.position.y = 0.25; root.add(base);
    const room = B().openRoom({
      w, d, h, wallMat: m.brickGrey, doorW: 2.6, doorH: 2.8, roof: 'none',
      floorMat: MT.mat.solid(0x8f8a7c, { roughness: 0.95 }),
      roofMat: m.tile,
    });
    room.position.y = 0.5;
    root.add(room);
    const roof = B().gableRoof(w + 0.8, d + 0.8, h + 0.5, { angle: rad(30), mat: m.tile, wallMat: m.brickGrey, eave: 0.8, tile: 1.8 });
    root.add(roof);
    // 匾额
    const pl = MT.texture.plaque((surname || '任') + '氏宗祠', 2.6, 0.62, { bg: '#2f1c12', color: '#e8c96a', border: true });
    pl.position.set(0, 3.5, d / 2 + 0.3); root.add(pl);
    // 廊柱
    for (const sx of [-1, 1]) {
      const col = B().cyl(0.19, 0.21, 3.4, m.red, 12);
      col.position.set(sx * (w / 2 - 0.7), 0.5 + 1.7, d / 2 + 0.55);
      root.add(col);
      const colBase = B().cyl(0.26, 0.3, 0.2, m.stone, 12);
      colBase.position.set(sx * (w / 2 - 0.7), 0.6, d / 2 + 0.55);
      root.add(colBase);
    }
    // 门内：祖宗牌位龛
    const fs = A.furniture;
    const shrine = g();
    const base2 = B().box(4.0, 0.9, 1.0, m.woodDark, 1.0);
    base2.position.set(0, 0.95, -d / 2 + 1.0); shrine.add(base2);
    const tier = B().box(3.6, 0.5, 0.7, m.woodDark, 0.8);
    tier.position.set(0, 1.62, -d / 2 + 1.0); shrine.add(tier);
    for (let i = 0; i < 9; i++) {
      const t = B().box(0.16, 0.5, 0.05, m.woodDark, 0.2);
      t.position.set(-1.5 + i * 0.375, 1.6, -d / 2 + 0.75);
      shrine.add(t);
      const tt = B().plane(0.14, 0.42, MT.texture.textMat('任', {
        key: 'tablet', w: 128, h: 384, bg: '#3a2a1a', color: '#d8c48a', vertical: true, fontSize: 110,
      }), 1, 1);
      tt.position.set(-1.5 + i * 0.375, 1.6, -d / 2 + 0.72);
      shrine.add(tt);
    }
    shrine.position.y = 0.5;
    root.add(shrine);
    // 供桌与香炉
    const tbl = B().box(2.2, 0.12, 0.8, m.woodDark, 0.8);
    tbl.position.set(0, 0.5 + 0.85, -d / 2 + 2.6); root.add(tbl);
    for (const sx of [-1, 1]) {
      const leg = B().box(0.12, 0.8, 0.7, m.woodDark, 0.6);
      leg.position.set(sx * 0.95, 0.5 + 0.4, -d / 2 + 2.6); root.add(leg);
    }
    const burner = P().incenseBurner();
    burner.position.set(0, 0.5 + 0.92, -d / 2 + 2.6); root.add(burner);
    // 蜡烛
    for (const sx of [-1, 1]) {
      const c = B().cyl(0.05, 0.05, 0.34, m.red, 8);
      c.position.set(sx * 0.8, 0.5 + 1.1, -d / 2 + 2.6); root.add(c);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6),
        new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xff9a2a, emissiveIntensity: 1.8 }));
      flame.position.set(sx * 0.8, 0.5 + 1.32, -d / 2 + 2.6); root.add(flame);
    }
    // 两侧对联
    for (const sx of [-1, 1]) {
      const c = B().plane(0.42, 3.0, MT.texture.textMat(
        sx < 0 ? '祖德流芳远' : '宗功世泽长',
        { key: 'hallc' + sx, w: 260, h: 1400, bg: '#8f2018', color: '#f0dca0', vertical: true, fontSize: 150, serif: true }
      ), 1, 1);
      c.position.set(sx * (w / 2 - 0.16), 2.1, -d / 2 + 0.2);
      root.add(c);
    }
    // 天井里的香炉台
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  村委会
   * ========================================================= */
  A.committee = function (rng) {
    const m = M();
    const root = g();
    const w = 12, d = 7, h = 3.8;
    const base = B().box(w + 1.6, 0.6, d + 1.6, m.cement, 1.4);
    base.position.y = 0.3; root.add(base);
    const room = B().openRoom({ w, d, h, wallMat: m.white, doorW: 2.2, doorH: 2.6, roof: 'flat' });
    room.position.y = 0.6;
    root.add(room);
    // 平顶女儿墙由 flatRoof 提供；加旗杆
    const pole = B().cyl(0.07, 0.09, 9, m.steel, 10);
    pole.position.set(-w / 2 - 2.5, 4.5, d / 2); root.add(pole);
    const flag = B().plane(1.5, 1.0, m.red, 1, 1);
    flag.position.set(-w / 2 - 2.5 + 0.78, 8.6, d / 2 + 0.02); root.add(flag);
    MT.props.anim(flag, (t) => { flag.rotation.y = Math.sin(t * 1.4) * 0.2 - 0.1; });
    // 大喇叭
    const sp = g();
    for (const sx of [-1, 1]) {
      const horn = B().cyl(0.12, 0.3, 0.5, m.metalDark, 12);
      horn.position.set(sx * 0.35, 0, 0.15);
      horn.rotation.x = rad(-72); horn.rotation.z = sx * rad(20);
      sp.add(horn);
    }
    const spBox = B().box(0.34, 0.26, 0.22, m.metalDark, 0.4);
    sp.add(spBox);
    sp.position.set(w / 2 - 1.0, h + 2.4, -d / 2 + 0.6);
    root.add(sp);
    // 院内的村务公开栏、旗台
    const board = MT.props.noticeBoard('村务公开　乡村振兴\n产业发展　共同富裕', { w: 5.4, h: 2.4 });
    board.position.set(-w / 2 - 1.5, 0, d / 2 + 1.0);
    board.rotation.y = rad(0);
    root.add(board);
    // 办公室内
    const fs = A.furniture;
    const desk = g();
    const dt = B().box(1.8, 0.08, 0.85, m.woodDark, 0.8);
    dt.position.y = 0.76; desk.add(dt);
    for (const sx of [-1, 1]) {
      const leg = B().box(0.08, 0.76, 0.78, m.woodDark, 0.5);
      leg.position.set(sx * 0.82, 0.38, 0); desk.add(leg);
    }
    const chair = fs.stool(); chair.scale.setScalar(1.1); chair.position.set(0, 0, 0.7); desk.add(chair);
    const pc = B().box(0.5, 0.34, 0.06, m.glassDark, 0.4);
    pc.position.set(0.4, 1.05, -0.2); desk.add(pc);
    const pcStand = B().box(0.16, 0.1, 0.12, m.metalDark, 0.3);
    pcStand.position.set(0.4, 0.85, -0.2); desk.add(pcStand);
    const wmW = new THREE.MeshStandardMaterial({ map: MT.texture.textTex('slogan-wall', '为人民服务', { w: 1024, h: 256, bg: '#c8342a', color: '#ffe9b0', fontSize: 150, serif: true }), roughness: 0.9 });
    const slogan = B().plane(3.2, 0.8, wmW, 1, 1);
    slogan.position.set(0, 3.0, -d / 2 + 0.17); root.add(slogan);
    desk.position.set(0, 0.6, -d / 2 + 2.6);
    root.add(desk);
    const cup = fs.cupboard(); cup.position.set(w / 2 - 0.8, 0.6, d / 2 - 0.9); root.add(cup);
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  村小学
   * ========================================================= */
  A.school = function () {
    const m = M();
    const root = g();
    const w = 18, d = 8, h = 3.9;
    const base = B().box(w + 1.2, 0.5, d + 1.2, m.cement, 1.6);
    base.position.y = 0.25; root.add(base);
    // 教学楼：两层
    for (let s = 0; s < 2; s++) {
      const wall = B().box(w, 3.6, d, m.white, 1.8);
      wall.position.y = 0.5 + 1.8 + s * 3.6;
      root.add(wall);
      // 走廊栏杆
      const rail = B().box(w, 0.08, 0.08, m.steel, 0.7);
      rail.position.set(0, 0.5 + 1.8 + s * 3.6 + 0.9, d / 2 + 0.35); root.add(rail);
      for (let i = -8; i <= 8; i++) {
        const post = B().box(0.05, 0.9, 0.05, m.steel, 0.4);
        post.position.set(i * 1.05, 0.5 + 1.8 + s * 3.6 + 0.45, d / 2 + 0.35); root.add(post);
      }
      // 门窗
      for (let i = -2; i <= 2; i++) {
        const win = B().window(1.5, 1.5, {});
        win.position.set(i * 3.2, 0.5 + 1.0 + s * 3.6, d / 2 + 0.06);
        root.add(win);
        const door = B().door(1.0, 2.1, { mat: m.wood, studs: false });
        door.position.set(i * 3.2 + 1.6, 0.5 + s * 3.6 + 0.05, d / 2 + 0.06);
        root.add(door);
      }
    }
    const roof = B().flatRoof(w, d, 0.5 + 7.2, { railing: true });
    root.add(roof);
    // 牌匾
    const pl = MT.texture.plaque('固城乡任庄村小学', 5.2, 0.7, { bg: '#a8251b', color: '#f6e2a8' });
    pl.position.set(0, 4.5, d / 2 + 0.34); root.add(pl);
    // 操场 + 篮球架
    const court = B().plane(16, 22, MT.mat.cement(1, 1), 5, 7);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.03, d / 2 + 13);
    root.add(court);
    const hoop = (x) => {
      const gg = g();
      const pole = B().cyl(0.09, 0.11, 4.0, m.steel, 10);
      pole.position.y = 2.0; gg.add(pole);
      const arm = B().box(0.08, 0.08, 1.1, m.steel, 0.5);
      arm.position.set(0, 3.6, 0.55); gg.add(arm);
      const board = B().box(1.6, 1.05, 0.06, m.white, 0.8);
      board.position.set(0, 3.6, 1.06); gg.add(board);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 16), m.red);
      ring.rotation.x = Math.PI / 2; ring.position.set(0, 3.28, 1.2); gg.add(ring);
      gg.position.set(x, 0, d / 2 + 3.5);
      return MT.props.prop(gg);
    };
    root.add(hoop(-7)); root.add(hoop(7));
    // 旗杆
    const pole = B().cyl(0.07, 0.09, 8.5, m.steel, 10);
    pole.position.set(0, 4.25, d / 2 + 3.0); root.add(pole);
    const flag = B().plane(1.4, 0.95, m.red, 1, 1);
    flag.position.set(0.73, 8.1, d / 2 + 3.0); root.add(flag);
    MT.props.anim(flag, (t) => { flag.rotation.y = Math.sin(t * 1.2) * 0.25; });
    // 单杠 / 双杠
    const bar = B().cyl(0.035, 0.035, 2.4, m.steel, 8);
    bar.rotation.z = Math.PI / 2; bar.position.set(-6, 1.6, d / 2 + 20); root.add(bar);
    for (const sx of [-1, 1]) {
      const post = B().cyl(0.05, 0.05, 1.6, m.steel, 8);
      post.position.set(sx * 1.2 - 6, 0.8, d / 2 + 20); root.add(post);
    }
    // 围墙
    const mk = (len, x, z, ry) => {
      const wall = B().wall(len, { h: 1.8, mat: m.white });
      wall.position.set(x, 0, z); wall.rotation.y = ry;
      root.add(wall);
    };
    mk(30, -16, d / 2 + 13, Math.PI / 2);
    mk(30, 16, d / 2 + 13, Math.PI / 2);
    mk(32, 0, d / 2 + 28, 0);
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  小卖部
   * ========================================================= */
  A.shop = function (name) {
    const m = M();
    const root = g();
    const w = 6.2, d = 5.4, h = 3.3;
    const room = B().openRoom({ w, d, h, wallMat: m.white, doorW: 1.4, doorH: 2.3, roof: 'flat' });
    root.add(room);
    // 招牌
    const pl = MT.texture.plaque(name || '任庄小卖部', 3.0, 0.6, { bg: '#1a6b4a', color: '#f6f0d8' });
    pl.position.set(0, h - 0.5, d / 2 + 0.25); root.add(pl);
    // 雨棚
    const aw = B().box(w, 0.08, 1.8, m.metal, 1.0);
    aw.position.set(0, h - 1.0, d / 2 + 0.9); aw.rotation.x = rad(-6); root.add(aw);
    for (const sx of [-1, 1]) {
      const p = B().cyl(0.04, 0.04, h - 1.0, m.metal, 8);
      p.position.set(sx * (w / 2 - 0.3), (h - 1.0) / 2, d / 2 + 1.6); root.add(p);
    }
    // 柜台 + 货架
    const counter = B().box(3.4, 0.9, 0.7, m.wood, 1.0);
    counter.position.set(0, 0.45, d / 2 - 1.4); root.add(counter);
    const shelf = g();
    for (let i = 0; i < 3; i++) {
      const s = B().box(3.6, 0.06, 0.4, m.wood, 0.8);
      s.position.set(0, 0.6 + i * 0.6, -d / 2 + 0.9); shelf.add(s);
    }
    const colors = [0xd8483a, 0x3a78c8, 0xe0b040, 0x48a05a, 0xd07030];
    for (let i = 0; i < 22; i++) {
      const box = B().box(0.22, 0.3, 0.18, MT.mat.solid(colors[i % colors.length], { roughness: 0.7 }), 0.4);
      box.position.set(-1.6 + (i % 8) * 0.4, 0.76 + Math.floor(i / 8) * 0.6, -d / 2 + 0.9);
      shelf.add(box);
    }
    shelf.position.y = 0.04;
    root.add(shelf);
    // 冰柜
    const freezer = B().box(1.4, 0.9, 0.7, m.white, 1.0);
    freezer.position.set(-w / 2 + 1.1, 0.45, d / 2 - 1.2); root.add(freezer);
    const lid = B().box(1.45, 0.08, 0.75, m.steel, 0.8);
    lid.position.set(-w / 2 + 1.1, 0.94, d / 2 - 1.2); root.add(lid);
    // 门口的水泥台阶 + 塑料凳
    for (let i = 0; i < 2; i++) {
      const st = B().box(w, 0.14, 0.4 + i * 0.2, m.cement, 0.8);
      st.position.set(0, 0.07 + i * 0.14, d / 2 + 0.3 + i * 0.2); root.add(st);
    }
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  卫生室
   * ========================================================= */
  A.clinic = function () {
    const m = M();
    const root = g();
    const w = 7.5, d = 5.6, h = 3.4;
    const room = B().openRoom({ w, d, h, wallMat: m.white, doorW: 1.5, doorH: 2.3, roof: 'flat' });
    root.add(room);
    const pl = MT.texture.plaque('任庄村卫生室', 3.2, 0.55, { bg: '#f4f4f0', color: '#1e6b3a' });
    pl.position.set(0, h - 0.6, d / 2 + 0.25); root.add(pl);
    // 红十字
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.6 });
    const c1 = B().box(0.9, 0.28, 0.06, crossMat, 0.5);
    c1.position.set(-w / 2 + 1.3, h - 0.5, d / 2 + 0.2); root.add(c1);
    const c2 = B().box(0.28, 0.9, 0.06, crossMat, 0.5);
    c2.position.set(-w / 2 + 1.3, h - 0.5, d / 2 + 0.2); root.add(c2);
    // 输液椅、药柜
    for (let i = 0; i < 3; i++) {
      const chair = B().box(0.6, 0.08, 0.6, m.steel, 0.5);
      chair.position.set(-2 + i * 1.6, 0.5, d / 2 - 1.6); root.add(chair);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = B().cyl(0.03, 0.03, 0.5, m.steel, 6);
        leg.position.set(-2 + i * 1.6 + sx * 0.24, 0.25, d / 2 - 1.6 + sz * 0.24); root.add(leg);
      }
    }
    const cab = B().box(1.6, 2.0, 0.5, m.white, 1.0);
    cab.position.set(w / 2 - 1.0, 1.0, -d / 2 + 0.5); root.add(cab);
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  碾米房 / 磨坊
   * ========================================================= */
  A.mill = function () {
    const m = M();
    const root = g();
    const w = 7, d = 6, h = 3.6;
    const room = B().openRoom({ w, d, h, wallMat: m.brickGrey, doorW: 2.4, doorH: 2.6, roof: 'none' });
    root.add(room);
    const roof = B().gableRoof(w + 0.6, d + 0.6, h, { angle: rad(24), mat: m.tile, wallMat: m.brickGrey, eave: 0.5, tile: 1.6 });
    root.add(roof);
    const pl = MT.texture.plaque('碾 米 房', 2.2, 0.5, { bg: '#3a3a38', color: '#e0dcc0' });
    pl.position.set(0, h - 0.6, d / 2 + 0.25); root.add(pl);
    // 机器
    const machine = g();
    const body = B().box(1.2, 1.0, 1.8, m.metalDark, 1.0);
    body.position.y = 0.9; machine.add(body);
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.3, 0.8, 8), m.metal);
    hopper.position.y = 1.85; machine.add(hopper);
    const motor = B().cyl(0.3, 0.3, 0.7, m.blue, 12);
    motor.rotation.z = Math.PI / 2; motor.position.set(0.9, 0.5, 0); machine.add(motor);
    const pipe = B().cyl(0.18, 0.18, 1.4, m.metal, 10);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(-1.2, 1.0, 0.6); machine.add(pipe);
    machine.position.set(-w / 2 + 2.0, 0, 0);
    machine.rotation.y = rad(90);
    root.add(MT.props.prop(machine));
    // 麻袋堆
    for (let i = 0; i < 6; i++) {
      const sack = B().box(0.7, 0.45, 0.4, m.straw, 0.6);
      sack.position.set(w / 2 - 1.2 - (i % 2) * 0.3, 0.24 + Math.floor(i / 2) * 0.46, -1 + (i % 2) * 0.6);
      sack.rotation.y = (Math.random() - 0.5) * 0.3;
      root.add(MT.props.prop(sack));
    }
    // 箩筐
    const basket = P().basket(0.5, 0.5);
    basket.position.set(w / 2 - 1.6, 0, 1.6); root.add(basket);
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  水塔
   * ========================================================= */
  A.waterTower = function () {
    const m = M();
    const root = g();
    const H = 12;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = B().cyl(0.16, 0.2, H, m.concrete, 8);
      leg.position.set(sx * 1.5, H / 2, sz * 1.5);
      root.add(leg);
      // 斜撑
      const brace = B().cyl(0.08, 0.08, 3.6, m.concrete, 6);
      brace.position.set(sx * 0.85, H * 0.45, sz * 0.85);
      brace.rotation.set(sz * rad(30), 0, -sx * rad(30));
      root.add(brace);
    }
    for (const y of [H * 0.4, H * 0.72, H - 1.6]) {
      for (const r of [0, Math.PI / 2]) {
        const ring = B().box(4.4, 0.16, 0.16, m.concrete, 1.0);
        ring.position.set(0, y, 0);
        ring.rotation.y = r; root.add(ring);
      }
    }
    const tank = B().cyl(2.6, 2.6, 3.6, m.cement, 18);
    tank.position.y = H + 1.8; root.add(tank);
    const tankTop = B().cyl(0.2, 2.7, 0.6, m.cement, 18);
    tankTop.position.y = H + 3.9; root.add(tankTop);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.04, 5, 20), m.steel);
    rail.rotation.x = Math.PI / 2; rail.position.y = H + 3.2; root.add(rail);
    const ladder = g();
    for (let i = 0; i < 26; i++) {
      const rung = B().cyl(0.025, 0.025, 0.5, m.metalDark, 6);
      rung.rotation.z = Math.PI / 2; rung.position.y = 0.5 + i * 0.45; ladder.add(rung);
    }
    for (const sx of [-1, 1]) {
      const side = B().cyl(0.03, 0.03, H + 3, m.metalDark, 6);
      side.position.set(sx * 0.25, (H + 3) / 2, 0); ladder.add(side);
    }
    ladder.position.set(0, 0, 2.62);
    root.add(ladder);
    // 出水管
    const pipe = B().cyl(0.14, 0.14, 6, m.steel, 10);
    pipe.position.set(2.2, 4, 0); root.add(pipe);
    const pipeBend = B().cyl(0.14, 0.14, 2.4, m.steel, 10);
    pipeBend.rotation.z = Math.PI / 2; pipeBend.position.set(3.3, 1.2, 0); root.add(pipeBend);
    return root;
  };

  /* =========================================================
   *  电灌站（淮河灌溉泵站）
   * ========================================================= */
  A.pumpStation = function () {
    const m = M();
    const root = g();
    const w = 6.5, d = 5, h = 3.4;
    const base = B().box(w + 1, 0.8, d + 1, m.cement, 1.2);
    base.position.y = 0.4; root.add(base);
    const room = B().openRoom({ w, d, h, wallMat: m.brickRed, doorW: 1.6, doorH: 2.4, roof: 'flat' });
    room.position.y = 0.8;
    root.add(room);
    const pl = MT.texture.plaque('任庄电灌站', 3.0, 0.55, { bg: '#2a4a6a', color: '#e8e4d0' });
    pl.position.set(0, 0.8 + h - 0.55, d / 2 + 0.22); root.add(pl);
    // 进出水管
    const pipeIn = B().cyl(0.3, 0.3, 9, m.steel, 12);
    pipeIn.rotation.z = rad(72); pipeIn.position.set(-w / 2 - 3.2, -1.6, 0); root.add(pipeIn);
    const pipeEnd = B().cyl(0.36, 0.36, 1.2, m.metalDark, 12);
    pipeEnd.rotation.z = rad(72); pipeEnd.position.set(-w / 2 - 6.0, -3.2, 0); root.add(pipeEnd);
    const pipeOut = B().cyl(0.26, 0.26, 2.0, m.steel, 12);
    pipeOut.position.set(w / 2 + 1.0, 1.6, 0); root.add(pipeOut);
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14), m.red);
    valve.position.set(w / 2 + 1.0, 2.8, 0); root.add(valve);
    const valveBar = B().box(0.1, 0.1, 1.2, m.red, 0.4);
    valveBar.position.set(w / 2 + 1.0, 2.8, 0); root.add(valveBar);
    // 电机
    const motor = B().cyl(0.42, 0.42, 1.4, m.blue, 14);
    motor.rotation.z = Math.PI / 2; motor.position.set(0, 0.8 + 0.7, -d / 2 + 1.2); root.add(motor);
    // 电杆
    root.userData.enterable = true;
    return root;
  };

  /* =========================================================
   *  淮河渡口（码头 + 渡船）
   * ========================================================= */
  /** 渡口：局部原点位于水面高度（y=0 即水面），台阶向 +Z（陆地）方向上升 */
  A.ferryDock = function (opts = {}) {
    const m = M();
    const root = g();
    const STEPS = opts.steps || 18;         // 台阶级数
    const RISE = opts.rise || 0.26, TREAD = opts.tread || 0.56;
    // 平台
    const plat = B().box(8.4, 0.32, 6.4, m.cement, 1.6);
    plat.position.set(0, 0.06, 0); plat.receiveShadow = true; root.add(plat);
    // 桥桩
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pile = B().cyl(0.19, 0.21, 2.6, m.metalDark, 8);
      pile.position.set(sx * 3.4, -1.2, sz * 2.4); root.add(pile);
    }
    // 引道台阶（向陆地上升）
    for (let i = 1; i <= STEPS; i++) {
      const step = B().box(3.6 + Math.min(3, i * 0.18), RISE, TREAD + 0.06, m.cement, 0.9);
      step.position.set(0, i * RISE - RISE / 2 + 0.16, 3.2 + i * TREAD);
      root.add(step);
    }
    // 台阶栏杆
    for (const sx of [-1, 1]) {
      const rail = B().cyl(0.035, 0.035, STEPS * RISE + 0.5, m.metal, 6);
      rail.position.set(sx * 1.9, STEPS * RISE * 0.5 + 0.4, 3.2 + STEPS * TREAD * 0.5);
      rail.rotation.x = rad(90 - Math.atan2(STEPS * RISE, STEPS * TREAD) * 180 / Math.PI);
      root.add(rail);
    }
    // 系缆桩
    for (const sx of [-1, 1]) {
      const post = B().cyl(0.17, 0.21, 1.1, m.metalDark, 10);
      post.position.set(sx * 3.2, 0.55, -2.6); root.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), m.metalDark);
      cap.position.set(sx * 3.2, 1.1, -2.6); root.add(cap);
    }
    // 救生圈
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xd0402a, roughness: 0.8 }));
    ring.rotation.y = rad(90); ring.position.set(4.0, 1.1, -1.2); root.add(ring);
    // 候船棚
    const shed = g();
    const sroof = B().box(4.6, 0.14, 3.0, m.tileBlue, 1.4);
    sroof.position.y = 2.5; sroof.rotation.x = rad(-6); shed.add(sroof);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = B().cyl(0.07, 0.07, 2.5, m.metal, 8);
      p.position.set(sx * 2.1, 1.25, sz * 1.3); shed.add(p);
    }
    const bench = B().box(3.6, 0.09, 0.4, m.wood, 0.8);
    bench.position.set(0, 0.5, -1.0); shed.add(bench);
    shed.position.set(-2.0, 0.22, 0.6);
    root.add(MT.props.prop(shed));
    // 标牌
    const sign = g();
    const sp = B().cyl(0.05, 0.05, 2.6, m.metal, 8);
    sp.position.y = 1.3; sign.add(sp);
    const sMat = MT.texture.textMat('淮河渡口', { key: 'dock', w: 512, h: 200, bg: '#135a8a', color: '#ffffff', fontSize: 110 });
    const sBoard = B().plane(1.5, 0.58, sMat, 1, 1);
    sBoard.position.set(0, 2.3, 0.03); sign.add(sBoard);
    const sBack = B().box(1.54, 0.64, 0.05, m.metal, 0.5);
    sBack.position.set(0, 2.3, 0); sign.add(sBack);
    const sMat2 = MT.texture.textMat('过渡请穿救生衣', { key: 'dock2', w: 512, h: 200, bg: '#e8e2d0', color: '#b3271b', fontSize: 84 });
    const sBoard2 = B().plane(1.3, 0.5, sMat2, 1, 1);
    sBoard2.position.set(0, 1.62, 0.03); sign.add(sBoard2);
    sign.position.set(3.2, 0.2, 1.4);
    root.add(MT.props.prop(sign));
    // 渡船（停靠在平台外侧）
    const boat = A.ferryBoat();
    boat.position.set(0.6, 0.12, -6.4);
    boat.rotation.y = rad(4);
    root.add(boat);
    root.userData.dock = true;
    return root;
  };

  A.ferryBoat = function () {
    const m = M();
    const o = g();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 0.9 });
    // 船身（用盒体近似）
    const body = B().box(2.4, 0.85, 8.5, hullMat, 1.2);
    body.position.y = 0.1; o.add(body);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), hullMat);
    bow.rotation.x = rad(90); bow.rotation.y = rad(45);
    bow.position.set(0, 0.1, 5.3); o.add(bow);
    const stern = B().box(2.2, 0.85, 1.2, hullMat, 1.0);
    stern.position.set(0, 0.55, -3.6); o.add(stern);
    // 甲板
    const deck = B().box(2.3, 0.1, 8.3, m.wood, 1.2);
    deck.position.y = 0.55; o.add(deck);
    // 船舱棚
    const cabRoof = B().box(2.3, 0.1, 4.6, m.cloth, 1.4);
    cabRoof.position.set(0, 2.2, -0.4); o.add(cabRoof);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = B().cyl(0.05, 0.05, 1.6, m.metal, 8);
      p.position.set(sx * 1.0, 1.4, -0.4 + sz * 2.1); o.add(p);
    }
    // 驾驶台
    const console_ = B().box(1.6, 0.9, 0.8, m.metalDark, 0.8);
    console_.position.set(0, 1.0, 2.2); o.add(console_);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 14), m.metalDark);
    wheel.rotation.x = rad(70); wheel.position.set(0, 1.5, 2.4); o.add(wheel);
    // 竹篙 / 缆绳
    const pole = B().cyl(0.04, 0.04, 5.0, m.straw, 8);
    pole.rotation.x = rad(80); pole.position.set(0.9, 0.9, 1.0); o.add(pole);
    // 救生衣
    for (let i = 0; i < 3; i++) {
      const j = B().box(0.34, 0.1, 0.4, new THREE.MeshStandardMaterial({ color: 0xe8731f, roughness: 0.9 }), 0.4);
      j.position.set(-0.7 + i * 0.7, 0.66, -3.0); o.add(j);
    }
    // 船上的粮食/货物
    for (let i = 0; i < 3; i++) {
      const sack = B().box(0.6, 0.4, 0.7, m.straw, 0.5);
      sack.position.set(-0.5 + (i % 2) * 1.0, 0.85, 3.2 - Math.floor(i / 2) * 0.8);
      o.add(sack);
    }
    o.userData.prop = true;
    o.userData.boat = true;
    MT.props.anim(o, (t) => {
      o.position.y = (o.userData.baseY === undefined ? (o.userData.baseY = o.position.y) : o.userData.baseY) + Math.sin(t * 0.9) * 0.09;
      o.rotation.z = Math.sin(t * 0.7) * 0.02;
      o.rotation.x = Math.sin(t * 1.1 + 1) * 0.012;
    });
    return o;
  };

  MT.public = A;
})();
