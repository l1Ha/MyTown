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
        const stone = B.box(1.3, 0.42, 0.48, MT.M().stone, 0.8);
        stone.position.set(0, 0.21, 0); stone.castShadow = true; stone.receiveShadow = true;
        g.add(stone);
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
      const market = new THREE.Group();
      market.position.set(-44, T.heightAt(-44, -14), -14);
      for (let i = 0; i < 4; i++) {
        const stall = this._stall(r, i);
        stall.position.set(0, 0, i * 7 - 10);
        stall.rotation.y = rad(180 + r.range(-6, 6));
        market.add(stall);
      }
      this.group.add(market);
      this.zone(-44, -14, 18);
      this.poi('market', '集市 · 逢集', '风俗', -44, -12, 9);
      this.npc('卖菜婆婆', -46, -10, 'vendor', { lines: 'market' });
      this.npc('李婶', -42, -20, 'vendor', { lines: 'market' });
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
    }

    /* ---------------- 老井 ---------------- */
    _well() {
      const m = MT.M(), B = MT.Build;
      const g = new THREE.Group();
      const pad = B.box(3.4, 0.12, 3.4, MT.mat.cement(1, 1), 1.2);
      pad.position.y = 0.06; g.add(pad);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.95, 16, 1, true), m.stone);
      ring.position.y = 0.5; ring.castShadow = true; ring.receiveShadow = true;
      ring.material = new THREE.MeshStandardMaterial({ map: MT.texture.cloneTex('concrete', 3, 1), roughness: 0.95, side: THREE.DoubleSide });
      g.add(ring);
      const waterIn = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), MT.mat.water(0x1f3a3a, 0.95));
      waterIn.rotation.x = -Math.PI / 2; waterIn.position.y = 0.25;
      g.add(waterIn);
      // 井台栏
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 6, 18), m.stone);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.97; g.add(rim);
      // 井架与辘轳
      for (const sx of [-1, 1]) {
        const post = B.box(0.14, 1.8, 0.14, m.wood, 0.7);
        post.position.set(sx * 0.82, 1.85, 0); g.add(post);
      }
      const beam = B.cyl(0.08, 0.08, 1.8, m.wood, 8);
      beam.rotation.z = Math.PI / 2; beam.position.y = 2.7; g.add(beam);
      const roller = B.cyl(0.12, 0.12, 0.7, m.woodDark, 10);
      roller.rotation.z = Math.PI / 2; roller.position.y = 2.3; g.add(roller);
      const crank = B.box(0.5, 0.06, 0.06, m.metalDark, 0.5);
      crank.position.set(1.0, 2.3, 0.25); crank.rotation.x = rad(20); g.add(crank);
      const rope = B.cyl(0.015, 0.015, 1.3, MT.mat.solid(0x6b5a3a, { roughness: 1 }), 5);
      rope.position.set(0.2, 1.6, 0); g.add(rope);
      const bucket = B.cyl(0.22, 0.18, 0.3, m.metalDark, 10);
      bucket.position.set(0.2, 0.8, 0); g.add(bucket);
      // 井边石板 + 水渍
      const slab = B.box(1.2, 0.1, 1.2, m.stone, 0.9);
      slab.position.set(-1.6, 0.06, 0.6); g.add(slab);
      return MT.props.prop(g);
    }

    /* ---------------- 集市摊位 ---------------- */
    _stall(rng, i) {
      const m = MT.M(), B = MT.Build, P = MT.props;
      const g = new THREE.Group();
      // 摊板
      const tbl = B.box(2.6, 0.08, 1.1, m.wood, 1.0);
      tbl.position.y = 0.82; g.add(tbl);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = B.box(0.08, 0.8, 0.08, m.wood, 0.5);
        leg.position.set(sx * 1.2, 0.4, sz * 0.45); g.add(leg);
      }
      // 遮阳伞
      const pole = B.cyl(0.045, 0.045, 2.4, m.metal, 8);
      pole.position.set(0, 1.2, -0.6); g.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 8),
        new THREE.MeshStandardMaterial({ color: rng.pick([0x3a5f96, 0xa8321f, 0x2f6b4a]), roughness: 0.9, side: THREE.DoubleSide }));
      canopy.position.set(0, 2.5, -0.6); g.add(canopy);
      const trim = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.05, 4, 8), m.yellow);
      trim.rotation.x = Math.PI / 2; trim.position.set(0, 2.16, -0.6); g.add(trim);
      // 摊上的货
      const kinds = ['vege', 'eggs', 'cloth', 'tools'];
      const kind = kinds[i % kinds.length];
      if (kind === 'vege') {
        for (let k = 0; k < 8; k++) {
          const cab = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.11, 0.17), 8, 6),
            new THREE.MeshStandardMaterial({ color: rng.pick([0x6aa84a, 0x8fbf60, 0xd8d0a0]), roughness: 0.9 }));
          cab.position.set(-1.0 + k * 0.28, 0.94, rng.range(-0.3, 0.3));
          cab.scale.y = 0.85; g.add(cab);
        }
        const basket = P.basket(0.35, 0.3); basket.position.set(-1.1, 0.86, -0.0); g.add(basket);
      } else if (kind === 'eggs') {
        for (let k = 0; k < 12; k++) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5),
            new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.7 }));
          egg.position.set(-1.0 + (k % 6) * 0.34, 0.9 + Math.floor(k / 6) * 0.09, rng.range(-0.2, 0.2));
          egg.scale.y = 1.25; g.add(egg);
        }
      } else if (kind === 'cloth') {
        for (let k = 0; k < 5; k++) {
          const cloth = B.box(0.4, 0.04, 0.8, MT.mat.solid(rng.pick([0xb8342a, 0x3a5f96, 0xd8b23c, 0x3f6b3a]), { roughness: 0.95 }), 0.6);
          cloth.position.set(-1.0 + k * 0.45, 0.88 + k * 0.04, 0); g.add(cloth);
        }
      } else {
        for (let k = 0; k < 4; k++) {
          const hoe = B.cyl(0.03, 0.03, 1.1, m.wood, 6);
          hoe.position.set(-0.9 + k * 0.6, 0.86, 0.1); hoe.rotation.x = Math.PI / 2;
          hoe.rotation.z = rad(90); g.add(hoe);
          const head = B.box(0.06, 0.14, 0.2, m.metalDark, 0.4);
          head.position.set(-1.35 + k * 0.6, 0.86, 0.1); g.add(head);
        }
      }
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
      // 光柱（便于寻找）
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffe6a0, transparent: true, opacity: 0.16, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.4, 12, 1, true), beamMat);
      beam.position.y = 1.2;
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
