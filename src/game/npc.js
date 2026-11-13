/* =============================================================
 *  MyTown · 我的家乡 3D  —  村民（低多边形人物 / 行走 / 对话）
 *  npc.js
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { rad, lerp, clamp, damp, TAU } = MT.util;

  const SKIN = [0xdfae7f, 0xd7a172, 0xcf9668, 0xe9bd92];
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
      // 肩：一块横向的扁肩托，把躯干和两条手臂连成完整的肩线
      const yoke = new THREE.Mesh(new THREE.CapsuleGeometry(0.042 * s, 0.23 * s, 4, 12), shirtMat);
      yoke.rotation.z = Math.PI / 2;
      yoke.position.y = 1.281 * s;
      yoke.scale.set(0.5, 1.0, 0.72);
      yoke.castShadow = true;
      this.body.add(yoke);
      // 胯
      const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * s, 0.06 * s, 4, 10), pantsMat);
      hips.rotation.z = Math.PI / 2;
      hips.position.y = 0.86 * s;
      hips.scale.set(1, 1, 0.7);
      this.body.add(hips);
      // 衣领：立领（原来是一圈白色圆环，像戴着颈托）
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.072 * s, 0.078 * s, 0.055 * s, 14, 1, true), shirtMat);
      collar.position.y = 1.364 * s;
      this.body.add(collar);
      const collarTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.0735 * s, 0.0735 * s, 0.012 * s, 14, 1, true), creamMat);
      collarTrim.position.y = 1.392 * s;
      this.body.add(collarTrim);

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
      // 鼻子（小一些的柔和球 + 两个鼻孔）
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016 * s, 10, 8), skinMat);
      nose.position.set(0, 1.528 * s, 0.118 * s); nose.scale.set(0.85, 1.05, 0.9);
      this.body.add(nose);
      const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x9c6b58, roughness: 0.9 });
      for (const sx of [-1, 1]) {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0032 * s, 6, 5), nostrilMat);
        nostril.position.set(sx * 0.0062 * s, 1.521 * s, 0.128 * s);
        this.body.add(nostril);
      }
      // 眼白 + 虹膜 + 瞳孔 + 上眼睑 + 睫毛 + 眉毛
      const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf1ede3, roughness: 0.45 });
      const irisMat = new THREE.MeshStandardMaterial({ color: 0x5b3d24, roughness: 0.4 });
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.4 });
      const browMat = new THREE.MeshStandardMaterial({ color: old ? 0x6f675f : 0x2a2320, roughness: 0.9 });
      const lashMat = new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: 0.9 });
      for (const sx of [-1, 1]) {
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.017 * s, 10, 8), scleraMat);
        sclera.position.set(sx * 0.043 * s, 1.566 * s, 0.111 * s); sclera.scale.set(1, 0.85, 0.55);
        this.body.add(sclera);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.009 * s, 8, 6), irisMat);
        iris.position.set(sx * 0.043 * s, 1.566 * s, 0.117 * s);
        this.body.add(iris);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0048 * s, 8, 6), pupilMat);
        pupil.position.set(sx * 0.043 * s, 1.566 * s, 0.122 * s);
        this.body.add(pupil);
        // 上眼睑：压住眼白上缘，看起来像眼睛而不是贴了两颗白球
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0176 * s, 10, 6), skinMat);
        lid.position.set(sx * 0.043 * s, 1.579 * s, 0.112 * s); lid.scale.set(1.02, 0.4, 0.6);
        this.body.add(lid);
        // 睫毛线：一条细黑线，眼睛立刻不"空"
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.035 * s, 0.0042 * s, 0.008 * s), lashMat);
        lash.position.set(sx * 0.043 * s, 1.5765 * s, 0.118 * s); lash.rotation.z = sx * rad(3);
        this.body.add(lash);
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.044 * s, 0.011 * s, 0.012 * s), browMat);
        brow.position.set(sx * 0.044 * s, 1.596 * s, 0.109 * s); brow.rotation.z = -sx * rad(4);
        this.body.add(brow);
      }
      // 嘴：上唇线 + 下唇，别只是一道黑杠
      const lipMat = new THREE.MeshStandardMaterial({ color: 0xb06a5c, roughness: 0.8 });
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.032 * s, 0.0075 * s, 0.01 * s),
        new THREE.MeshStandardMaterial({ color: 0x7a4038, roughness: 0.85 }));
      mouth.position.set(0, 1.497 * s, 0.113 * s); this.body.add(mouth);
      const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.029 * s, 0.006 * s, 0.009 * s), lipMat);
      lowerLip.position.set(0, 1.4905 * s, 0.114 * s); this.body.add(lowerLip);
      // 头发 / 头巾
      const hairMat = new THREE.MeshStandardMaterial({ color: old ? 0x736e68 : 0x211d1a, roughness: 1.0 });
      const style2 = (this.role === 'child') ? 'bowl' : (old ? 'short' : (r.chance(0.45) ? 'bowl' : (r.chance(0.5) ? 'bun' : 'short')));
      // 上了年纪的摊主戴蓝灰头巾，既符合乡村习惯，也避免灰色头发像扣了个头盔
      const headscarf = old && (this.role === 'vendor' || r.chance(0.22));
      this.hairStyle = headscarf ? 'scarf' : style2;
      if (style2 !== 'bald' && !headscarf) {
        // 发帽：垂直半径必须大于头骨（0.125*1.04），否则头顶会从头发里钻出来"秃顶"
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 16, 12, 0, TAU, 0, Math.PI * 0.38), hairMat);
        cap.position.y = 1.556 * s; cap.scale.set(1.0, 0.94, 1.05); cap.rotation.x = rad(3);
        this.body.add(cap);
        // 后脑发量（不遮脸）
        const back = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 14, 12), hairMat);
        back.position.set(0, 1.55 * s, -0.048 * s); back.scale.set(0.95, 0.95, 0.62);
        this.body.add(back);
        // 鬓角：把"帽子"和脸连起来
        for (const sx of [-1, 1]) {
          const side = new THREE.Mesh(new THREE.BoxGeometry(0.028 * s, 0.13 * s, 0.05 * s), hairMat);
          side.position.set(sx * 0.112 * s, 1.545 * s, 0.012 * s);
          side.rotation.z = sx * rad(-4);
          this.body.add(side);
        }
        // 刘海：几缕碎发，代替原来那条"帽檐"一样的横杠
        if (style2 === 'bowl') {
          for (let k = -1; k <= 1; k++) {
            const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.046 * s, 0.024 * s, 0.02 * s), hairMat);
            tuft.position.set(k * 0.05 * s, 1.601 * s, 0.103 * s - Math.abs(k) * 0.004 * s);
            tuft.rotation.z = k * rad(16); tuft.rotation.x = rad(10);
            this.body.add(tuft);
          }
        } else {
          for (const sx of [-1, 1]) {
            const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.022 * s, 0.02 * s), hairMat);
            tuft.position.set(sx * 0.044 * s, 1.603 * s, 0.099 * s);
            tuft.rotation.z = sx * rad(-18); tuft.rotation.x = rad(9);
            this.body.add(tuft);
          }
        }
        if (style2 === 'bun') {
          const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 12, 10), hairMat);
          bun.position.set(0, 1.585 * s, -0.135 * s);
          this.body.add(bun);
        }
      }
      if (headscarf) {
        const scarfMat = MT.mat.scarf(r.pick([0x7d90a6, 0x8a7864, 0x74838a, 0x7c8b74]));
        // 头顶：一块松松的布包住头发，边缘停在额头以上，不再盖住眉眼
        const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 18, 12, 0, TAU, 0, Math.PI * 0.31), scarfMat);
        wrap.position.y = 1.548 * s; wrap.scale.set(1.05, 1.0, 1.08); wrap.rotation.x = rad(3);
        this.body.add(wrap);
        // 后脑的布量：贴着后脑勺，不盖住耳朵和脸
        const backWrap = new THREE.Mesh(new THREE.SphereGeometry(0.124 * s, 16, 12), scarfMat);
        backWrap.position.set(0, 1.548 * s, -0.058 * s);
        backWrap.scale.set(0.8, 0.96, 0.58);
        this.body.add(backWrap);
        // 两侧不再加布条，让耳朵和脸侧露出来，避免像一顶帽子
        // 额前的卷边：压在发际线上，露出一整张脸
        const edge = new THREE.Mesh(new THREE.TorusGeometry(0.117 * s, 0.01 * s, 6, 24), scarfMat);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 1.628 * s;
        edge.scale.set(1.03, 1.07, 1);
        this.body.add(edge);
        // 脑后的布结 + 一小片贴着头皮的布角（不要伸出"蜗牛角"）
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.026 * s, 10, 8), scarfMat);
        knot.position.set(0, 1.505 * s, -0.152 * s);
        knot.scale.set(1.2, 0.9, 0.85);
        this.body.add(knot);
        const knotTie = new THREE.Mesh(new THREE.BoxGeometry(0.016 * s, 0.07 * s, 0.014 * s), scarfMat);
        knotTie.position.set(0, 1.478 * s, -0.153 * s);
        knotTie.rotation.x = rad(-6);
        this.body.add(knotTie);
        const tailGeo = new THREE.BufferGeometry();
        tailGeo.setAttribute('position', new THREE.Float32BufferAttribute([
          -0.05 * s, 0.05 * s, 0, 0.05 * s, 0.05 * s, 0, 0, -0.06 * s, 0,
        ], 3));
        tailGeo.computeVertexNormals();
        const tail = new THREE.Mesh(tailGeo, scarfMat);
        tail.position.set(0, 1.498 * s, -0.142 * s);
        tail.rotation.x = rad(-5);
        this.body.add(tail);
      }

      // 手臂（两段胶囊 + 圆手）
      this.arms = [];
      for (const sx of [-1, 1]) {
        const arm = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * s, 0.18 * s, 4, 10), shirtMat);
        upper.position.y = -0.105 * s; upper.castShadow = true;
        arm.add(upper);
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04 * s, 0.16 * s, 4, 10), shortSleeve ? skinMat : shirtMat);
        forearm.position.y = -0.325 * s; forearm.castShadow = true;
        arm.add(forearm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.044 * s, 8, 6), skinMat);
        hand.position.y = -0.46 * s; hand.scale.set(1, 1.15, 0.72);
        arm.add(hand);
        arm.position.set(sx * 0.176 * s * shoulderW, 1.265 * s, 0);
        arm.rotation.z = sx * rad(4);
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

      // 装扮：草帽 / 头巾 / 毛巾 / 斜挎包
      const style = r.next();
      if (!headscarf && old && style < 0.45) {
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26 * s, 0.14 * s, 14), MT.mat.straw());
        hat.position.y = 1.63 * s; hat.castShadow = true;
        this.body.add(hat);
      } else if (!headscarf && !kid && style < 0.7) {
        const towelMat = new THREE.MeshStandardMaterial({ color: r.chance(0.5) ? 0xd8d4c8 : 0x9ab0c8, roughness: 0.95 });
        // 搭在肩上的毛巾（卷起的一条，不再是大板）
        const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.035 * s, 0.22 * s, 4, 8), towelMat);
        roll.rotation.z = Math.PI / 2; roll.rotation.y = rad(10);
        roll.position.set(0.1 * s, 1.33 * s, 0.02 * s);
        this.body.add(roll);
      } else if (!headscarf && this.role !== 'vendor' && r.chance(0.5)) {
        // 斜挎的小包：背带贴着胸口，从右肩斜到左胯
        const bagMat = new THREE.MeshStandardMaterial({ color: r.pick([0xb8342a, 0x3a6b9a, 0xd8b23c]), roughness: 0.95 });
        const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.16 * s, 0.075 * s), bagMat);
        satchel.position.set(-0.145 * s, 1.12 * s, 0.105 * s);
        satchel.rotation.y = rad(10);
        this.body.add(satchel);
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.155 * s, 0.06 * s, 0.08 * s), bagMat);
        flap.position.set(-0.145 * s, 1.19 * s, 0.107 * s);
        flap.rotation.y = rad(10);
        this.body.add(flap);
        // 肩带：一条贴着胸口的窄带，两端分别落在肩头和包口
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028 * s, 0.3 * s, 0.012 * s), bagMat);
        strap.position.set(-0.035 * s, 1.265 * s, 0.112 * s);
        strap.rotation.z = rad(-50); strap.rotation.x = rad(-4);
        this.body.add(strap);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.034 * s, 0.03 * s, 0.016 * s), MT.mat.metal(0xa8aeb4, 0.4));
        buckle.position.set(-0.1 * s, 1.185 * s, 0.12 * s); buckle.rotation.z = rad(-50);
        this.body.add(buckle);
      }
      // 摊主的围裙：深蓝粗布，贴着身子的一圈弧面（不再是一块悬空的平板）
      if (this.role === 'vendor') {
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x46525e, roughness: 1.0, side: THREE.DoubleSide });
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.175 * s, 0.205 * s, 0.42 * s, 16, 1, true, -0.98, 1.96), apronMat);
        skirt.position.set(0, 1.01 * s, 0.008 * s);
        skirt.scale.z = 0.8;
        skirt.castShadow = true;
        this.body.add(skirt);
        // 胸兜，顺着胸口微微后仰
        const bib = new THREE.Mesh(new THREE.BoxGeometry(0.155 * s, 0.155 * s, 0.016 * s), apronMat);
        bib.position.set(0, 1.245 * s, 0.118 * s); bib.rotation.x = rad(-18);
        this.body.add(bib);
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.115 * s, 0.08 * s, 0.013 * s), apronMat);
        pocket.position.set(0, 1.07 * s, 0.152 * s); pocket.rotation.x = rad(-4);
        this.body.add(pocket);
        // 腰带
        const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.178 * s, 0.178 * s, 0.035 * s, 16, 1, true, -1.15, 2.3), apronMat);
        waist.position.set(0, 1.222 * s, 0.006 * s);
        waist.scale.z = 0.8;
        this.body.add(waist);
        // 颈带：从胸兜上角绕到脖子后面
        for (const sx of [-1, 1]) {
          const tie = new THREE.Mesh(new THREE.BoxGeometry(0.018 * s, 0.11 * s, 0.012 * s), apronMat);
          tie.position.set(sx * 0.052 * s, 1.365 * s, 0.077 * s);
          tie.rotation.x = rad(-20); tie.rotation.z = sx * rad(8);
          this.body.add(tie);
        }
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
