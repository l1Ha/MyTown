/* =============================================================
 *  MyTown · 我的家乡 3D  —  村民（低多边形人物 / 行走 / 对话）
 *  npc.js
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad, lerp, clamp, damp, TAU } = MT.util;

  const SKIN = [0xe8b98e, 0xe0ab7c, 0xd8a074, 0xf0c69c];
  const SHIRT_OLD = [0x3f4a5a, 0x4a4a48, 0x5a4a3a, 0x3a4a42, 0x6a5a4a];
  const SHIRT_MID = [0x8a4a3a, 0x3a5f8a, 0x4a6b4a, 0x9a7a4a, 0x7a5a7a];
  const SHIRT_KID = [0xd84a3a, 0x3a8ad8, 0xe0b040, 0x48b06a];
  const PANTS = [0x2a2a2e, 0x3a3a40, 0x4a4438, 0x2a3a4a];

  function pick(rng, arr) { return arr[(rng.next() * arr.length) | 0]; }

  /* =========================================================
   *  单个村民
   * ========================================================= */
  class Villager {
    constructor(rng, opts = {}) {
      this.rng = rng;
      this.name = opts.name || '村民';
      this.role = opts.role || 'villager';
      this.linesKey = opts.lines || 'field';
      this.indoor = !!opts.indoor;
      this.speed = opts.speed || rng.range(0.75, 1.15);
      this.talked = false;
      this.lineIndex = 0;
      this.pauseTimer = rng.range(0, 3);
      this.facing = 0;
      this.targetFacing = 0;
      this.talking = false;
      this.build();
    }

    build() {
      const r = this.rng;
      const kid = this.role === 'child';
      const old = this.role === 'elder' || this.role === 'vendor';
      const h = kid ? r.range(1.05, 1.25) : r.range(1.55, 1.78);
      const s = h / 1.68;
      this.height = h;
      const g = new THREE.Group();
      this.groupObj = g;
      this.body = new THREE.Group();
      g.add(this.body);

      const skinMat = new THREE.MeshStandardMaterial({ color: pick(r, SKIN), roughness: 0.85 });
      const shirtMat = new THREE.MeshStandardMaterial({
        color: kid ? pick(r, SHIRT_KID) : old ? pick(r, SHIRT_OLD) : pick(r, SHIRT_MID),
        roughness: 0.95,
      });
      const pantsMat = new THREE.MeshStandardMaterial({ color: pick(r, PANTS), roughness: 0.95 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.9 });
      this.shirtMat = shirtMat;

      // 体型差异（肩宽 / 肚子 / 袖长）
      const belly = old ? r.range(1.05, 1.35) : (this.role === 'farmer' ? r.range(0.95, 1.2) : r.range(0.9, 1.05));
      const shoulderW = r.range(0.9, 1.15);
      const shortSleeve = r.chance(0.6);
      const creamMat = new THREE.MeshStandardMaterial({ color: 0xece6d6, roughness: 0.95 });

      // 躯干（圆润的胶囊体，压扁成椭圆截面）
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * s, 0.2 * s, 4, 12), shirtMat);
      torso.position.y = 1.08 * s;
      torso.scale.set(shoulderW, 1, 0.62 * belly);
      torso.castShadow = true; torso.receiveShadow = true;
      this.body.add(torso);
      // 肩
      const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.075 * s, 0.24 * s, 4, 10), shirtMat);
      shoulders.rotation.z = Math.PI / 2;
      shoulders.position.y = 1.3 * s;
      shoulders.scale.set(1, 1, 0.72);
      shoulders.castShadow = true;
      this.body.add(shoulders);
      // 胯
      const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * s, 0.06 * s, 4, 10), pantsMat);
      hips.rotation.z = Math.PI / 2;
      hips.position.y = 0.86 * s;
      hips.scale.set(1, 1, 0.7);
      this.body.add(hips);
      // 衣领
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.086 * s, 0.022 * s, 6, 16), creamMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 1.365 * s;
      this.body.add(collar);

      // 脖子 + 头
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.075 * s, 0.12 * s, 10), skinMat);
      neck.position.y = 1.4 * s; this.body.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 18, 14), skinMat);
      head.position.y = 1.55 * s; head.scale.set(0.9, 1.04, 0.96);
      head.castShadow = true;
      this.head = head;
      this.body.add(head);
      // 下颌 / 下巴
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.088 * s, 12, 10), skinMat);
      jaw.position.set(0, 1.487 * s, 0.02 * s); jaw.scale.set(0.96, 0.82, 1.02);
      this.body.add(jaw);
      // 耳朵
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 10, 8), skinMat);
        ear.position.set(sx * 0.113 * s, 1.545 * s, -0.005 * s);
        ear.scale.set(0.55, 1.05, 0.9);
        this.body.add(ear);
      }
      // 鼻子（柔和的球，不做成棱）
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02 * s, 10, 8), skinMat);
      nose.position.set(0, 1.53 * s, 0.118 * s); nose.scale.set(0.85, 1.1, 1.0);
      this.body.add(nose);
      // 眼白 + 瞳孔 + 眉毛
      const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.5 });
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1e1811, roughness: 0.4 });
      const browMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.9 });
      for (const sx of [-1, 1]) {
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.018 * s, 10, 8), scleraMat);
        sclera.position.set(sx * 0.043 * s, 1.566 * s, 0.113 * s); sclera.scale.set(1, 0.82, 0.55);
        this.body.add(sclera);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0075 * s, 8, 6), pupilMat);
        pupil.position.set(sx * 0.043 * s, 1.566 * s, 0.121 * s);
        this.body.add(pupil);
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045 * s, 0.01 * s, 0.012 * s), browMat);
        brow.position.set(sx * 0.044 * s, 1.594 * s, 0.108 * s); brow.rotation.z = sx * rad(7);
        this.body.add(brow);
      }
      // 嘴
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.042 * s, 0.011 * s, 0.012 * s),
        new THREE.MeshStandardMaterial({ color: 0x8a4a40, roughness: 0.8 }));
      mouth.position.set(0, 1.497 * s, 0.112 * s); this.body.add(mouth);
      // 头发（多种发型）
      const hairMat = new THREE.MeshStandardMaterial({ color: old ? 0x8f8b86 : 0x211d1a, roughness: 0.95 });
      const style2 = (this.role === 'child') ? 'bowl' : (old ? 'short' : (r.chance(0.45) ? 'bowl' : (r.chance(0.5) ? 'bun' : 'short')));
      this.hairStyle = style2;
      if (style2 !== 'bald') {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.132 * s, 16, 12, 0, TAU, 0, Math.PI * 0.42), hairMat);
        cap.position.y = 1.566 * s; cap.scale.set(1.0, 0.92, 1.05); cap.rotation.x = rad(4);
        this.body.add(cap);
        // 后脑发量（不遮脸）
        const back = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 14, 12), hairMat);
        back.position.set(0, 1.55 * s, -0.048 * s); back.scale.set(0.95, 0.95, 0.62);
        this.body.add(back);
        if (style2 === 'bowl') {
          const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.038 * s, 0.03 * s), hairMat);
          fringe.position.set(0, 1.652 * s, 0.098 * s); fringe.rotation.x = rad(15);
          this.body.add(fringe);
        } else if (style2 === 'bun') {
          const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 12, 10), hairMat);
          bun.position.set(0, 1.585 * s, -0.135 * s);
          this.body.add(bun);
        }
      }

      // 手臂（两段胶囊 + 圆手）
      this.arms = [];
      for (const sx of [-1, 1]) {
        const arm = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.046 * s, 0.18 * s, 4, 10), shirtMat);
        upper.position.y = -0.12 * s; upper.castShadow = true;
        arm.add(upper);
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04 * s, 0.16 * s, 4, 10), shortSleeve ? skinMat : shirtMat);
        forearm.position.y = -0.34 * s; forearm.castShadow = true;
        arm.add(forearm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.044 * s, 8, 6), skinMat);
        hand.position.y = -0.475 * s; hand.scale.set(1, 1.15, 0.72);
        arm.add(hand);
        arm.position.set(sx * 0.20 * s * shoulderW, 1.32 * s, 0);
        arm.rotation.z = sx * rad(5);
        this.body.add(arm);
        this.arms.push(arm);
      }
      // 腿（两段胶囊 + 圆头鞋）
      this.legs = [];
      for (const sx of [-1, 1]) {
        const leg = new THREE.Group();
        const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.072 * s, 0.30 * s, 4, 10), pantsMat);
        thigh.position.y = -0.22 * s; thigh.castShadow = true;
        leg.add(thigh);
        const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055 * s, 0.32 * s, 4, 10), pantsMat);
        shin.position.y = -0.66 * s;
        leg.add(shin);
        const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * s, 0.12 * s, 4, 8), shoeMat);
        shoe.rotation.x = Math.PI / 2;
        shoe.position.set(0, -0.93 * s, 0.035 * s);
        shoe.scale.set(1, 1, 0.82);
        leg.add(shoe);
        leg.position.set(sx * 0.09 * s, 1.0 * s, 0);
        this.body.add(leg);
        this.legs.push(leg);
      }

      // 装扮：草帽 / 头巾 / 毛巾
      const style = r.next();
      if (old && style < 0.45) {
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26 * s, 0.14 * s, 14), MT.mat.straw());
        hat.position.y = 1.63 * s; hat.castShadow = true;
        this.body.add(hat);
      } else if (!kid && style < 0.7) {
        const towelMat = new THREE.MeshStandardMaterial({ color: r.chance(0.5) ? 0xd8d4c8 : 0x9ab0c8, roughness: 0.95 });
        // 搭在肩上的毛巾（卷起的一条，不再是大板）
        const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.035 * s, 0.22 * s, 4, 8), towelMat);
        roll.rotation.z = Math.PI / 2; roll.rotation.y = rad(10);
        roll.position.set(0.1 * s, 1.33 * s, 0.02 * s);
        this.body.add(roll);
      } else if (r.chance(0.5)) {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.14 * s, 0.18 * s),
          new THREE.MeshStandardMaterial({ color: r.pick([0xb8342a, 0x3a6b9a, 0xd8b23c]), roughness: 0.95 }));
        cloth.position.y = 1.6 * s;
        this.body.add(cloth);
      }
      // 农具（锄头 / 篮子）
      if (this.role === 'farmer' || this.role === 'miller') {
        const hoe = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017 * s, 0.02 * s, 1.0 * s, 6), MT.mat.wood());
        shaft.position.y = 0.1 * s;
        hoe.add(shaft);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055 * s, 0.085 * s, 0.18 * s), MT.mat.metal(0x6a7076, 0.5));
        blade.position.set(0, -0.4 * s, 0.05 * s);
        hoe.add(blade);
        hoe.position.set(0.33 * s, 1.02 * s, -0.04 * s);
        hoe.rotation.z = rad(-26); hoe.rotation.x = rad(12);
        this.tool = hoe;
        this.body.add(hoe);
      }
      if (this.role === 'vendor') {
        const basket = MT.props.basket(0.2 * s, 0.2 * s);
        basket.position.set(0.3 * s, 0.6 * s, 0.15 * s);
        this.body.add(basket);
      }
      if (this.role === 'child') {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 5), MT.mat.wood());
        stick.position.set(0.24, 0.75, 0.1);
        this.body.add(stick);
      }
      g.userData.prop = true;
      g.userData.noBatch = true;   // 人物是动态的，不参与静态合并
      g.traverse((o) => { o.userData.prop = true; o.userData.noBatch = true; });

      // 巡逻路线
      this.waypoints = [];
      this.wpIndex = 0;
      this.patrolPhase = this.rng.next() * TAU;
      // 走路相位
      this.phase = this.rng.next() * TAU;
      this.bobPhase = this.rng.next() * TAU;
    }

    setWaypoints(list) {
      this.waypoints = list;
      this.wpIndex = 0;
    }

    /** 目标朝向（弧度） */
    faceTowards(x, z) {
      const dx = x - this.groupObj.position.x;
      const dz = z - this.groupObj.position.z;
      if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
      this.targetFacing = Math.atan2(dx, dz);
    }
    lookAt(pos) { this.faceTowards(pos.x, pos.z); }

    update(dt, terrain, t, player) {
      const g = this.groupObj;
      // 与玩家对话时站住并转向玩家
      if (this.talking && player) {
        this.faceTowards(player.position.x, player.position.z);
        this._turnOnly(dt);
        return;
      }
      let moving = false;
      if (this.waypoints.length > 0) {
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          // 站立时轻微动作
          this._idle(t, dt);
        } else {
          const wp = this.waypoints[this.wpIndex % this.waypoints.length];
          const dx = wp.x - g.position.x, dz = wp.z - g.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.45) {
            this.wpIndex++;
            this.pauseTimer = this.rng.range(1.5, 8);
            if (this.rng.chance(0.35)) this.targetFacing += this.rng.range(-1.6, 1.6);
          } else {
            const sp = this.speed * dt;
            g.position.x += (dx / dist) * sp;
            g.position.z += (dz / dist) * sp;
            this.targetFacing = Math.atan2(dx, dz);
            moving = true;
            this.phase += dt * this.speed * 5.2;
          }
        }
      } else {
        this._idle(t, dt);
      }
      // 朝向平滑
      this._turnOnly(dt);
      // 贴地
      if (terrain) {
        g.position.y = terrain.heightAt(g.position.x, g.position.z);
      }
      // 行走动画
      if (moving) {
        const sw = Math.sin(this.phase) * 0.55;
        if (this.legs[0]) this.legs[0].rotation.x = sw;
        if (this.legs[1]) this.legs[1].rotation.x = -sw;
        if (this.arms[0]) this.arms[0].rotation.x = -sw * 0.7;
        if (this.arms[1]) this.arms[1].rotation.x = sw * 0.7;
        this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.035;
        this.body.rotation.z = Math.sin(this.phase) * 0.025;
      } else {
        this._idle(t, dt);
      }
    }

    _idle(t, dt) {
      const k = 1 - Math.exp(-dt * 6);
      if (this.legs[0]) this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, 0, k);
      if (this.legs[1]) this.legs[1].rotation.x = lerp(this.legs[1].rotation.x, 0, k);
      if (this.arms[0]) this.arms[0].rotation.x = lerp(this.arms[0].rotation.x, Math.sin(t * 0.8) * 0.05, k);
      if (this.arms[1]) this.arms[1].rotation.x = lerp(this.arms[1].rotation.x, -Math.sin(t * 0.8) * 0.05, k);
      this.body.position.y = Math.sin(t * 1.3 + this.bobPhase) * 0.008;
      this.body.rotation.z = Math.sin(t * 0.7 + this.bobPhase) * 0.008;
      if (this.head) {
        this.head.rotation.y = Math.sin(t * 0.5 + this.bobPhase) * 0.25;
      }
    }
    _turnOnly(dt) {
      let d = this.targetFacing - this.facing;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.facing += d * (1 - Math.exp(-dt * 6));
      this.groupObj.rotation.y = this.facing;
    }
    nextLine() {
      const c = MT.Culture;
      const list = c.dialogues[this.linesKey] || c.dialogues.field;
      const line = list[this.lineIndex % list.length];
      this.lineIndex++;
      this.talked = true;
      return line;
    }
  }

  /* =========================================================
   *  村民系统
   * ========================================================= */
  class NPCSystem {
    constructor(scene, terrain, village, opts = {}) {
      this.scene = scene;
      this.terrain = terrain;
      this.village = village;
      this.rng = opts.rng || new MT.RNG(4242);
      this.group = new THREE.Group();
      this.group.name = '村民';
      scene.add(this.group);
      this.npcs = [];
      this.spawn();
    }
    spawn() {
      const r = this.rng, T = this.terrain;
      for (const spot of this.village.npcSpots) {
        const npc = new Villager(r, {
          name: spot.name, role: spot.role, lines: spot.lines, indoor: spot.indoor,
        });
        npc.groupObj.position.set(spot.x, T.heightAt(spot.x, spot.z), spot.z);
        npc.facing = npc.targetFacing = r.next() * TAU;
        npc.groupObj.rotation.y = npc.facing;
        this.group.add(npc.groupObj);
        // 巡逻路线
        if (!spot.indoor) {
          const n = 2 + ((r.next() * 3) | 0);
          const wps = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + r.next();
            const d = r.range(2.5, 9);
            const x = spot.x + Math.cos(a) * d;
            const z = spot.z + Math.sin(a) * d;
            if (T.waterDepth(x, z) > 0.2) continue;
            if (MT.inBuildZone(x, z, -2)) {
              // 允许在自家院子里走，但不穿墙
            }
            wps.push({ x, z });
          }
          if (wps.length) npc.setWaypoints(wps);
        }
        this.npcs.push(npc);
      }
      // 几名"路人"在村道上散步
      const walkers = [
        { name: '赶路的村民', x: 18, z: 60, role: 'farmer', lines: 'field' },
        { name: '遛弯的老汉', x: 2, z: -30, role: 'elder', lines: 'levee' },
      ];
      for (const w of walkers) {
        const npc = new Villager(r, w);
        npc.groupObj.position.set(w.x, T.heightAt(w.x, w.z), w.z);
        this.group.add(npc.groupObj);
        const wps = [];
        for (let i = 0; i < 3; i++) wps.push({ x: w.x + r.range(-14, 14), z: w.z + r.range(-24, 24) });
        npc.setWaypoints(wps);
        this.npcs.push(npc);
      }
    }
    /** 返回最近的可交谈村民 */
    nearest(pos, maxDist) {
      let best = null, bestD = maxDist;
      for (const n of this.npcs) {
        const d = n.groupObj.position.distanceTo(pos);
        if (d < bestD) { bestD = d; best = n; }
      }
      return best ? { npc: best, dist: bestD } : null;
    }
    update(dt, t, player) {
      for (const n of this.npcs) n.update(dt, this.terrain, t, player);
    }
    /** 让视线内的 NPC 永远不挡住玩家——简单处理：不做碰撞 */
  }

  MT.Villager = Villager;
  MT.NPCSystem = NPCSystem;
})();
