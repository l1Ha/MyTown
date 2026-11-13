/* =============================================================
 *  MyTown · 我的家乡 3D  —  村庄总装
 *  village.js : 任庄村 / 任洼队的院落布局、公共建筑、村口、
 *               集市、老井、电线、路灯、家禽家畜、文化信物
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad, lerp, clamp, TAU } = MT.util;

  class Village {
    constructor(scene, terrain, opts = {}) {
      this.scene = scene;
      this.terrain = terrain;
      this.rng = opts.rng || new MT.RNG(20240715);
      this.season = opts.season || 'summer';
      this.group = new THREE.Group();
      this.group.name = '任庄村';
      scene.add(this.group);
      this.pois = [];
      this.npcSpots = [];
      this.collectibles = [];
      this.lampMats = [];
      this.windowMats = [];
      this.powerPoles = [];
      this.extraAnimated = [];
      this.docks = [];
      this.landingSouth = { x: 101, z: -190 };
      this.landingNorth = { x: 101, z: -318 };
      this.build();
    }

    /* ---------------- 工具 ---------------- */
    place(obj, x, z, ry, dy) {
      const y = this.terrain.heightAt(x, z) + (dy || 0);
      obj.position.set(x, y, z);
      if (ry) obj.rotation.y = ry;
      this.group.add(obj);
      return obj;
    }
    zone(x, z, r) { MT.addBuildZone(x, z, r); return this; }
    poi(id, name, cat, x, z, r, extra) {
      const p = {
        id, name, cat, x, z, r: r || 5.5,
        y: this.terrain.heightAt(x, z),
      };
      if (extra) Object.assign(p, extra);
      this.pois.push(p);
      return p;
    }
    npc(name, x, z, role, opts) {
      this.npcSpots.push(Object.assign({
        name, role: role || 'villager', x, z, y: this.terrain.heightAt(x, z),
      }, opts || {}));
    }

    /* ---------------- 主构建 ---------------- */
    build() {
      const r = this.rng, T = this.terrain;
      const B = MT.Build, P = MT.props, A = MT.public;
      const VC = MT.TerrainConst;

      /* ============ 1. 村口 ============ */
      const stele = P.stele('任庄村');
      this.place(stele, -30, -46, 0);
      this.zone(-30, -46, 8);
      this.poi('stele', '村口石碑', '建筑', -30, -42, 6);
      const bus = P.busStop('任庄村站 · 固城乡方向');
      this.place(bus, -42, -44, rad(10));
      this.zone(-42, -44, 4);
      const board = P.noticeBoard('村规民约\n乡村振兴　产业兴旺', { w: 6.0, h: 2.3 });
      this.place(board, 26, -46, 0);
      this.zone(26, -46, 6);
      this.poi('board', '村规民约墙', '风俗', 26, -43, 5);

      // 村口大槐树（树体在 decorate 中生成）+ 石凳
      this.zone(6, -41, 7);
      this.poi('bigtree', '村口大槐树', '自然', 6, -38, 6);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + 0.6;
        const g = new THREE.Group();
        // 石凳：座板 + 两条石腿（原来是一整块白色方块）
        const benchMat = MT.mat.solid(0x8d8778, { roughness: 1.0 });
        const seat = B.box(1.25, 0.16, 0.46, benchMat, 0.9);
        seat.position.set(0, 0.38, 0); seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
        for (const sx of [-1, 1]) {
          const leg = B.box(0.18, 0.34, 0.4, benchMat, 0.7);
          leg.position.set(sx * 0.45, 0.17, 0); g.add(leg);
        }
        this.place(g, 6 + Math.cos(a) * 3.0, -41 + Math.sin(a) * 3.0, a);
        MT.props.prop(g);
      }

      /* ============ 2. 民居院落 ============ */
      const households = [
        // 村道西侧（院门朝东）
        { x: 2, z: -8, ry: Math.PI / 2, style: 'brick', outs: ['kitchen', 'pigpen'], hang: true, spring: true },
        { x: 2, z: 12, ry: Math.PI / 2, style: 'old', outs: ['chicken'], hang: true },
        { x: 2, z: 32, ry: Math.PI / 2, style: 'brick', outs: ['kitchen', 'chicken', 'pigpen'], spring: true },
        { x: 2, z: 52, ry: Math.PI / 2, style: 'two', outs: ['kitchen'], awning: true, dish: true },
        // 村道东侧（院门朝西）
        { x: 36, z: 0, ry: -Math.PI / 2, style: 'brick', outs: ['kitchen', 'pigpen'], hang: true },
        { x: 36, z: 20, ry: -Math.PI / 2, style: 'brick', outs: ['barn', 'chicken'], spring: true },
        { x: 36, z: 42, ry: -Math.PI / 2, style: 'two', outs: ['kitchen'], awning: true, solar: true },
        // 村内其他
        { x: 74, z: 6, ry: 0, style: 'brick', outs: ['kitchen', 'pigpen'], hang: true },
        { x: 74, z: 34, ry: 0, style: 'old', outs: ['chicken'] },
        { x: 10, z: 84, ry: Math.PI, style: 'brick', outs: ['kitchen', 'barn'] },
        { x: 76, z: 92, ry: 0, style: 'two', outs: ['kitchen'], awning: true },
      ];
      for (const h of households) {
        const court = B.courtyard(r, {
          style: h.style, w: h.style === 'two' ? 9.6 : 10.5, d: h.style === 'two' ? 8 : 6.6,
          spring: h.spring, outs: h.outs, awning: h.awning, dish: h.dish, hang: h.hang,
          wallMat: h.style === 'old' ? MT.M().mud : (r.chance(0.4) ? MT.M().brickGrey : MT.M().brickRed),
          gateSide: r.chance(0.5) ? 1 : -1,
        });
        this.place(court, h.x, h.z, h.ry);
        this.zone(h.x, h.z, 15);
        // 墙头猫
        if (r.chance(0.4)) {
          const cat = P.cat();
          const gx = h.ry === Math.PI / 2 ? h.x + 4 : h.ry === -Math.PI / 2 ? h.x - 4 : h.x;
          const gz = h.ry === 0 || h.ry === Math.PI ? h.z + 4 : h.z;
          const sy = T.heightAt(gx, gz) + 2.2;
          cat.position.set(gx, sy, gz);
          cat.rotation.y = h.ry + Math.PI / 2;
          this.group.add(cat);
        }
      }

      /* ============ 3. 任洼队（老土坯房 + 水塘） ============ */
      const waSpots = [
        { x: -100, z: 30, ry: -Math.PI / 2 * 0.6 },
        { x: -140, z: 26, ry: 0 },
        { x: -146, z: 56, ry: 0.3 },
        { x: -108, z: 68, ry: Math.PI * 0.4 },
        { x: -132, z: 84, ry: Math.PI },
      ];
      for (const w of waSpots) {
        const court = B.courtyard(r, {
          style: r.chance(0.7) ? 'old' : 'brick', w: 9.6, d: 6.2,
          outs: r.pick([['kitchen'], ['chicken', 'pigpen'], ['kitchen', 'barn']]),
          wallMat: r.chance(0.6) ? MT.M().mud : MT.M().brickGrey,
          yardDepth: 7, gateSide: r.chance(0.5) ? 1 : -1,
        });
        this.place(court, w.x, w.z, w.ry);
        this.zone(w.x, w.z, 14);
      }
      // 塘边的鸭子、荷叶
      for (let i = 0; i < 7; i++) {
        const a = r.next() * TAU, d = 12 + r.next() * 8;
        const duck = P.duck(r);
        duck.position.set(VC.WA_CLUSTER.x + Math.cos(a) * d, VC.PONDS[0].y + 0.02, VC.WA_CLUSTER.z + Math.sin(a) * d);
        duck.rotation.y = r.next() * TAU;
        this.group.add(duck);
      }
      this.poi('wan', '任洼队 · 老屋', '建筑', -130, 44, 10);
      this.poi('pond', '任洼水塘', '自然', -118, 62, 8);
      this.npc('任大爷', -104, 34, 'elder', { lines: 'wa' });

      /* ============ 4. 公共建筑 ============ */
      // 任家老屋（可进入）
      const oldHouse = A.oldHouse();
      this.place(oldHouse, -16, 12, 0);
      this.zone(-16, 12, 12);
      this.poi('oldhouse', '任家老屋·堂屋', '建筑', -16, 17, 5.5, { enter: true });

      // 委员会
      const committee = A.committee(r);
      this.place(committee, 30, -54, 0);
      this.zone(30, -54, 12);
      this.poi('committee', '村民委员会', '建筑', 30, -48, 6, { enter: true });

      // 小卖部
      const shop = A.shop('任庄小卖部');
      this.place(shop, 44, -46, 0);
      this.zone(44, -46, 8);
      this.poi('shop', '小卖部', '物产', 44, -42, 5, { enter: true });

      // 卫生室
      const clinic = A.clinic();
      this.place(clinic, -18, -50, 0);
      this.zone(-18, -50, 8);
      this.poi('clinic', '村卫生室', '建筑', -18, -46, 5, { enter: true });

      // 小学
      const school = A.school();
      this.place(school, 92, -4, 0);
      this.zone(92, -4, 26);
      this.poi('school', '任庄村小学', '建筑', 92, 4, 8, { enter: true });

      // 碾米房
      const mill = A.mill();
      this.place(mill, 64, 18, 0);
      this.zone(64, 18, 8);
      this.poi('mill', '碾米房', '农田', 64, 22, 5, { enter: true });

      // 水塔
      const tower = A.waterTower();
      this.place(tower, 60, 50, 0);
      this.zone(60, 50, 6);
      this.poi('watertower', '村水塔', '建筑', 60, 46, 5);

      // 祠堂
      const hall = A.ancestralHall('任');
      this.place(hall, 34, 76, 0);
      this.zone(34, 76, 14);
      this.poi('hall', '任氏宗祠', '风俗', 34, 84, 7, { enter: true });

      // 土地庙
      const temple = A.temple();
      this.place(temple, -28, 34, 0);
      this.zone(-28, 34, 6);
      this.poi('temple', '土地庙', '风俗', -28, 38, 4.5);

      // 电灌站（大堤上）
      const pump = A.pumpStation();
      this.place(pump, 44, -186, -Math.PI / 2);
      this.zone(44, -186, 8);
      this.poi('pump', '淮河电灌站', '农田', 44, -180, 6, { enter: true });

      // 渡口
      const dockX = 101, zWater = -204;
      let zTop = zWater + 20;
      for (let z = zWater; z < zWater + 46; z += 0.5) {
        if (T.heightAt(dockX, z) > 5.4) { zTop = z; break; }
      }
      const steps = 22;
      const dock = A.ferryDock({ steps, rise: 5.3 / steps, tread: (zTop - zWater - 3.2) / steps });
      dock.position.set(dockX, 0, zWater);
      this.group.add(dock);
      this.poi('dock', '淮河渡口', '风俗', dockX, zWater + 6, 7);
      this.poi('river', '淮河', '自然', dockX, -240, 14);
      this.npc('张船夫', dockX + 2, zWater + 8, 'boatman', { lines: 'boat' });
      // 对岸（北岸）渡口，供过河往返
      const zWaterN = -309;
      const dockN = A.ferryDock({ steps: 11, rise: 0.28, tread: 0.56 });
      dockN.position.set(dockX, 0, zWaterN);
      dockN.rotation.y = Math.PI;
      this.group.add(dockN);
      this.poi('dock_north', '淮河北岸 · 滩涂', '自然', dockX, zWaterN - 8, 8);
      this.landingSouth = { x: dockX, z: zTop + 2 };
      this.landingNorth = { x: dockX, z: zWaterN - 9 };
      this.docks = [
        { x: dockX, z: zWater + 5, north: false },
        { x: dockX, z: zWaterN - 4, north: true },
      ];
      // 北岸的杨树林、芦苇已经很密（植被系统生成）

      // 大堤（观景点 + 里程碑）
      this.poi('levee', '淮河大堤', '自然', 0, -186, 10);
      for (let x = -300; x <= 300; x += 100) {
        const stone = B.box(0.5, 0.9, 0.2, MT.M().stone, 0.6);
        stone.position.set(x, T.heightAt(x, -186) + 0.45, -188.6);
        this.group.add(MT.props.prop(stone));
      }

      /* ============ 5. 老井 / 集市 / 田间小品 ============ */
      // 老井
      const well = this._well();
      this.place(well, 14, 22, 0);
      this.zone(14, 22, 4);
      MT.colliders.push({
        x: 14, y: T.heightAt(14, 22) + 0.55, z: 22, hw: 1.0, hh: 0.6, hd: 1.0,
        ry: 0, cos: 1, sin: 0, active: true,
      });
      this.poi('oldwell', '老井', '建筑', 14, 24, 4);

      // 集市（逢集）
      const marketBaseY = T.heightAt(-44, -14);
      const market = new THREE.Group();
      market.position.set(-44, marketBaseY, -14);
      // 压实的土场：顺着地形微微起伏，把草地变成赶集的场地
      {
        const mg = new THREE.PlaneGeometry(11, 25, 11, 25);
        mg.rotateX(-Math.PI / 2);
        const mp = mg.attributes.position;
        for (let i = 0; i < mp.count; i++) {
          const wx = -44 + mp.getX(i), wz = -14 + mp.getZ(i);
          mp.setY(i, T.heightAt(wx, wz) - marketBaseY + 0.105);   // 高过土路路面（路面 +0.06），别让车辙穿出来
        }
        mg.computeVertexNormals();
        const padMat = MT.mat.marketGround(2, 5);
        padMat.color.setHex(0xc4a77c);   // 压实的黄土，略微压暗避免泛白
        const pad = new THREE.Mesh(mg, padMat);
        pad.receiveShadow = true;
        market.add(pad);
      }
      for (let i = 0; i < 5; i++) {
        const stall = this._stall(r, i);
        stall.position.set(0, 0, i * 5.2 - 10.4);
        stall.rotation.y = rad(r.range(-6, 6));   // 摊面朝村子（+Z），别让顾客只看到摊背
        market.add(stall);
      }
      // 摊边散落的筐、木箱、麻袋
      for (const [bx, bz, kind] of [[-2.6, -12.2, 'basket'], [2.5, -8.1, 'crate'], [-2.8, -2.9, 'basket'], [2.7, 2.3, 'sack'], [-2.4, 8.0, 'crate'], [2.6, 9.4, 'basket']]) {
        if (kind === 'basket') {
          const bk = P.basket(0.28, 0.28); bk.position.set(bx, 0.02, bz); market.add(bk);
          const fill = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8),
            new THREE.MeshStandardMaterial({ color: r.pick([0xc8442e, 0xd8b23c, 0x6aa84a]), roughness: 0.85 }));
          fill.position.set(bx, 0.3, bz); fill.scale.set(1, 0.5, 1); market.add(fill);
        } else if (kind === 'crate') {
          const crMat = MT.mat.wood(1.4, 1);
          crMat.color.setHex(0x9a7448);
          const cr = B.box(0.5, 0.3, 0.42, crMat, 0.6);
          cr.position.set(bx, 0.15, bz); cr.rotation.y = r.range(-0.4, 0.4); market.add(cr);
          // 木箱的板条和角柱
          for (const sx of [-1, 1]) {
            const slat = B.box(0.035, 0.3, 0.44, crMat, 0.4);
            slat.position.set(bx + sx * 0.23, 0.15, bz); slat.rotation.y = cr.rotation.y; market.add(slat);
          }
          for (const yy of [0.06, 0.24]) {
            const band = B.box(0.52, 0.025, 0.44, crMat, 0.3);
            band.position.set(bx, yy, bz); band.rotation.y = cr.rotation.y; market.add(band);
          }
        } else {
          const sk = new THREE.Group();
          const skBody = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), MT.M().straw);
          skBody.position.y = 0.14; skBody.scale.set(1.15, 0.92, 0.95); skBody.castShadow = true;
          sk.add(skBody);
          const skNeck = B.cyl(0.04, 0.056, 0.08, MT.M().straw, 8);
          skNeck.position.y = 0.3; sk.add(skNeck);
          const skTie = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.007, 4, 10), MT.M().woodDark);
          skTie.rotation.x = Math.PI / 2; skTie.position.y = 0.312; sk.add(skTie);
          sk.position.set(bx, 0, bz); sk.rotation.y = r.range(-0.4, 0.4); market.add(sk);
        }
      }
      this.group.add(market);
      this.zone(-44, -14, 18);
      this.poi('market', '集市 · 逢集', '风俗', -44, -12, 9);
      this.npc('卖菜婆婆', -46, -10, 'vendor', { lines: 'market' });
      this.npc('李婶', -42, -20, 'vendor', { lines: 'market' });
      this.npc('赶集的大娘', -47.6, -6.4, 'elder', { lines: 'market' });
      this.npc('买布的小媳妇', -40.4, -16.2, 'farmer', { lines: 'market' });
      const trike = P.tricycle(true);
      this.place(trike, -54, -12, rad(80));
      const trike2 = P.tricycle(false);
      this.place(trike2, -34, -18, rad(-60));

      /* ============ 6. 田头 / 自然景点 ============ */
      this.poi('paddy', '秧田 · 插秧', '农田', 40, -110, 10);
      this.poi('wheat', '麦田 · 收麦', '农田', -20, 150, 10);
      this.poi('threshing', '打谷场 · 晒场', '农田', -8, 82, 10);
      this.poi('greenhouse', '蔬菜大棚', '农田', 112, 96, 8);
      this.poi('lotus', '藕塘 · 荷花', '物产', 104, 64, 8);
      this.poi('canal', '灌溉水渠', '农田', 100, 150, 6);
      this.poi('forest', '杨树林 · 防护林', '自然', -240, 120, 16);

      /* ============ 7. 电线杆 / 路灯 ============ */
      // 乡道沿线
      for (let x = -180; x <= 240; x += 40) {
        const z = -34 - x * 0.015;
        const pole = P.powerPole({ h: 7.6, loudspeaker: x > -60 && x < 100 && Math.random() < 0.4 });
        this.place(pole, x, z, 0);
        this.powerPoles.push(new THREE.Vector3(x, T.heightAt(x, z) + 7.0, z - 0.5));
      }
      // 村道沿线
      for (let z = -20; z <= 140; z += 36) {
        const pole = P.powerPole({ h: 7.2, loudspeaker: Math.random() < 0.35 });
        this.place(pole, 26, z, 0);
        this.powerPoles.push(new THREE.Vector3(26, T.heightAt(26, z) + 6.7, z - 0.5));
      }
      for (let i = 0; i < this.powerPoles.length - 1; i++) {
        const a = this.powerPoles[i], b = this.powerPoles[i + 1];
        if (a.distanceTo(b) > 60) continue;
        for (const off of [-0.55, 0, 0.55]) {
          const w = P.wire(
            { x: a.x + off, y: a.y, z: a.z },
            { x: b.x + off, y: b.y, z: b.z },
            1.1
          );
          this.group.add(w);
        }
      }
      // 路灯
      const lampSpots = [[20, 40], [20, 100], [-20, 20], [50, 30], [70, -20], [90, 10], [-60, -20], [10, -20]];
      for (const [lx, lz] of lampSpots) {
        const lamp = P.streetLamp();
        this.place(lamp, lx, lz, r.next() * TAU);
        this.lampMats.push(lamp.userData.lampMat);
        this.zone(lx, lz, 2);
      }

      /* ============ 8. 家禽家畜（散养） ============ */
      const scatter = [
        { n: 5, x: -8, z: 78, r: 14, kind: 'chicken' },
        { n: 4, x: 20, z: 30, r: 12, kind: 'chicken' },
        { n: 3, x: 60, z: 8, r: 14, kind: 'chicken' },
        { n: 4, x: -110, z: 40, r: 14, kind: 'duck' },
        { n: 3, x: 100, z: 62, r: 10, kind: 'duck' },
      ];
      for (const sc of scatter) {
        for (let i = 0; i < sc.n; i++) {
          const a = r.next() * TAU, d = Math.sqrt(r.next()) * sc.r;
          const x = sc.x + Math.cos(a) * d, z = sc.z + Math.sin(a) * d;
          const w = T.waterAt(x, z);
          const y = w && sc.kind === 'duck' ? w.y + 0.02 : T.heightAt(x, z);
          const animal = sc.kind === 'duck' ? P.duck(r) : P.chicken(r);
          animal.position.set(x, y, z);
          animal.rotation.y = r.next() * TAU;
          this.group.add(animal);
        }
      }
      // 水牛在秧田边
      for (const [bx, bz] of [[24, -96], [-60, -120]]) {
        const cow = P.buffalo();
        const w = T.waterAt(bx, bz);
        cow.position.set(bx, w ? Math.max(w.y - 0.35, T.heightAt(bx, bz)) : T.heightAt(bx, bz), bz);
        cow.rotation.y = r.next() * TAU;
        this.group.add(cow);
      }
      // 羊在土岗
      for (let i = 0; i < 5; i++) {
        const goat = P.goat();
        const x = -240 + r.range(-30, 30), z = 190 + r.range(-30, 30);
        goat.position.set(x, T.heightAt(x, z), z);
        goat.rotation.y = r.next() * TAU;
        this.group.add(goat);
      }
      // 狗
      for (const [dx, dz] of [[8, 6], [40, 8], [-104, 36]]) {
        const dog = P.dog();
        dog.position.set(dx, T.heightAt(dx, dz), dz);
        dog.rotation.y = r.next() * TAU;
        this.group.add(dog);
      }

      /* ============ 9. 文化信物（可拾取） ============ */
      this.collectibles.push(
        this._collectible('nijiaochui', '泥叫吹', -47, -8),
        this._collectible('huagudeng', '花鼓灯', -26, 36),
        this._collectible('menshen', '门神年画', -16, 17),
        this._collectible('hutou', '虎头鞋', 46, -42),
        this._collectible('yulou', '鱼篓', 103, -196),
        this._collectible('lianpeng', '莲蓬', 106, 60),
        this._collectible('maisui', '麦穗', -24, 146),
        this._collectible('daocao', '稻草人', 30, 96)
      );

      /* ============ 10. NPC 分布 ============ */
      this.npc('王老师', 90, 6, 'teacher', { lines: 'school' });
      this.npc('任村长', 32, -48, 'cadre', { lines: 'committee' });
      this.npc('小卖部老板娘', 44, -40, 'shopkeeper', { lines: 'shop' });
      this.npc('赤脚医生', -18, -46, 'doctor', { lines: 'clinic' });
      this.npc('碾米的老李', 64, 22, 'miller', { lines: 'mill' });
      this.npc('下棋的爷爷', 6, -38, 'elder', { lines: 'tree' });
      this.npc('锄地的二叔', -24, 148, 'farmer', { lines: 'field' });
      this.npc('插秧的大姐', 40, -108, 'farmer', { lines: 'paddy' });
      this.npc('放牛娃', 26, -92, 'child', { lines: 'buffalo' });
      this.npc('晒粮的婶子', -8, 78, 'farmer', { lines: 'threshing' });
      this.npc('赶集的爷爷', -50, -16, 'elder', { lines: 'market' });
      this.npc('玩耍的小孩', 20, 24, 'child', { lines: 'well' });
      this.npc('织布奶奶', -16, 14, 'elder', { lines: 'loom', indoor: true });
      this.npc('巡堤的老汉', 4, -186, 'elder', { lines: 'levee' });

      /* ============ 11. 炊烟 ============ */
      this._buildChimneySmoke();
    }

    /* ---------------- 炊烟：每个灶屋烟囱飘一股烟 ----------------
     * 做法参考了开源低多边形乡村项目的做法：不用 Sprite 对象池，
     * 而是用一组 THREE.Points + 每颗粒子的大小/透明度属性，
     * 在着色器里用 gl_PointCoord 画柔和圆斑，开销极小。 */
    _buildChimneySmoke() {
      const tips = [];
      const v = new THREE.Vector3();
      this.group.updateMatrixWorld(true);
      this.group.traverse((o) => {
        if (!o.isMesh || !o.userData.chimney || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        v.set((bb.min.x + bb.max.x) / 2, bb.max.y + 0.12, (bb.min.z + bb.max.z) / 2);
        o.localToWorld(v);
        tips.push(v.clone());
      });
      // 同一个烟囱的囱身与囱帽离得很近，合并成一个出烟口
      const merged = [];
      for (const p of tips) {
        const near = merged.find((q) => q.distanceTo(p) < 1.4);
        if (near) { if (p.y > near.y) near.copy(p); } else merged.push(p.clone());
      }
      const list = merged.slice(0, 10);
      if (!list.length) return;

      const PER = 6;
      const N = list.length * PER;
      const pos = new Float32Array(N * 3);
      const size = new Float32Array(N);
      const alpha = new Float32Array(N);
      const seed = new Float32Array(N);
      const age = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        seed[i] = Math.random() * TAU;
        age[i] = (i % PER) / PER;           // 每股烟里的粒子错开，别一起冒
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xd9d3c8) },
          uK: { value: 300 },
          uOpacity: { value: 0.5 },
        },
        vertexShader: `
          attribute float aSize;
          attribute float aAlpha;
          uniform float uK;
          varying float vA;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            float d = max(0.8, -mv.z);
            gl_PointSize = clamp(aSize * uK / d, 2.0, 110.0);
            vA = aAlpha;
          }`,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vA;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float a = smoothstep(1.0, 0.18, r) * vA * uOpacity;
            if (a < 0.004) discard;
            gl_FragColor = vec4(uColor, a);
          }`,
        transparent: true,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.name = '炊烟';
      pts.frustumCulled = false;
      this.group.add(pts);
      this.smoke = { list, PER, N, pos, size, alpha, seed, age, geo, mat, life: 5.0, uK: 300 };
    }

    /** 炊烟逐帧更新（由 game 的更新循环调用；相机用于把点大小换算成像素） */
    updateSmoke(dt, camera, viewportH) {
      const s = this.smoke;
      if (!s) return;
      if (camera && viewportH) {
        s.uK = viewportH / (2 * Math.tan(rad((camera.fov || 60) * 0.5)));
        s.mat.uniforms.uK.value = s.uK;
      }
      const wind = 0.55;   // 缓缓向东南飘
      for (let e = 0; e < s.list.length; e++) {
        const o = s.list[e];
        for (let k = 0; k < s.PER; k++) {
          const i = e * s.PER + k;
          s.age[i] += dt / s.life;
          if (s.age[i] > 1) s.age[i] -= 1;
          const t = s.age[i];
          const wob = Math.sin(s.seed[i] + t * 6.0);
          const wob2 = Math.cos(s.seed[i] * 1.7 + t * 4.3);
          const wobble = wob * 0.2 * t;
          s.pos[i * 3] = o.x + wobble + t * wind;
          s.pos[i * 3 + 1] = o.y + t * 3.2;
          s.pos[i * 3 + 2] = o.z + wob2 * 0.18 * t + t * wind * 0.4;
          s.size[i] = 0.28 + t * 1.1;
          s.alpha[i] = Math.min(t / 0.12, 1) * (1 - t) * (1 - t);
        }
      }
      s.geo.attributes.position.needsUpdate = true;
      s.geo.attributes.aSize.needsUpdate = true;
      s.geo.attributes.aAlpha.needsUpdate = true;
    }

    /* ---------------- 老井 ---------------- */
    _well() {
      const m = MT.M(), B = MT.Build;
      const g = new THREE.Group();
      // 井台：旧水泥，不再是发亮的浅蓝大板
      const padMat = new THREE.MeshStandardMaterial({
        map: MT.texture.cloneTex('concrete', 2, 2), color: 0xa8a49a, roughness: 1.0,
      });
      const pad = B.box(3.0, 0.16, 3.0, padMat, 1.2);
      pad.position.y = 0.08; g.add(pad);
      // 井圈：一块块石头砌起来，底下一圈带青苔（原来是光滑水泥圆筒，像个塑料桶）
      const stoneTex = MT.texture.cloneTex('concrete', 1.6, 0.75);
      const stoneCols = [0x8a8578, 0x948e80, 0x7d7a6f, 0x8f8a7c, 0x787b68];
      const stoneMats = stoneCols.map((c) => new THREE.MeshStandardMaterial({
        map: stoneTex, color: c, roughness: 1.0,
      }));
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x68724f, roughness: 1.0 });
      // 内侧的挡墙：填住石块之间的缝，看起来是灰浆砌的而不是悬空一圈
      const backing = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.82, 0.82, 18, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x4f4c44, roughness: 1.0, side: THREE.DoubleSide }));
      backing.position.y = 0.56; backing.receiveShadow = true; g.add(backing);
      const courses = 3, perCourse = 16;
      for (let c = 0; c < courses; c++) {
        const cy = 0.24 + c * 0.28;
        for (let i = 0; i < perCourse; i++) {
          const a = (i + (c % 2) * 0.5) / perCourse * TAU;
          const bw = 0.29 + Math.sin(i * 2.1 + c) * 0.025;
          const bh = 0.26 + Math.cos(i * 1.7 + c * 2) * 0.018;
          const bd = 0.17 + Math.sin(i * 3.3 + c) * 0.018;
          const mossy = c === 0 && (i % 4 === 0 || i % 7 === 0);
          const blk = B.box(bw, bh, bd,
            mossy ? mossMat : stoneMats[(i + c * 2) % stoneMats.length], 0.4);
          const rad2 = 0.855 + (i % 7 === 3 ? 0.018 : 0);
          blk.position.set(Math.cos(a) * rad2, cy, Math.sin(a) * rad2);
          blk.rotation.y = Math.PI / 2 - a;
          blk.rotation.z = rad(1.5) * Math.sin(i * 2.3);
          blk.castShadow = true; blk.receiveShadow = true;
          g.add(blk);
        }
      }
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.075, 6, 22),
        new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x8a8478, roughness: 0.98 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = 1.01; rim.castShadow = true; g.add(rim);
      const waterIn = new THREE.Mesh(new THREE.CircleGeometry(0.8, 18), MT.mat.water(0x1c3333, 0.96));
      waterIn.rotation.x = -Math.PI / 2; waterIn.position.y = 0.42;
      g.add(waterIn);
      // 井边的水渍
      const stainMat = new THREE.MeshBasicMaterial({ color: 0x5c5a50, transparent: true, opacity: 0.22, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const st = new THREE.Mesh(new THREE.CircleGeometry(0.55 + i * 0.18, 14), stainMat);
        st.rotation.x = -Math.PI / 2;
        st.position.set(-1.05 + i * 0.2, 0.161 + i * 0.001, -0.75 + i * 0.3);
        st.scale.set(1, 0.62, 1);
        g.add(st);
      }
      // 井架：深色老木头（贴图按需生成，不会再变白）
      const frameMat = new THREE.MeshStandardMaterial({
        map: MT.texture.cloneTex('wood', 1, 2), color: 0x8a7152, roughness: 0.95,
      });
      for (const sx of [-1, 1]) {
        const post = B.box(0.15, 1.9, 0.15, frameMat, 0.7);
        post.position.set(sx * 0.85, 1.11, 0); g.add(post);
        // 斜撑：柱子到横梁
        const brace = B.box(0.07, 0.62, 0.08, frameMat, 0.4);
        brace.position.set(sx * 0.62, 1.72, 0); brace.rotation.z = sx * rad(34); g.add(brace);
      }
      const beam = B.cyl(0.09, 0.09, 2.0, frameMat, 8);
      beam.rotation.z = Math.PI / 2; beam.position.y = 2.02; g.add(beam);
      // 小瓦顶：两坡 + 脊（颜色调亮，避免从下往上看像一块黑板）
      const roofMat = new THREE.MeshStandardMaterial({
        map: MT.texture.cloneTex('roofTile', 2, 1), color: 0xb9bec4, roughness: 0.9,
      });
      for (const sz of [-1, 1]) {
        const slope = B.box(2.25, 0.07, 0.82, roofMat, 1.0);
        slope.position.set(0, 2.32, sz * 0.34);
        slope.rotation.x = sz * rad(-26);
        slope.castShadow = true; slope.receiveShadow = true;
        g.add(slope);
        // 瓦下的木望板：从下往上看是木头，不再是一块黑瓦板
        const soffit = B.box(2.16, 0.022, 0.76,
          new THREE.MeshStandardMaterial({ map: MT.texture.cloneTex('wood', 2, 1), color: 0x6f5a40, roughness: 1.0 }), 0.5);
        soffit.position.set(0, 2.278, sz * 0.34);
        soffit.rotation.x = sz * rad(-26);
        g.add(soffit);
        // 瓦垄
        for (let k = -3; k <= 3; k++) {
          const tileRidge = B.box(0.075, 0.035, 0.8, roofMat, 0.4);
          tileRidge.position.set(k * 0.29, 2.365, sz * 0.355);
          tileRidge.rotation.x = sz * rad(-26);
          g.add(tileRidge);
        }
        // 檐下木椽
        for (let k = -1; k <= 1; k++) {
          const rafter = B.box(0.07, 0.06, 0.82, frameMat, 0.4);
          rafter.position.set(k * 0.74, 2.255, sz * 0.32);
          rafter.rotation.x = sz * rad(-26);
          g.add(rafter);
        }
        // 檐口封板：让瓦顶有一条清楚的边
        const eave = B.box(2.3, 0.07, 0.045, new THREE.MeshStandardMaterial({ color: 0x6e6555, roughness: 0.9 }), 0.5);
        eave.position.set(0, 2.13, sz * 0.725);
        eave.rotation.x = sz * rad(-26);
        g.add(eave);
      }
      const ridge = B.cyl(0.075, 0.075, 2.36, roofMat, 8);
      ridge.rotation.z = Math.PI / 2; ridge.position.y = 2.51; g.add(ridge);
      // 辘轳
      const roller = B.cyl(0.11, 0.11, 0.82, m.woodDark, 10);
      roller.rotation.z = Math.PI / 2; roller.position.y = 1.66; g.add(roller);
      for (const sx of [-1, 1]) {
        const brk = B.box(0.08, 0.34, 0.14, frameMat, 0.4);
        brk.position.set(sx * 0.47, 1.87, 0); g.add(brk);
      }
      const crank = B.box(0.34, 0.055, 0.055, m.metalDark, 0.5);
      crank.position.set(1.0, 1.66, 0.22); crank.rotation.x = rad(22); g.add(crank);
      const crankGrip = B.cyl(0.03, 0.03, 0.16, m.woodDark, 6);
      crankGrip.rotation.x = Math.PI / 2; crankGrip.position.set(1.0, 1.66, 0.37); g.add(crankGrip);
      const rope = B.cyl(0.013, 0.013, 0.3, MT.mat.solid(0x7a6542, { roughness: 1 }), 5);
      rope.position.set(0.06, 1.52, 0); g.add(rope);
      // 木桶悬在井口上方（原来吊在井圈里面，完全看不见）
      const bucket = B.cyl(0.17, 0.13, 0.27, m.woodDark, 12);
      bucket.position.set(0.06, 1.24, 0); g.add(bucket);
      const bucketRim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 5, 14), m.metalDark);
      bucketRim.rotation.x = Math.PI / 2; bucketRim.position.set(0.06, 1.375, 0); g.add(bucketRim);
      const bucketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.01, 4, 12, Math.PI), m.metalDark);
      bucketHandle.position.set(0.06, 1.4, 0); g.add(bucketHandle);
      // 井边石板
      const slab = B.box(1.1, 0.1, 1.1,
        new THREE.MeshStandardMaterial({ color: 0x767268, roughness: 1.0 }), 0.9);
      slab.position.set(-1.55, 0.16, 0.7); g.add(slab);
      return MT.props.prop(g);
    }

    /* ---------------- 集市摊位 ---------------- */
    _stall(rng, i) {
      const m = MT.M(), B = MT.Build, P = MT.props;
      const g = new THREE.Group();
      const kinds = ['vege', 'cloth', 'eggs', 'vege', 'tools'];
      const kind = kinds[i % kinds.length];
      const accent = rng.pick([0xa85a4a, 0x5a8a6e, 0x5a7aa0, 0xb08a4a]);
      const accentMat = MT.mat.cloth(accent, 2, 1.2);   // 褪色帆布，带织纹
      const clothMat = MT.mat.cloth(0xbfb39b, 1.5, 1.0);   // 桌沿的粗白布，也带织纹
      const topMat = MT.mat.wood(2, 1);
      topMat.color.setHex(0x9c7448);                        // 木摊板，不要被晒成白塑料

      // 四根木柱撑起一块布棚（比原来的圆锥伞更像乡村集市摊）
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const back = sz < 0;
          const postH = back ? 2.18 : 2.02;
          const post = B.cyl(0.038, 0.044, postH, m.woodDark, 6);
          post.position.set(sx * 1.28, postH / 2, sz * 0.82);
          g.add(post);
        }
      }
      // 前后横梁
      for (const sz of [-1, 1]) {
        const beam = B.cyl(0.032, 0.032, 2.66, m.woodDark, 6);
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0, sz < 0 ? 2.15 : 1.99, sz * 0.82);
        g.add(beam);
      }
      // 布棚：前低后高、中间略微下垂
      const tarpGeo = new THREE.PlaneGeometry(2.95, 1.95, 10, 6);
      tarpGeo.rotateX(-Math.PI / 2);
      {
        const p = tarpGeo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k), z = p.getZ(k);
          const sag = 0.09 * Math.cos((x / 1.475) * Math.PI / 2) * Math.cos((z / 0.975) * Math.PI / 2);
          p.setY(k, 2.2 - (z + 0.975) / 1.95 * 0.2 - sag);
        }
        tarpGeo.computeVertexNormals();
      }
      const tarp = new THREE.Mesh(tarpGeo, accentMat);
      tarp.castShadow = true; tarp.receiveShadow = true; g.add(tarp);
      // 前檐垂布 + 檐口木杆
      const valance = B.plane(2.95, 0.16, accentMat, 1, 1);
      valance.position.set(0, 1.92, 0.975); g.add(valance);
      const eaveBar = B.cyl(0.03, 0.03, 2.9, m.woodDark, 6);
      eaveBar.rotation.z = Math.PI / 2; eaveBar.position.set(0, 2.0, 0.975); g.add(eaveBar);
      // 挂在檐下的手写招牌
      const signText = { vege: '自家种的菜', eggs: '土鸡蛋', cloth: '布匹', tools: '农具' }[kind];
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.32), MT.texture.textMat(signText, {
        key: 'stall-' + kind, w: 384, h: 144, bg: '#e8dfc8', color: '#3a2c22', fontSize: 58, border: false, grain: false,
      }));
      sign.position.set(0, 1.73, 0.99); g.add(sign);
      for (const sx of [-1, 1]) {
        const string = B.cyl(0.005, 0.005, 0.15, m.woodDark, 4);
        string.position.set(sx * 0.36, 1.9, 0.99); g.add(string);
      }
      // 挂两串干辣椒，摊子更有生活气
      const chiliMat = new THREE.MeshStandardMaterial({ color: 0xa8301f, roughness: 0.8 });
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const chili = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 6), chiliMat);
          chili.position.set(sx * 1.16, 1.95 - k * 0.055, 0.86);
          chili.rotation.x = Math.PI; chili.rotation.z = sx * rad(6);
          g.add(chili);
        }
      }

      // 摊板 + 桌腿 + 粗布桌沿
      const tbl = B.box(2.7, 0.09, 1.15, topMat, 1.0);
      tbl.position.y = 0.82; g.add(tbl);
      const frontCloth = B.box(2.7, 0.46, 0.02, clothMat, 1.0);
      frontCloth.position.set(0, 0.63, 0.585); g.add(frontCloth);
      const stripe = B.box(2.7, 0.055, 0.022, accentMat, 1.0);
      stripe.position.set(0, 0.46, 0.588); g.add(stripe);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = B.box(0.08, 0.8, 0.08, m.woodDark, 0.5);
        leg.position.set(sx * 1.2, 0.4, sz * 0.45); g.add(leg);
      }
      // 桌下的筐、麻袋（麻袋是圆鼓鼓的一袋，不是方块）
      const under = P.basket(0.26, 0.26); under.position.set(-0.72, 0.02, -0.15); g.add(under);
      const sack = new THREE.Group();
      const sackBody = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), m.straw);
      sackBody.position.y = 0.16; sackBody.scale.set(1.18, 0.92, 1.0); sackBody.castShadow = true;
      sack.add(sackBody);
      const sackNeck = B.cyl(0.045, 0.062, 0.09, m.straw, 8);
      sackNeck.position.y = 0.33; sack.add(sackNeck);
      const sackTie = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.007, 4, 10), m.woodDark);
      sackTie.rotation.x = Math.PI / 2; sackTie.position.y = 0.345; sack.add(sackTie);
      sack.position.set(0.75, 0, -0.2); sack.rotation.y = rng.range(-0.3, 0.3); g.add(sack);

      // 摊上的货
      if (kind === 'vege') {
        const bed = B.box(2.1, 0.02, 0.86, new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 1 }), 0.5);
        bed.position.set(-0.1, 0.895, 0); g.add(bed);
        // 白菜：淡黄菜心 + 外裹几片青叶，不能像一排白蛋
        const cabInner = new THREE.MeshStandardMaterial({ color: 0xe6eecb, roughness: 0.85 });
        const cabLeafMats = [0x5f8f3f, 0x6fa04a, 0x548538].map(
          (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
        const mkCab = (r0) => {
          const cg = new THREE.Group();
          const head = new THREE.Mesh(new THREE.SphereGeometry(r0, 10, 8), cabInner);
          head.scale.set(0.86, 1.16, 0.86); head.position.y = r0 * 0.2;
          head.castShadow = true; cg.add(head);
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * TAU + rng.range(-0.35, 0.35);
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(r0 * 0.62, 8, 6),
              rng.pick(cabLeafMats));
            leaf.position.set(Math.cos(a) * r0 * 0.44, -r0 * 0.3, Math.sin(a) * r0 * 0.44);
            leaf.scale.set(0.85, 0.8, 1.05);
            leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
            leaf.castShadow = true; cg.add(leaf);
          }
          return cg;
        };
        for (let row = 0; row < 2; row++) {
          for (let k = 0; k < 5; k++) {
            const r0 = rng.range(0.12, 0.15);
            const cab = mkCab(r0);
            cab.position.set(-0.96 + k * 0.25 + row * 0.05, 0.9 + r0 * (row ? 1.75 : 0.96), row ? -0.2 : 0.16);
            cab.rotation.y = rng.range(0, TAU);
            g.add(cab);
          }
        }
        for (let k = 0; k < 3; k++) {
          const r0 = 0.135;
          const cab = mkCab(r0);
          cab.position.set(-0.72 + k * 0.25, 0.9 + r0 * 2.45, 0.0);
          cab.rotation.y = rng.range(0, TAU);
          g.add(cab);
        }
        // 西红柿：装在浅筐里
        const tomBasket = P.basket(0.27, 0.1); tomBasket.position.set(0.58, 0.9, 0.08); g.add(tomBasket);
        const tomMat = new THREE.MeshStandardMaterial({ color: 0xc8442e, roughness: 0.55 });
        for (let k = 0; k < 14; k++) {
          const tom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 6), tomMat);
          const a = (k / 14) * TAU, rr = k < 9 ? 0.2 : 0.1;
          tom.position.set(0.58 + Math.cos(a) * rr, 1.0 + (k < 9 ? 0 : 0.05), 0.08 + Math.sin(a) * rr * 0.85);
          g.add(tom);
        }
        // 黄瓜
        const cuMat = new THREE.MeshStandardMaterial({ color: 0x4f7f3a, roughness: 0.7 });
        for (let k = 0; k < 6; k++) {
          const cu = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.18, 3, 6), cuMat);
          cu.rotation.z = Math.PI / 2; cu.rotation.y = rng.range(-0.5, 0.5);
          cu.position.set(0.28 + (k % 3) * 0.045, 0.94 + Math.floor(k / 3) * 0.06, -0.18 - (k % 2) * 0.06); g.add(cu);
        }
        const leek = P.basket(0.24, 0.22); leek.position.set(-1.15, 0.9, 0.28); g.add(leek);
        for (let k = 0; k < 7; k++) {
          const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.36, 3, 5),
            new THREE.MeshStandardMaterial({ color: 0x6f9a42, roughness: 0.9 }));
          st.position.set(-1.15 + (k % 3) * 0.04, 1.2, 0.28 + Math.floor(k / 3) * 0.04);
          st.rotation.z = rng.range(-0.22, 0.22); g.add(st);
        }
      } else if (kind === 'eggs') {
        const basket = P.basket(0.38, 0.24); basket.position.set(-0.68, 0.9, 0.02); g.add(basket);
        const straw = B.cyl(0.34, 0.34, 0.03, m.straw, 12); straw.position.set(-0.68, 0.94, 0.02); g.add(straw);
        for (let k = 0; k < 14; k++) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.052, 7, 6),
            new THREE.MeshStandardMaterial({ color: rng.chance(0.3) ? 0xd8c8a8 : 0xf0e8d0, roughness: 0.65 }));
          const a = (k / 14) * TAU, rr = k < 8 ? 0.23 : 0.12;
          egg.position.set(-0.68 + Math.cos(a) * rr, 0.97 + (k < 8 ? 0 : 0.07), 0.02 + Math.sin(a) * rr * 0.8);
          egg.scale.y = 1.3; g.add(egg);
        }
        // 第二筐鸭蛋（青壳）
        const basket2 = P.basket(0.3, 0.2); basket2.position.set(0.12, 0.9, -0.06); g.add(basket2);
        const straw2 = B.cyl(0.26, 0.26, 0.03, m.straw, 10); straw2.position.set(0.12, 0.94, -0.06); g.add(straw2);
        for (let k = 0; k < 10; k++) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.048, 7, 6),
            new THREE.MeshStandardMaterial({ color: rng.chance(0.4) ? 0x8fa89a : 0xa8c0b0, roughness: 0.6 }));
          const a = (k / 10) * TAU, rr = k < 6 ? 0.18 : 0.08;
          egg.position.set(0.12 + Math.cos(a) * rr, 0.97 + (k < 6 ? 0 : 0.06), -0.06 + Math.sin(a) * rr * 0.8);
          egg.scale.y = 1.3; g.add(egg);
        }
        // 一杆小秤
        const scalePost = B.cyl(0.014, 0.014, 0.5, m.woodDark, 5);
        scalePost.position.set(0.78, 1.14, 0.16); g.add(scalePost);
        const scaleBeam = B.box(0.46, 0.018, 0.018, m.woodDark, 0.3);
        scaleBeam.position.set(0.78, 1.38, 0.16); g.add(scaleBeam);
        const pan = B.cyl(0.11, 0.09, 0.035, m.metalDark, 10);
        pan.position.set(0.99, 1.2, 0.16); g.add(pan);
        const w = B.cyl(0.05, 0.05, 0.06, m.metalDark, 8);
        w.position.set(0.56, 1.32, 0.16); g.add(w);
      } else if (kind === 'cloth') {
        // 成卷的布 + 叠好的布匹 + 挂在檐下的布样
        for (let k = 0; k < 6; k++) {
          const cm = new THREE.MeshStandardMaterial({ color: rng.pick([0xb8342a, 0x3a5f96, 0xd8b23c, 0x3f6b3a, 0x8a5a8a]), roughness: 0.95 });
          const roll = B.cyl(0.115, 0.115, 0.9, cm, 10);
          roll.rotation.z = Math.PI / 2; roll.position.set(-1.05 + k * 0.24, 1.0, -0.12 - (k % 2) * 0.12); g.add(roll);
        }
        for (let k = 0; k < 8; k++) {
          const cm = new THREE.MeshStandardMaterial({ color: rng.pick([0xb8342a, 0x3a5f96, 0xd8b23c, 0x3f6b3a, 0xb06a8a]), roughness: 0.95 });
          const cloth = B.box(0.52, 0.05, 0.42, cm, 0.6);
          cloth.position.set(0.6, 0.92 + (k % 4) * 0.052, -0.24 + Math.floor(k / 4) * 0.2);
          cloth.rotation.y = rng.range(-0.08, 0.08); g.add(cloth);
        }
        for (let k = 0; k < 4; k++) {
          const cm = new THREE.MeshStandardMaterial({ color: rng.pick([0xb8342a, 0x3a5f96, 0xd8b23c, 0x8a5a8a]), roughness: 0.95, side: THREE.DoubleSide });
          const sample = B.plane(0.2, 0.52, cm, 1, 1);
          sample.position.set(-0.9 + k * 0.42, 1.7, 0.93);
          sample.rotation.y = rad(rng.range(-6, 6));
          g.add(sample);
        }
      } else {
        for (let k = 0; k < 4; k++) {
          const shaft = B.cyl(0.022, 0.025, 1.1, m.woodDark, 6);
          shaft.position.set(-0.95 + k * 0.34, 0.95, 0.02); shaft.rotation.x = Math.PI / 2; g.add(shaft);
          const head = B.box(0.055, 0.13, 0.2, m.metalDark, 0.4);
          head.position.set(-1.03 + k * 0.34, 0.95, 0.5); head.rotation.x = rad(90); g.add(head);
        }
        for (let k = 0; k < 3; k++) {
          const coil = new THREE.Mesh(new THREE.TorusGeometry(0.09 + k * 0.025, 0.02, 5, 12), m.straw);
          coil.rotation.x = Math.PI / 2; coil.position.set(0.72, 0.9 + k * 0.02, -0.05); g.add(coil);
        }
      }
      // 摊前的长凳
      const bench = new THREE.Group();
      const seat = B.box(1.1, 0.07, 0.3, m.woodDark, 0.6); seat.position.y = 0.42; bench.add(seat);
      for (const sx of [-1, 1]) {
        const leg = B.box(0.07, 0.42, 0.26, m.woodDark, 0.4);
        leg.position.set(sx * 0.42, 0.21, 0); bench.add(leg);
      }
      bench.position.set(0.15, 0, 1.35); bench.rotation.y = rad(-4); g.add(bench);
      return MT.props.prop(g);
    }

    /* ---------------- 文化信物 ---------------- */
    _collectible(id, name, x, z) {
      const m = MT.M(), B = MT.Build;
      const g = new THREE.Group();
      const y = this.terrain.heightAt(x, z);
      g.position.set(x, y + 0.55, z);
      const inner = new THREE.Group();
      g.add(inner);
      let mesh;
      switch (id) {
        case 'nijiaochui': { // 泥叫吹（小鸟形泥哨）
          const mat = new THREE.MeshStandardMaterial({ color: 0xb0824a, roughness: 0.85 });
          mesh = B.box(0.22, 0.16, 0.12, mat, 0.3);
          const head = B.sphere(0.07, mat, 8); head.position.set(0.14, 0.05, 0); inner.add(head);
          const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), MT.M().yellow);
          beak.rotation.z = rad(-90); beak.position.set(0.22, 0.05, 0); inner.add(beak);
          const tail = B.box(0.1, 0.03, 0.08, mat, 0.3); tail.position.set(-0.15, 0.04, 0); inner.add(tail);
          break;
        }
        case 'huagudeng': { // 花鼓灯
          const lantern = MT.props.lantern();
          lantern.scale.setScalar(1.1);
          inner.add(lantern);
          const stick = B.cyl(0.02, 0.02, 0.9, MT.M().wood, 6);
          stick.position.set(0, -0.3, 0); inner.add(stick);
          break;
        }
        case 'menshen': { // 门神年画
          const mat = MT.texture.textMat('门神', { key: 'menshen', w: 320, h: 480, bg: '#c8342a', color: '#ffe9b0', fontSize: 150, serif: true, border: true });
          mesh = B.plane(0.3, 0.45, mat, 1, 1);
          break;
        }
        case 'hutou': { // 虎头鞋
          const red = MT.mat.solid(0xc8342a, { roughness: 0.85 });
          mesh = B.box(0.22, 0.12, 0.32, red, 0.3);
          const toe = B.sphere(0.09, MT.mat.solid(0xd8b23c, { roughness: 0.9 }), 8);
          toe.position.set(0, 0.0, 0.14); inner.add(toe);
          break;
        }
        case 'yulou': { // 鱼篓
          const b = MT.props.basket(0.22, 0.36);
          inner.add(b);
          const fish = B.box(0.26, 0.06, 0.1, MT.mat.solid(0x9aa8b0, { roughness: 0.5, metalness: 0.3 }), 0.3);
          fish.position.set(0.2, 0.05, 0); inner.add(fish);
          break;
        }
        case 'lianpeng': { // 莲蓬
          const pod = B.cyl(0.09, 0.05, 0.13, MT.mat.solid(0x6f9a4a, { roughness: 0.9 }), 10);
          inner.add(pod);
          for (let i = 0; i < 5; i++) {
            const seed = B.sphere(0.025, MT.mat.solid(0x4a6b3a, { roughness: 0.8 }), 6);
            const a = i / 5 * TAU;
            seed.position.set(Math.cos(a) * 0.05, 0.07, Math.sin(a) * 0.05); inner.add(seed);
          }
          const stem = B.cyl(0.015, 0.015, 0.4, MT.mat.solid(0x5b8a3a, { roughness: 0.9 }), 6);
          stem.position.y = -0.26; inner.add(stem);
          break;
        }
        case 'maisui': { // 麦穗
          const geo = MT.vegetationGeo.crossedGeo(0.4, 0.7, 2);
          const mat = new THREE.MeshStandardMaterial({ map: MT.tex.cropWheat(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
          mesh = new THREE.Mesh(geo, mat);
          mesh.position.y = -0.35;
          break;
        }
        default: { // 稻草人小像
          const straw = MT.mat.straw();
          mesh = B.cyl(0.09, 0.12, 0.4, straw, 8);
          const head = B.sphere(0.08, straw, 8); head.position.y = 0.26; inner.add(head);
          break;
        }
      }
      if (mesh) inner.add(mesh);
      // 光柱（便于寻找，但在画面里要克制）
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffe6a0, transparent: true, opacity: 0.07, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.2, 12, 1, true), beamMat);
      beam.position.y = 0.85;
      g.add(beam);
      g.userData.collectible = { id, name, taken: false };
      g.userData.spin = inner;
      this.group.add(g);
      return { id, name, x, z, obj: g, taken: false };
    }

    /* ---------------- 树木装饰（依赖植被系统） ---------------- */
    decorate(veg) {
      if (!veg) return;
      const r = this.rng, T = this.terrain;
      // 村口大槐树
      if (veg.bigTree) {
        const bt = veg.bigTree(6, -41, 'locust');
        bt.position.y = T.heightAt(6, -41);
        this.group.add(bt);
      }
      // 祠堂、土地庙、老屋前的柏树（对称）
      const pairs = [
        [34 - 7.5, 70], [34 + 7.5, 70], [34 - 7.5, 82], [34 + 7.5, 82],
        [-28 - 3.4, 32], [-28 + 3.4, 32],
        [-16 - 7, 8], [-16 + 7, 8],
      ];
      for (const [x, z] of pairs) {
        this._conifer(veg, x, z);
      }
      // 竹丛
      for (const [bx, bz] of [[-22, 8], [46, 40], [-12, 60], [88, 20], [-108, 12]]) {
        const b = veg.bamboo(bx, bz, 8 + (r.next() * 6 | 0));
        b.position.y = T.heightAt(bx, bz);
        this.group.add(b);
        this.zone(bx, bz, 3);
      }
      // 菜园（几户人家）
      const gardens = [[-6, 20], [30, 54], [68, 44], [-100, 22], [10, 52]];
      for (const [gx, gz] of gardens) {
        const gg = this._vegetableGarden(r);
        gg.position.set(gx, T.heightAt(gx, gz), gz);
        gg.rotation.y = r.range(-0.3, 0.3);
        this.group.add(gg);
        this.zone(gx, gz, 6);
      }
    }

    _conifer(veg, x, z) {
      const m = MT.M(), B = MT.Build, T = this.terrain;
      const gy = T.heightAt(x, z);
      const g = new THREE.Group();
      g.position.set(x, gy, z);
      const rng = this.rng;
      const h = rng.range(6.5, 9.5);
      const trunk = B.cyl(0.14, 0.2, h * 0.5, MT.mat.solid(0x50463c, { roughness: 0.95 }), 8);
      trunk.position.y = h * 0.25; g.add(trunk);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2f5c30, roughness: 0.95, flatShading: true });
      for (let i = 0; i < 3; i++) {
        const t = i / 2;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5 - t * 0.75, h * 0.5, 8), mat);
        cone.position.y = h * (0.42 + t * 0.26);
        cone.castShadow = true; cone.receiveShadow = true;
        g.add(cone);
      }
      this.group.add(g);
      this.zone(x, z, 2.5);
      MT.colliders.push({ x, y: gy + h / 2, z, hw: 0.3, hh: h / 2, hd: 0.3, ry: 0, cos: 1, sin: 0, active: true });
      return g;
    }

    /* ---------------- 菜园 ---------------- */
    _vegetableGarden(rng) {
      const m = MT.M(), B = MT.Build;
      const g = new THREE.Group();
      const w = 7, d = 5;
      // 土垄
      const soil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MT.mat.vegBed());
      soil.rotation.x = -Math.PI / 2; soil.position.y = 0.05; soil.receiveShadow = true;
      g.add(soil);
      // 篱笆
      const fenceMat = MT.mat.solid(0xb0a080, { roughness: 0.95 });
      const mkFence = (len, x, z, ry) => {
        const f = new THREE.Group();
        for (let i = 0; i <= Math.floor(len / 0.5); i++) {
          const st = B.cyl(0.028, 0.032, 0.9, fenceMat, 5);
          st.position.set(-len / 2 + i * 0.5, 0.45, 0);
          st.rotation.z = rng.range(-0.06, 0.06);
          f.add(st);
        }
        for (const y of [0.35, 0.72]) {
          const rail = B.cyl(0.022, 0.022, len, fenceMat, 5);
          rail.rotation.z = Math.PI / 2; rail.position.y = y;
          f.add(rail);
        }
        f.position.set(x, 0, z); f.rotation.y = ry;
        return f;
      };
      g.add(mkFence(w, 0, d / 2, 0));
      g.add(mkFence(w, 0, -d / 2, 0));
      g.add(mkFence(d, -w / 2, 0, Math.PI / 2));
      // 菜
      const cabbageMat = new THREE.MeshStandardMaterial({ color: 0x7fae54, roughness: 0.95 });
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 4; j++) {
          if (rng.chance(0.15)) continue;
          const cab = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.12, 0.2), 8, 6), cabbageMat);
          cab.position.set(-w / 2 + 0.7 + i * 1.5, 0.15, -d / 2 + 0.7 + j * 1.2);
          cab.scale.y = 0.75; cab.castShadow = true;
          g.add(cab);
        }
      }
      // 番茄架 / 辣椒
      for (let i = 0; i < 3; i++) {
        const stake = B.cyl(0.025, 0.025, 1.5, MT.mat.solid(0x8a7a58, { roughness: 1 }), 5);
        stake.position.set(-2.2 + i * 0.6, 0.75, -1.8); g.add(stake);
        const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), new THREE.MeshStandardMaterial({ color: 0xd0402a, roughness: 0.7 }));
        tomato.position.set(-2.2 + i * 0.6 + 0.1, 1.1, -1.7); g.add(tomato);
      }
      // 水桶
      const bucket = B.cyl(0.18, 0.15, 0.28, MT.mat.solid(0x2f6b8a, { roughness: 0.7 }), 10);
      bucket.position.set(w / 2 - 0.5, 0.14, -d / 2 + 0.5); g.add(bucket);
      return MT.props.prop(g);
    }

    /* ---------------- 四季 ---------------- */
    setSeason(season) {
      this.season = season;
      for (const mat of this.lampMats) { /* 路灯材质不随季节变 */ }
    }

    /** 夜间点亮窗口与路灯 */
    updateNight(nightFactor) {
      const lit = nightFactor > 0.32;
      const k = clamp((nightFactor - 0.25) / 0.45, 0, 1);
      const M = MT.M();
      if (M.windowLit) M.windowLit.emissiveIntensity = k * 0.95;
      for (const lm of this.lampMats) {
        if (lm) lm.emissiveIntensity = k * 1.35;
      }
      for (const w of this.windowMats) if (w) w.emissiveIntensity = k * 0.95;
    }
  }

  MT.Village = Village;
})();
