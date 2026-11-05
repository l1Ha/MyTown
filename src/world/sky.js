/* =============================================================
 *  MyTown · 我的家乡 3D  —  天空 / 日月 / 星空 / 云 / 天气
 *  sky.js : 昼夜循环、四季太阳高度角、雨雪风雾
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { clamp, lerp, smoothstep, rad, TAU } = MT.util;

  // 复用的临时对象（避免每帧 new 造成 GC 压力）
  const _cA = new THREE.Color(), _cB = new THREE.Color(), _cC = new THREE.Color(), _cD = new THREE.Color();
  const _vTmp = new THREE.Vector3();

  /* 一天中的光照关键帧：h 时刻，各色值与强度 */
  const KEYS = [
    { h: 0.0, top: 0x03060f, mid: 0x071127, bot: 0x121c2e, sun: 0x5a76b8, sunI: 0.05, hemiS: 0x1d2a44, hemiG: 0x0b1118, hemiI: 0.22, amb: 0x16203a, ambI: 0.20, fog: 0x0e1726, expo: 0.52, cloud: 0x2a3550, star: 1.0, moon: 1.0 },
    { h: 4.4, top: 0x0a1327, mid: 0x1d2542, bot: 0x3b3550, sun: 0x8a6a9a, sunI: 0.10, hemiS: 0x2b3556, hemiG: 0x161a22, hemiI: 0.30, amb: 0x243052, ambI: 0.24, fog: 0x2a3048, expo: 0.58, cloud: 0x4a4258, star: 0.65, moon: 0.7 },
    { h: 5.6, top: 0x24406e, mid: 0x8f6a72, bot: 0xe1a276, sun: 0xffa860, sunI: 1.5, hemiS: 0x6c7ba8, hemiG: 0x4a3d30, hemiI: 0.55, amb: 0x53628e, ambI: 0.36, fog: 0xc79b7c, expo: 0.78, cloud: 0xd8a184, star: 0.08, moon: 0.25 },
    { h: 7.4, top: 0x3f76c2, mid: 0x9dc2e6, bot: 0xdce9f2, sun: 0xffe0b0, sunI: 2.6, hemiS: 0x9dc4ea, hemiG: 0x6d6450, hemiI: 0.85, amb: 0x7f9ccc, ambI: 0.42, fog: 0xd3e2ea, expo: 1.0, cloud: 0xf6f8fa, star: 0, moon: 0 },
    { h: 12.0, top: 0x2c6ac8, mid: 0x7cb2ea, bot: 0xd2e6f6, sun: 0xfff8e8, sunI: 3.5, hemiS: 0xa8cdf0, hemiG: 0x74705a, hemiI: 1.0, amb: 0x8fb0dc, ambI: 0.46, fog: 0xd8e8f2, expo: 1.08, cloud: 0xffffff, star: 0, moon: 0 },
    { h: 16.2, top: 0x3472c0, mid: 0x8fbce8, bot: 0xdce8f0, sun: 0xffeec8, sunI: 3.0, hemiS: 0xa2c4e8, hemiG: 0x726a52, hemiI: 0.92, amb: 0x88a6d2, ambI: 0.44, fog: 0xd6e3ee, expo: 1.04, cloud: 0xfbfcfd, star: 0, moon: 0 },
    { h: 18.2, top: 0x3a6ba8, mid: 0xd0a075, bot: 0xf0c187, sun: 0xffb672, sunI: 2.35, hemiS: 0xa8b0c0, hemiG: 0x6a5840, hemiI: 0.72, amb: 0x7c88aa, ambI: 0.40, fog: 0xe0bb92, expo: 0.98, cloud: 0xf7d9b0, star: 0, moon: 0 },
    { h: 19.3, top: 0x27406e, mid: 0xbd6a4c, bot: 0xe8894f, sun: 0xff7a3c, sunI: 1.35, hemiS: 0x7a7ea8, hemiG: 0x4a3a2e, hemiI: 0.52, amb: 0x5f5a86, ambI: 0.34, fog: 0xc6886a, expo: 0.84, cloud: 0xe09a6c, star: 0.02, moon: 0.1 },
    { h: 20.4, top: 0x141f3c, mid: 0x40364f, bot: 0x6d4550, sun: 0xa0524a, sunI: 0.42, hemiS: 0x38426a, hemiG: 0x1e1f28, hemiI: 0.34, amb: 0x323a62, ambI: 0.26, fog: 0x533f4c, expo: 0.7, cloud: 0x6a5570, star: 0.45, moon: 0.55 },
    { h: 22.0, top: 0x050a18, mid: 0x0b142e, bot: 0x161f30, sun: 0x5a76b8, sunI: 0.07, hemiS: 0x1f2c48, hemiG: 0x0d121a, hemiI: 0.24, amb: 0x18223c, ambI: 0.21, fog: 0x111a2a, expo: 0.55, cloud: 0x2e3956, star: 0.9, moon: 0.9 },
    { h: 24.0, top: 0x03060f, mid: 0x071127, bot: 0x121c2e, sun: 0x5a76b8, sunI: 0.05, hemiS: 0x1d2a44, hemiG: 0x0b1118, hemiI: 0.22, amb: 0x16203a, ambI: 0.20, fog: 0x0e1726, expo: 0.52, cloud: 0x2a3550, star: 1.0, moon: 1.0 },
  ];

  const SEASONS = {
    spring: { name: '春', maxEl: rad(58), dayHue: 0.0, fogTint: 0xe8f0d8, cloudBase: 0.42, tilt: 0 },
    summer: { name: '夏', maxEl: rad(78), dayHue: 0.0, fogTint: 0xdfeef0, cloudBase: 0.55, tilt: 0 },
    autumn: { name: '秋', maxEl: rad(58), dayHue: 0.0, fogTint: 0xf0e8d0, cloudBase: 0.38, tilt: 0 },
    winter: { name: '冬', maxEl: rad(38), dayHue: 0.0, fogTint: 0xe4eaf2, cloudBase: 0.5, tilt: 0 },
  };

  const WEATHERS = {
    clear: { name: '晴', cloud: 0.0, rain: 0, wind: 0.7, sunMul: 1.0, fogFar: 720, haze: 0.04 },
    fair: { name: '多云', cloud: 0.55, rain: 0, wind: 1.0, sunMul: 0.86, fogFar: 620, haze: 0.09 },
    overcast: { name: '阴', cloud: 1.0, rain: 0, wind: 1.1, sunMul: 0.45, fogFar: 460, haze: 0.18 },
    rain: { name: '小雨', cloud: 1.0, rain: 0.55, wind: 1.3, sunMul: 0.28, fogFar: 340, haze: 0.36 },
    storm: { name: '雷阵雨', cloud: 1.0, rain: 1.0, wind: 1.9, sunMul: 0.15, fogFar: 220, haze: 0.5 },
    snow: { name: '雪', cloud: 1.0, rain: 0, snow: 0.8, wind: 1.0, sunMul: 0.4, fogFar: 300, haze: 0.4 },
  };

  const SKY_VERT = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }`;

  const SKY_FRAG = `
    uniform vec3 topColor; uniform vec3 midColor; uniform vec3 botColor;
    uniform vec3 sunColor; uniform vec3 sunDir; uniform vec3 moonDir;
    uniform float sunGlow; uniform float hazeAmt;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float h = clamp(d.y * 1.05, -0.2, 1.0);
      vec3 col = mix(botColor, midColor, smoothstep(-0.02, 0.24, h));
      col = mix(col, topColor, smoothstep(0.18, 0.92, h));
      // 地平线霾
      float horizon = 1.0 - smoothstep(0.0, 0.35, abs(h));
      col = mix(col, mix(botColor, vec3(0.85, 0.85, 0.85), 0.35), horizon * hazeAmt * 0.6);
      // 太阳
      float sd = max(dot(d, normalize(sunDir)), 0.0);
      col += sunColor * pow(sd, 22.0) * sunGlow * 0.9;
      col += sunColor * pow(sd, 4.0) * sunGlow * 0.16;
      // 月亮
      float md = max(dot(d, normalize(moonDir)), 0.0);
      col += vec3(0.72, 0.78, 0.92) * pow(md, 420.0) * 1.4;
      col += vec3(0.6, 0.66, 0.85) * pow(md, 12.0) * 0.05;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`;

  /* ============================ 天空系统 ============================ */
  class Sky {
    constructor(scene, opts = {}) {
      this.scene = scene;
      this.renderer = opts.renderer || null;
      this.quality = opts.quality || 'high';
      this.season = opts.season || 'summer';
      this.weather = 'fair';
      this.hour = opts.hour === undefined ? 8.0 : opts.hour;
      this.daySpeed = opts.daySpeed === undefined ? 0.02 : opts.daySpeed; // 游戏小时 / 真实秒
      this.elapsedDays = 0;
      this.paused = false;

      this.month = 6; this.day = 21; // 近似日期（随季节设定）
      this._applySeasonDate();

      // 光照
      this.sun = new THREE.DirectionalLight(0xfff5e0, 3.0);
      this.sun.position.set(50, 80, 40);
      this.sun.castShadow = true;
      const sh = this.sun.shadow;
      sh.mapSize.set(this.quality === 'low' ? 1024 : 2048, this.quality === 'low' ? 1024 : 2048);
      const S = 118;   // 阴影相机跟随玩家，范围可以小一些，影子更清晰
      sh.camera.left = -S; sh.camera.right = S; sh.camera.top = S; sh.camera.bottom = -S;
      sh.camera.near = 1; sh.camera.far = 420;
      sh.bias = -0.0006;
      sh.normalBias = 0.05;
      scene.add(this.sun);
      this.sunTarget = new THREE.Object3D();
      scene.add(this.sunTarget);
      this.sun.target = this.sunTarget;

      this.moon = new THREE.DirectionalLight(0x8fa8d8, 0.25);
      this.moon.position.set(-50, 60, -40);
      scene.add(this.moon);

      this.hemi = new THREE.HemisphereLight(0xa8cdf0, 0x74705a, 1.0);
      scene.add(this.hemi);

      this.ambient = new THREE.AmbientLight(0x8fb0dc, 0.45);
      scene.add(this.ambient);

      // 天空穹顶
      const skyGeo = new THREE.SphereGeometry(1800, 40, 24);
      this.skyMat = new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: new THREE.Color(0x2c6ac8) },
          midColor: { value: new THREE.Color(0x7cb2ea) },
          botColor: { value: new THREE.Color(0xd2e6f6) },
          sunColor: { value: new THREE.Color(0xfff8e8) },
          sunDir: { value: new THREE.Vector3(0, 1, 0) },
          moonDir: { value: new THREE.Vector3(0, -1, 0) },
          sunGlow: { value: 1.0 },
          hazeAmt: { value: 0.2 },
        },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: true,
      });
      this.dome = new THREE.Mesh(skyGeo, this.skyMat);
      this.dome.frustumCulled = false;
      this.dome.renderOrder = -1000;
      this.dome.userData.noCollide = true;
      scene.add(this.dome);

      // 星空
      this.stars = this._makeStars();
      scene.add(this.stars);

      // 云
      this.clouds = this._makeClouds();
      scene.add(this.clouds);

      // 飞鸟
      this.flock = new BirdFlock(scene, opts.rng);

      // 降水
      this.rain = new Precipitation('rain', opts.rng);
      scene.add(this.rain.points);
      this.snow = new Precipitation('snow', opts.rng);
      scene.add(this.snow.points);

      // 雾
      this.fog = new THREE.Fog(0xd8e8f2, 40, 620);
      scene.fog = this.fog;

      // 状态
      this.env = { dayFactor: 1, nightFactor: 0, sunI: 3, windStrength: 1, fogColor: new THREE.Color(), rain: 0 };
      this._blend = { cloud: 0.55, rain: 0, wind: 1, sunMul: 1, fogFar: 520, haze: 0.15, snow: 0, overcast: 0 };
      this._envMapTimer = 0;
      this.pmrem = null;

      this.sunDir = new THREE.Vector3(0, 1, 0);
      this.moonDir = new THREE.Vector3(0, -1, 0);
      this.update(0, { x: 0, y: 0, z: 0 });
      this.setWeather(this.weather, true);
    }

    _applySeasonDate() {
      const d = { spring: [4, 5], summer: [6, 21], autumn: [9, 23], winter: [12, 22] }[this.season] || [6, 21];
      this.month = d[0]; this.day = d[1];
    }

    _makeStars() {
      const N = 1400;
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const rng = new MT.RNG(99);
      const c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const u = rng.next(), v = rng.next();
        const theta = u * TAU;
        const phi = Math.acos(1 - v * 0.95);
        const r = 1600;
        const y = Math.cos(phi);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * y;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        const t = rng.next();
        c.setHSL(0.58 + rng.range(-0.07, 0.07), 0.25 + rng.range(0, 0.4), 0.72 + t * 0.25);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({
        size: 7, map: MT.tex.dot(), transparent: true, opacity: 0.9,
        depthWrite: false, vertexColors: true, sizeAttenuation: true, fog: false, blending: THREE.AdditiveBlending,
      });
      const p = new THREE.Points(g, m);
      p.frustumCulled = false;
      p.renderOrder = -900;
      p.userData.noCollide = true;
      return p;
    }

    _makeClouds() {
      const group = new THREE.Group();
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: MT.tex.cloud(), transparent: true, depthWrite: false, opacity: 0.9,
        side: THREE.DoubleSide, fog: false,
      });
      this.cloudMat = mat;
      const rng = new MT.RNG(1234);
      const N = this.quality === 'low' ? 22 : 46;
      const mesh = new THREE.InstancedMesh(geo, mat, N);
      mesh.frustumCulled = false;
      mesh.renderOrder = -500;
      mesh.userData.noCollide = true;
      this._cloudData = [];
      const dummy = new THREE.Object3D();
      const c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const a = rng.next() * TAU;
        const rad0 = rng.range(180, 1500);
        const d = {
          x: Math.cos(a) * rad0, z: Math.sin(a) * rad0,
          y: rng.range(150, 300),
          w: rng.range(220, 560), h: rng.range(120, 320),
          rot: rng.next() * TAU,
          speed: rng.range(0.6, 2.4),
          alpha: rng.range(0.5, 1.0),
        };
        this._cloudData.push(d);
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(-Math.PI / 2, 0, d.rot);
        dummy.scale.set(d.w, d.h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, c.setRGB(1, 1, 1));
      }
      this.cloudMesh = mesh;
      this.cloudInstDummy = dummy;
      group.add(mesh);
      return group;
    }

    setSeason(s) {
      if (!SEASONS[s]) return;
      this.season = s;
      this._applySeasonDate();
      if (s === 'winter') {
        if (this.weather === 'rain') this.setWeather('snow', true);
      } else if (this.weather === 'snow') {
        this.setWeather('fair', true);
      }
    }
    setWeather(w, instant) {
      if (!WEATHERS[w]) return;
      if (w === 'snow' && this.season !== 'winter') w = 'fair';
      this.weather = w;
      this._weatherTarget = WEATHERS[w];
      if (instant) {
        const t = this._weatherTarget;
        this._blend.cloud = t.cloud; this._blend.rain = t.rain || 0;
        this._blend.snow = t.snow || 0; this._blend.wind = t.wind;
        this._blend.sunMul = t.sunMul; this._blend.fogFar = t.fogFar; this._blend.haze = t.haze;
        this._blend.overcast = t.cloud;
      }
      return this._weatherTarget;
    }
    get weatherName() { return (WEATHERS[this.weather] || {}).name || '晴'; }
    get seasonName() { return (SEASONS[this.season] || {}).name || '夏'; }

    /** 太阳高度角/方位 */
    computeSunDir(hour, out) {
      const cfg = SEASONS[this.season] || SEASONS.summer;
      const t = (hour - 6) / 12;
      const el = cfg.maxEl * Math.sin(Math.PI * t);
      const th = Math.PI * t;
      const ce = Math.cos(el);
      return (out || _vTmp).set(ce * Math.cos(th), Math.sin(el), ce * Math.sin(th)).normalize();
    }

    _sampleKeys(hour) {
      let a = KEYS[0], b = KEYS[KEYS.length - 1];
      for (let i = 0; i < KEYS.length - 1; i++) {
        if (hour >= KEYS[i].h && hour <= KEYS[i + 1].h) { a = KEYS[i]; b = KEYS[i + 1]; break; }
      }
      const t = clamp((hour - a.h) / ((b.h - a.h) || 1), 0, 1);
      const st = smoothstep(0, 1, t);
      const K = this._K || (this._K = {
        top: new THREE.Color(), mid: new THREE.Color(), bot: new THREE.Color(),
        sun: new THREE.Color(), hemiS: new THREE.Color(), hemiG: new THREE.Color(),
        amb: new THREE.Color(), fog: new THREE.Color(), cloud: new THREE.Color(),
      });
      const mixC = (dst, k) => dst.set(a[k]).lerp(_cA.set(b[k]), st);
      const mixN = (k) => lerp(a[k], b[k], st);
      mixC(K.top, 'top'); mixC(K.mid, 'mid'); mixC(K.bot, 'bot');
      mixC(K.sun, 'sun'); mixC(K.hemiS, 'hemiS'); mixC(K.hemiG, 'hemiG');
      mixC(K.amb, 'amb'); mixC(K.fog, 'fog'); mixC(K.cloud, 'cloud');
      K.sunI = mixN('sunI'); K.hemiI = mixN('hemiI'); K.ambI = mixN('ambI');
      K.expo = mixN('expo'); K.star = mixN('star'); K.moon = mixN('moon');
      return K;
    }

    /** 主更新 */
    update(dt, camPos, camera) {
      // 推进时间
      if (!this.paused && this.daySpeed > 0) {
        this.hour += this.daySpeed * dt;
        while (this.hour >= 24) { this.hour -= 24; this.elapsedDays++; this._advanceDay(); }
      }
      const hour = this.hour;

      // 天气过渡
      const T = this._weatherTarget || WEATHERS[this.weather];
      const k = 1 - Math.exp(-dt * 0.25);
      const B = this._blend;
      B.cloud = lerp(B.cloud, T.cloud, k);
      B.rain = lerp(B.rain, T.rain || 0, k);
      B.snow = lerp(B.snow, T.snow || 0, k);
      B.wind = lerp(B.wind, T.wind, k);
      B.sunMul = lerp(B.sunMul, T.sunMul, k);
      B.fogFar = lerp(B.fogFar, T.fogFar, k);
      B.haze = lerp(B.haze, T.haze, k);
      B.overcast = lerp(B.overcast, T.cloud, k);

      const K = this._sampleKeys(hour);
      const sunMul = B.sunMul;
      const cloudDim = 1 - B.overcast * 0.45;

      // 太阳方向
      this.computeSunDir(hour, this.sunDir);
      const t = (hour - 6) / 12;
      const mEl = -SEASONS[this.season].maxEl * Math.sin(Math.PI * t) * 0.85 + rad(6);
      const mTh = Math.PI * t + Math.PI;
      const mce = Math.cos(mEl);
      this.moonDir.set(mce * Math.cos(mTh), Math.sin(mEl), mce * Math.sin(mTh)).normalize();

      // 天空颜色
      const hs = SEASONS[this.season] || SEASONS.summer;
      const dayMix = clamp(smoothstep(-0.06, 0.3, this.sunDir.y), 0, 1);
      const bot = _cB.copy(K.bot).lerp(_cA.set(hs.fogTint), 0.25 * dayMix);
      const cloudTint = _cC.copy(K.cloud);
      this.skyMat.uniforms.topColor.value.copy(K.top);
      this.skyMat.uniforms.midColor.value.copy(K.mid);
      this.skyMat.uniforms.botColor.value.copy(bot);
      this.skyMat.uniforms.sunColor.value.copy(K.sun);
      this.skyMat.uniforms.sunDir.value.copy(this.sunDir);
      this.skyMat.uniforms.moonDir.value.copy(this.moonDir);
      this.skyMat.uniforms.sunGlow.value = clamp(K.sunI * 0.5 * sunMul, 0, 3) ;
      this.skyMat.uniforms.hazeAmt.value = B.haze;

      // 灯光（阴影相机跟随玩家，保证走到哪里都有影子）
      this.sun.color.copy(K.sun);
      this.sun.intensity = K.sunI * sunMul * cloudDim;
      if (camPos) {
        // 吸附到 4 米网格，避免阴影边缘抖动
        const sx = Math.round(camPos.x / 4) * 4, sz = Math.round(camPos.z / 4) * 4;
        this.sunTarget.position.set(sx, 0, sz);
        this.sun.position.set(
          sx + this.sunDir.x * 200,
          this.sunDir.y * 200,
          sz + this.sunDir.z * 200
        );
      } else {
        this.sun.position.copy(this.sunDir).multiplyScalar(200);
      }
      this.moon.intensity = K.moon * 0.35 * (1 - B.overcast * 0.5);
      this.moon.color.setHex(0x9fb6e0);
      this.moon.position.copy(this.moonDir).multiplyScalar(180);
      this.hemi.color.copy(K.hemiS); this.hemi.groundColor.copy(K.hemiG);
      this.hemi.intensity = K.hemiI * lerp(1, 0.8, B.overcast);
      this.ambient.color.copy(K.amb);
      this.ambient.intensity = K.ambI * lerp(1, 1.15, B.overcast);

      // 雾
      const fogC = _cD.copy(K.fog).lerp(bot, 0.35);
      fogC.multiplyScalar(lerp(1, 0.82, B.overcast));
      this.fog.color.copy(fogC);
      this.fog.near = lerp(70, 12, B.haze);
      this.fog.far = B.fogFar * lerp(1, 0.75, B.rain * 0.8 + B.snow * 0.5);

      // 星星 / 月亮亮度
      const nightF = clamp(1 - smoothstep(-0.12, 0.18, this.sunDir.y), 0, 1);
      this.stars.material.opacity = K.star * nightF * (1 - B.overcast * 0.85);
      this.stars.visible = this.stars.material.opacity > 0.02;
      if (camPos) { this.stars.position.set(camPos.x, 0, camPos.z); }
      this.dome.position.set(camPos ? camPos.x : 0, camPos ? camPos.y : 0, camPos ? camPos.z : 0);

      // 云
      this.cloudMat.opacity = 0.18 + B.overcast * 0.62;
      this.cloudMat.color.copy(cloudTint);
      this._updateClouds(dt, camPos, B.wind);

      // 降水
      const rainAmt = B.rain;
      const snowAmt = B.snow;
      this.rain.setAmount(rainAmt); this.snow.setAmount(snowAmt);
      if (rainAmt > 0.01) this.rain.update(dt, camPos, 1 + B.wind * 0.6);
      if (snowAmt > 0.01) this.snow.update(dt, camPos, 1 + B.wind * 0.3);

      // 飞鸟（晴天白天）
      this.flock.update(dt, camPos, nightF, B.cloud, this.sunDir);

      // 环境贴图（高画质时才做，且不必每帧）
      if (this.renderer && (this.quality === 'high' || this.quality === 'ultra') && camera) {
        this._envMapTimer -= dt;
        if (this._envMapTimer <= 0) {
          this._envMapTimer = 8.0;
          this._renderEnvMap();
        }
      }

      // 曝光
      this.exposure = K.expo * (1 - B.overcast * 0.18);

      // 环境数据（供音频等使用）
      this.env.dayFactor = dayMix;
      this.env.nightFactor = nightF;
      this.env.sunI = this.sun.intensity;
      this.env.windStrength = B.wind;
      this.env.rain = rainAmt;
      this.env.fogColor.copy(this.fog.color);
      this.env.haze = B.haze;
      return this.env;
    }

    _advanceDay() {
      const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      this.day++;
      if (this.day > dim[this.month - 1]) { this.day = 1; this.month = this.month % 12 + 1; }
    }

    _updateClouds(dt, camPos, wind) {
      const mesh = this.cloudMesh, d3 = this.cloudInstDummy;
      const data = this._cloudData;
      const c = this._cloudColor || (this._cloudColor = new THREE.Color());
      const tint = this.cloudMat.color;
      const followX = camPos ? Math.floor(camPos.x / 900) * 900 : 0;
      const followZ = camPos ? Math.floor(camPos.z / 900) * 900 : 0;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d.x += d.speed * wind * dt * 1.6;
        if (d.x > 1700) d.x -= 3400;
        d3.position.set(d.x + followX, d.y, d.z + followZ);
        d3.rotation.set(-Math.PI / 2, 0, d.rot + d.speed * 0.02);
        d3.scale.set(d.w, d.h, 1);
        d3.updateMatrix();
        mesh.setMatrixAt(i, d3.matrix);
        const sh = 1 - this._blend.overcast * 0.25;
        c.copy(tint).multiplyScalar(d.alpha * sh);
        mesh.setColorAt(i, c);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    _renderEnvMap() {
      try {
        if (!this._pmrem) {
          const PMREM = THREE.PMREMGenerator;
          if (!PMREM) return;
          this._pmrem = new PMREM(this.renderer);
          this._pmrem.compileEquirectangularShader();
        }
        if (!this._envScene) {
          this._envScene = new THREE.Scene();
          const m = new THREE.Mesh(this.dome.geometry, this.skyMat.clone());
          m.material.uniforms = this.skyMat.uniforms; // 共享 uniforms
          m.frustumCulled = false;
          this._envScene.add(m);
        }
        const rt = this._pmrem.fromScene(this._envScene, 0.04, 1, 4000);
        if (this._envRT) this._envRT.dispose();
        this._envRT = rt;
        this.scene.environment = rt.texture;
        this.scene.environmentIntensity = 0.85;
      } catch (e) { /* 环境贴图失败不影响游戏 */ }
    }

    /** 供 UI 显示的日期/节气 */
    dateInfo() {
      return {
        month: this.month, day: this.day,
        season: this.seasonName,
        term: MT.util.solarTerm(this.month, this.day),
        weather: this.weatherName,
        hour: this.hour,
      };
    }
  }

  /* ============================ 降水粒子 ============================ */
  class Precipitation {
    constructor(kind, rng) {
      this.kind = kind;
      this.rng = rng || new MT.RNG(kind === 'rain' ? 11 : 12);
      const N = kind === 'rain' ? 5200 : 3200;
      this.N = N;
      const span = kind === 'rain' ? 46 : 40;
      this.span = span;
      this.height = kind === 'rain' ? 26 : 22;
      const g = new THREE.BufferGeometry();
      this.pos = new Float32Array(N * 3);
      this.vel = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        this.pos[i * 3] = this.rng.range(-span, span);
        this.pos[i * 3 + 1] = this.rng.range(0, this.height);
        this.pos[i * 3 + 2] = this.rng.range(-span, span);
        this.vel[i] = kind === 'rain' ? this.rng.range(18, 30) : this.rng.range(1.1, 2.6);
      }
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      const mat = new THREE.PointsMaterial({
        size: kind === 'rain' ? 0.32 : 0.22,
        map: MT.tex.dot(),
        transparent: true, opacity: kind === 'rain' ? 0.42 : 0.85,
        depthWrite: false, color: kind === 'rain' ? 0xaecbe0 : 0xffffff,
        sizeAttenuation: true, fog: true, blending: kind === 'rain' ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      if (kind === 'rain') mat.alphaMap = null;
      this.points = new THREE.Points(g, mat);
      this.points.frustumCulled = false;
      this.points.visible = false;
      this.amount = 0;
      this.count = 0;
    }
    setAmount(a) {
      this.amount = a;
      const c = Math.floor(this.N * clamp(a, 0, 1));
      this.count = c;
      this.points.visible = c > 4;
      this.points.geometry.setDrawRange(0, c);
      this.points.material.opacity = this.kind === 'rain' ? 0.2 + 0.35 * a : 0.5 + 0.45 * a;
    }
    update(dt, camPos, wind) {
      if (!this.points.visible) { return; }
      const p = this.pos, n = this.count, H = this.height;
      const cx = camPos ? camPos.x : 0, cy = camPos ? camPos.y : 0, cz = camPos ? camPos.z : 0;
      const drift = this.kind === 'rain' ? wind * 3.2 : wind * 0.9;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        p[i3 + 1] -= this.vel[i] * dt;
        p[i3] += drift * dt;
        if (this.kind === 'snow') p[i3 + 2] += Math.sin((p[i3] + p[i3 + 1]) * 0.3) * dt * 0.6;
        if (p[i3 + 1] < 0) {
          p[i3 + 1] = H;
          p[i3] = this.rng.range(-this.span, this.span);
          p[i3 + 2] = this.rng.range(-this.span, this.span);
        }
        if (p[i3] > this.span) p[i3] -= this.span * 2;
        if (p[i3 + 2] > this.span) p[i3 + 2] -= this.span * 2;
        if (p[i3 + 2] < -this.span) p[i3 + 2] += this.span * 2;
      }
      this.points.position.set(cx, cy, cz);
      this.points.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ============================ 飞鸟群 ============================ */
  class BirdFlock {
    constructor(scene, rng) {
      this.rng = rng || new MT.RNG(555);
      this.group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x2b2b30, side: THREE.DoubleSide, fog: true });
      this.mat = mat;
      const N = 11;
      this.birds = [];
      const geo = new THREE.BufferGeometry();
      // 简易 V 形翅膀（两个三角形）
      const v = new Float32Array([
        0, 0, 0, -0.9, 0.28, -0.35, -0.9, 0.28, 0.35,
        0, 0, 0, -0.9, 0.28, 0.35, -1.7, 0.05, 0.0,
        0, 0, 0, 0.9, 0.28, 0.35, 0.9, 0.28, -0.35,
        0, 0, 0, 1.7, 0.05, 0.0, 0.9, 0.28, -0.35,
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
      geo.computeVertexNormals();
      for (let i = 0; i < N; i++) {
        const m = new THREE.Mesh(geo, mat);
        m.scale.setScalar(this.rng.range(0.5, 0.95));
        this.group.add(m);
        this.birds.push({
          m, phase: this.rng.next() * TAU,
          r: this.rng.range(60, 160), a: this.rng.next() * TAU, y: this.rng.range(28, 60),
          speed: this.rng.range(0.05, 0.12) * this.rng.sign(),
          cx: this.rng.range(-200, 200), cz: this.rng.range(-200, 200),
        });
      }
      this.group.visible = false;
      scene.add(this.group);
    }
    update(dt, camPos, nightF, cloud, sunDir) {
      const t = performance.now() * 0.001;
      const visible = nightF < 0.5 && cloud < 0.8;
      this.group.visible = visible;
      if (!visible) return;
      const cx = camPos ? camPos.x : 0, cz = camPos ? camPos.z : 0;
      for (const b of this.birds) {
        b.a += b.speed * dt;
        const x = b.cx + Math.cos(b.a) * b.r;
        const z = b.cz + Math.sin(b.a) * b.r;
        b.m.position.set(x, b.y + Math.sin(t * 0.5 + b.phase) * 2.5, z);
        b.m.rotation.y = -b.a + (b.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
        b.m.rotation.z = Math.sin(t * 7 + b.phase) * 0.45;
      }
      this.mat.color.setHex(nightF > 0.3 ? 0x3a3a44 : 0x2b2b30);
    }
  }

  MT.Sky = Sky;
  MT.WEATHERS = WEATHERS;
  MT.SEASONS = SEASONS;
})();
