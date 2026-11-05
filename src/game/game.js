/* =============================================================
 *  MyTown · 我的家乡 3D  —  游戏主程序
 *  game.js : 场景装配、交互系统、任务、存档、设置、主循环
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { clamp, lerp, damp, rad, fmtClock12 } = MT.util;
  const HUD = MT.HUD;

  const PHOTO_FILTERS = {
    none: 'none',
    film: 'sepia(0.35) contrast(1.1) saturate(0.9) brightness(1.05)',
    bw: 'grayscale(1) contrast(1.18) brightness(1.03)',
    warm: 'saturate(1.22) sepia(0.14) brightness(1.06)',
    cool: 'saturate(0.95) hue-rotate(-12deg) brightness(1.03)',
    sepia: 'sepia(0.82) contrast(1.06) brightness(1.02)',
  };

  class Game {
    constructor(opts = {}) {
      this.canvas = opts.canvas || document.getElementById('scene');
      this.quality = (HUD.settings && HUD.settings.quality) || 'high';
      this.clock = new THREE.Clock();
      this.t = 0;
      this.frame = 0;
      this.paused = true;
      this.started = false;
      this.fpsSmooth = 60;
      this.hudTimer = 0;
      this.state = {
        discovered: {},         // poiId -> true
        unlocked: {},           // cultureId -> true
        taken: {},              // collectibleId -> true
        talkCount: 0,
        talkedSet: {},
        harvestCount: 0,
        flags: {},
        questDone: {},
        seasonSeen: {},
        rides: 0,
      };
      this.interaction = { target: null, type: null, dist: 0 };
      this.harvesting = null;
      this.ride = null;
      this._raycaster = new THREE.Raycaster();
      this._tmp = new THREE.Vector3();
      this._fwd = new THREE.Vector3();
      this._stats = { pois: 0, items: 0, npcs: 0 };
    }

    /* =========================================================
     *  初始化
     * ========================================================= */
    async init(onProgress) {
      const report = (p, t) => { if (onProgress) onProgress(p, t); };
      const frame = () => new Promise((res) => {
        if (MT.NO_YIELD) { res(); return; }
        if (typeof document !== 'undefined' && document.hidden) setTimeout(res, 0);
        else if (window.requestAnimationFrame) window.requestAnimationFrame(() => res());
        else setTimeout(res, 0);
      });
      const step = async (p, t, idx) => {
        report(p, t);
        if (idx) await frame();
      };

      await step(0.02, '初始化渲染器…', 0);
      this._initRenderer();

      await step(0.08, '生成贴图（砖墙、青瓦、麦浪…）', 0);
      await MT.texture.preload((p, key) => report(0.08 + p * 0.3, '绘制贴图：' + key));

      await step(0.4, '开凿淮河与淮河大堤…', 1);
      this._initScene();
      this.terrain = new MT.Terrain({ rng: new MT.RNG(20240715), quality: this.quality });
      this.scene.add(this.terrain.group);
      this.player.terrain = this.terrain;
      this.player.spawnAt(14, 26, Math.PI * 0.92);

      await step(0.54, '盖房子（任庄村 · 任洼队）…', 1);
      this.village = new MT.Village(this.scene, this.terrain, {
        rng: new MT.RNG(4242), season: this.sky.season,
      });

      await step(0.66, '铺开麦田与秧田…', 1);
      this.farm = new MT.Farm(this.scene, this.terrain, {
        rng: new MT.RNG(88501), season: this.sky.season, quality: this.quality,
      });

      await step(0.78, '种树、插柳、长庄稼…', 1);
      this.vegetation = new MT.Vegetation(this.scene, this.terrain, {
        rng: new MT.RNG(31337), season: this.sky.season, quality: this.quality,
      });
      this.village.decorate(this.vegetation);

      await step(0.86, '请乡亲们出场…', 1);
      this.npcs = new MT.NPCSystem(this.scene, this.terrain, this.village, { rng: new MT.RNG(90210) });

      await step(0.91, '整理碰撞、合并网格、绘制地图…', 1);
      this._finalizeWorld();

      await step(0.96, '准备界面…', 1);
      this._initHUD();

      report(1.0, '完成');
      return this;
    }

    _initRenderer() {
      const gl = this.canvas.getContext('webgl2', { antialias: this.quality !== 'low' }) ||
        this.canvas.getContext('webgl');
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        context: gl,
        antialias: this.quality !== 'low',
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false,
      });
      const maxDpr = this.quality === 'low' ? 1 : this.quality === 'medium' ? 1.25 : this.quality === 'ultra' ? 2 : 1.6;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = this.quality !== 'low';
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      if ('outputColorSpace' in this.renderer) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.maxAniso = this.renderer.capabilities.getMaxAnisotropy ? this.renderer.capabilities.getMaxAnisotropy() : 4;
    }

    _initScene() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(HUD.settings.fov || 68, window.innerWidth / window.innerHeight, 0.1, 2600);
      this.camera.position.set(14, 8, 26);

      this.sky = new MT.Sky(this.scene, {
        renderer: this.renderer,
        quality: this.quality,
        season: HUD.settings.season || 'summer',
        weather: HUD.settings.weather || 'fair',
        hour: HUD.settings.hour === undefined ? 8 : HUD.settings.hour,
        daySpeed: HUD.settings.dayspeed === undefined ? 0.02 : HUD.settings.dayspeed,
        rng: new MT.RNG(777),
      });

      this.player = new MT.Player(this.camera, null, { fov: HUD.settings.fov || 68 });
      this.player.position.set(14, 8, 26);
      this.player.yaw = Math.PI * 0.92;
    }

    _finalizeWorld() {
      // 自动碰撞体（排除地形/道路/植被/小物件）
      const n = MT.Build.buildColliders(this.scene, {
        minHeight: 0.95, maxFloor: 2.25, minArea: 0.4,
        groundAt: (x, z) => this.terrain.heightAt(x, z),
      });
      // 把村庄里可行走的门洞打开：删除挡住门的碰撞盒
      this.colliderCount = n;
      // 玩家碰撞需要地形
      this.player.terrain = this.terrain;
      // 出生点：村道旁
      this.spawn = new THREE.Vector3(14, 0, 26);
      // 渡口数据
      this.docks = this.village.docks || [];
      this.landingNorth = this.village.landingNorth;
      this.landingSouth = this.village.landingSouth;
      // 静态几何批处理（把同材质的小网格合并，降低 draw call）
      this.batchStats = MT.Batch ? MT.Batch.merge(this.scene) : null;
      if (this.batchStats) {
        console.log('[MyTown] 静态网格合并：', this.batchStats);
      }
    }

    _initHUD() {
      HUD.init({ game: this });
      HUD.setLocation('任庄村', '河南省信阳市淮滨县固城乡 · 任洼队');
      HUD.initMinimap(this.terrain);
      HUD.pois = this.village.pois;
      HUD.collectibles = this.village.collectibles;
      HUD.player = this.player;
      this._buildHUDQuests();
      this._bindUI();
      this.state.seasonSeen[this.sky.season] = true;
      // 帮助提示
      HUD.hint('用 <b>W A S D</b> 走路，鼠标转视角，<b>E</b> 看东西。<br>村口的大槐树就在前面。', 7000);
    }

    /* =========================================================
     *  UI 绑定
     * ========================================================= */
    _bindUI() {
      // 接入输入系统（键盘/鼠标/指针锁定的监听器都在这里注册）
      MT.Input.init(this.canvas);
      const el = HUD.el;
      const self = this;
      const on = (id, ev, fn) => { const e = el[id]; if (e) e.addEventListener(ev, fn); };

      on('start-btn', 'click', () => self.start());
      on('pause-resume', 'click', () => self.setPaused(false));
      on('pause-codex', 'click', () => { self.setPaused(false); HUD.openCodex(); });
      on('pause-map', 'click', () => { self.setPaused(false); HUD.toggleMap(true); });
      on('pause-photo', 'click', () => { self.setPaused(false); self.setPhoto(true); });
      on('pause-save', 'click', () => { self.save(); HUD.toast('已保存进度', 'unlock'); });
      on('pause-load', 'click', () => { if (self.load()) { self.setPaused(false); HUD.toast('已读取进度', 'unlock'); } else HUD.toast('没有找到存档', 'warn'); });
      on('pause-restart', 'click', () => { self.respawn(); self.setPaused(false); });
      on('codex-close', 'click', () => HUD.closeCodex());
      on('map-close', 'click', () => HUD.toggleMap(false));
      on('help-close', 'click', () => { const h = el['help']; if (h) { h.classList.add('hidden'); h.classList.remove('show'); } });
      on('photo-exit', 'click', () => self.setPhoto(false));
      on('photo-shot', 'click', () => self.takePhoto());
      on('photo-hud', 'click', () => HUD.toggleHUD());
      on('photo-filter', 'change', (e) => { HUD.settings.photofilter = e.target.value; self.applyPhotoFilter(); });
      on('photo-fov', 'input', (e) => { self.camera.fov = parseFloat(e.target.value); self.camera.updateProjectionMatrix(); });

      // 设置项
      const s = HUD.settings;
      on('set-quality', 'change', (e) => { s.quality = e.target.value; HUD.saveSettings(); HUD.toast('画质已保存，重新载入页面后生效', 'warn'); });
      on('set-fov', 'input', (e) => { s.fov = parseFloat(e.target.value); self.player.baseFov = s.fov; if (!self.player.zooming) self.camera.fov = s.fov; self.camera.updateProjectionMatrix(); const v = el['set-fov-v']; if (v) v.textContent = s.fov + '°'; HUD.saveSettings(); });
      on('set-sens', 'input', (e) => { s.sensitivity = parseFloat(e.target.value); MT.Input.sensitivity = s.sensitivity; HUD.saveSettings(); });
      on('set-vol', 'input', (e) => { s.volume = parseFloat(e.target.value); MT.Audio.setVolume('master', s.volume); HUD.saveSettings(); });
      on('set-music', 'input', (e) => { s.music = parseFloat(e.target.value); MT.Audio.setVolume('music', s.music); HUD.saveSettings(); });
      on('set-season', 'change', (e) => { s.season = e.target.value; self.setSeason(s.season); HUD.saveSettings(); });
      on('set-weather', 'change', (e) => { s.weather = e.target.value; self.sky.setWeather(s.weather); HUD.saveSettings(); });
      on('set-hour', 'input', (e) => { s.hour = parseFloat(e.target.value); self.sky.hour = s.hour; const v = el['set-hour-v']; if (v) v.textContent = fmtClock12(s.hour); HUD.saveSettings(); });
      on('set-dayspeed', 'input', (e) => { s.dayspeed = parseFloat(e.target.value); self.sky.daySpeed = s.dayspeed; HUD.saveSettings(); });

      // 快捷按钮
      document.querySelectorAll('#quick-bar .qbtn').forEach((b) => {
        b.addEventListener('click', () => {
          const act = b.dataset.act;
          if (act === 'map') HUD.toggleMap();
          else if (act === 'codex') HUD.openCodex();
          else if (act === 'photo') self.setPhoto(true);
          else if (act === 'fly') self.toggleFly();
          else if (act === 'help') { const h = el['help']; if (h) { const open = h.classList.contains('hidden'); h.classList.toggle('hidden', !open); h.classList.toggle('show', open); } }
        });
      });

      // 输入事件
      const I = MT.Input;
      I.on('escape', () => {
        if (HUD.isDialogueOpen()) { HUD.closeDialogue(); self.endTalk(); return; }
        if (HUD.codexOpen) { HUD.closeCodex(); return; }
        if (HUD.mapOpen) { HUD.toggleMap(false); return; }
        const h = el['help']; if (h && !h.classList.contains('hidden')) { h.classList.add('hidden'); h.classList.remove('show'); return; }
        if (HUD.photoOpen) { self.setPhoto(false); return; }
        if (self.started) self.setPaused(!self.paused);
      });
      I.on('unlock', () => { if (self.started && !HUD.isDialogueOpen() && !HUD.photoOpen) self.setPaused(true); });
      I.on('lockerror', () => HUD.toast('鼠标锁定被浏览器拒绝，点击画面重试', 'warn'));
      I.on('primary', () => {
        if (self.paused) { self.setPaused(false); return; }
        if (HUD.photoOpen) return;
        if (HUD.isDialogueOpen()) { self.advanceDialogue(); return; }
        self.tryInteract();
      });
      I.on('secondary', () => { /* 右键：预留 */ });

      this.canvas.addEventListener('click', () => {
        if (!self.started) return;
        if (self.paused && !HUD.isDialogueOpen()) return;
        MT.Input.lock();
      });
      window.addEventListener('resize', () => self.onResize());
      window.addEventListener('beforeunload', () => self.save(true));
    }

    /* =========================================================
     *  启动 / 暂停
     * ========================================================= */
    start() {
      if (this.started) return;
      this.started = true;
      HUD.hideLoading();
      MT.Audio.resume();
      MT.Audio.music.start();
      MT.Audio.ambience.start();
      MT.Audio.ambience.setRegion('village');
      this.paused = false;
      MT.Input.lock();
      this.clock.getDelta();
      this._loop();
      HUD.toast('欢迎回家　·　任庄村', 'unlock', 5200);
      HUD.setQuests(this.questList());
    }
    setPaused(p) {
      this.paused = !!p;
      HUD.togglePause(this.paused);
      if (this.paused) { MT.Input.unlock(); MT.Audio.setVolume('music', HUD.settings.music * 0.5); }
      else { MT.Input.lock(); MT.Audio.setVolume('music', HUD.settings.music); this.clock.getDelta(); }
      if (!this.paused && HUD.pauseOpen) HUD.togglePause(false);
    }
    setPhoto(on) {
      HUD.togglePhoto(on);
      if (on) {
        MT.Input.unlock();
        const f = HUD.el['photo-fov'];
        if (f) f.value = this.camera.fov;
        this.applyPhotoFilter();   // 进入时套用已保存的滤镜
        HUD.toast('拍照模式：空格拍照，H 显示界面，P 退出', null, 4200);
      } else {
        this.applyPhotoFilter();
        // 退出时复位变焦/视野并重新锁定指针
        if (this.player) this.player.zooming = false;
        this.camera.fov = HUD.settings.fov || 68;
        this.camera.updateProjectionMatrix();
        if (!this.paused) MT.Input.lock();
      }
    }
    applyPhotoFilter() {
      const f = PHOTO_FILTERS[HUD.settings.photofilter] || 'none';
      this.canvas.style.filter = HUD.photoOpen ? f : 'none';
      this._currentFilter = f;
    }
    takePhoto() {
      try {
        this.renderer.render(this.scene, this.camera);
        const src = this.renderer.domElement;
        const out = document.createElement('canvas');
        out.width = src.width; out.height = src.height;
        const ctx = out.getContext('2d');
        const f = PHOTO_FILTERS[HUD.settings.photofilter] || 'none';
        if (f !== 'none' && 'filter' in ctx) ctx.filter = f;
        ctx.drawImage(src, 0, 0);
        // 底部水印
        ctx.filter = 'none';
        const W = out.width, H = out.height;
        const fs = Math.max(14, W * 0.016);
        ctx.font = `bold ${fs}px "KaiTi",serif`;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText('任庄村 · 我的家乡 3D', W - fs * 0.9 + 2, H - fs * 1.1 + 2);
        ctx.fillStyle = 'rgba(255,244,218,0.92)';
        ctx.fillText('任庄村 · 我的家乡 3D', W - fs * 0.9, H - fs * 1.1);
        const url = out.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `任庄村_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        HUD.toast('已保存照片到下载目录', 'item');
        MT.Audio.sfx.click();
      } catch (e) {
        HUD.toast('保存照片失败：' + (e && e.message), 'warn');
      }
    }
    toggleFly() {
      const m = this.player.mode === 'fly' ? 'walk' : 'fly';
      this.player.setMode(m);
      if (m === 'fly') {
        HUD.hint('飞行观景模式：<b>空格</b>上升，<b>Ctrl</b>下降，<b>Shift</b>加速，<b>F</b> 返回地面。', 5200);
        HUD.toast('观景模式', null, 2000);
      } else {
        HUD.hint('回到地面。', 2000);
        const p = this.player;
        p.position.y = Math.max(p.position.y, this.terrain.heightAt(p.position.x, p.position.z));
      }
    }
    respawn() {
      const p = this.player;
      p.spawnAt(this.spawn.x, this.spawn.z, Math.PI * 0.92);
      p.setMode('walk');
      HUD.toast('回到村口', null, 2400);
    }

    /* =========================================================
     *  季节 / 时间
     * ========================================================= */
    setSeason(s) {
      this.sky.setSeason(s);
      this.vegetation.setSeason(s);
      this.farm.setSeason(s);
      this.village.setSeason(s);
      this.state.seasonSeen[s] = true;
      const names = { spring: '春 · 油菜花开，开始插秧', summer: '夏 · 绿稻连天，蝉声一片', autumn: '秋 · 稻子黄了，该收秋了', winter: '冬 · 麦苗歇了，等着雪' };
      HUD.toast(names[s] || s, null, 4200);
      this.updateQuests();
    }

    /* =========================================================
     *  交互
     * ========================================================= */
    _findInteraction() {
      const p = this.player.position;
      const cam = this.camera.position;
      let best = null;
      // 1. 信物
      for (const it of this.village.collectibles) {
        if (it.taken) continue;
        const d = Math.hypot(it.x - p.x, it.z - p.z);
        if (d < 2.6 && (!best || d < best.dist)) {
          best = { type: 'item', target: it, dist: d, text: '拾取「' + it.name + '」' };
        }
      }
      // 2. 村民
      const near = this.npcs.nearest(cam, 3.6);
      if (near && (!best || near.dist < best.dist + 1.2)) {
        best = { type: 'npc', target: near.npc, dist: near.dist, text: '与 ' + near.npc.name + ' 说话' };
      }
      // 3. 作物（收割 / 采摘）
      if (!best && this.farm) {
        const hit = this._cropNear(p.x, p.z, 3.4);
        if (hit) best = {
          type: 'harvest', target: hit, dist: hit.dist,
          text: (hit.paddy ? '下田' : '采摘') + hit.name,
        };
      }
      // 4. 地点（POI）
      for (const poi of this.village.pois) {
        const d = Math.hypot(poi.x - p.x, poi.z - p.z);
        if (d < poi.r && (!best || d < best.dist + 2)) {
          const known = this.state.discovered[poi.id];
          best = {
            type: 'poi', target: poi, dist: d,
            text: (known ? '再看一眼　' : '了解　') + poi.name,
          };
        }
      }
      // 5. 渡船
      if (!best) {
        for (const dk of this.docks) {
          const d = Math.hypot(dk.x - p.x, dk.z - p.z);
          if (d < 6.5) best = { type: 'ferry', target: dk, dist: d, text: dk.north ? '过渡回南岸' : '过渡到北岸' };
        }
      }
      return best;
    }
    _cropNear(x, z, radius) {
      if (!this.farm) return null;
      let best = null, bestD = radius;
      for (const plot of this.farm.plots) {
        const dx = Math.max(0, Math.abs(x - plot.x) - plot.w / 2);
        const dz = Math.max(0, Math.abs(z - plot.z) - plot.d / 2);
        const d = Math.hypot(dx, dz);
        if (d < bestD) {
          const c = MT.FarmCrops[plot.crop];
          if (!c) continue;
          bestD = d;
          best = { crop: plot.crop, name: c.name, paddy: plot.paddy, dist: d, plot };
        }
      }
      return best;
    }

    tryInteract() {
      if (this.harvesting || this.ride) return;
      const it = this._findInteraction();
      if (!it) return;
      if (MT.Audio.ok) MT.Audio.sfx.click();
      switch (it.type) {
        case 'item': this.pickupItem(it.target); break;
        case 'npc': this.talkTo(it.target); break;
        case 'harvest': this.startHarvest(it.target); break;
        case 'poi': this.visitPoi(it.target); break;
        case 'ferry': this.rideTo(it.target); break;
      }
    }

    pickupItem(item) {
      item.taken = true;
      item.obj.visible = false;
      this.state.taken[item.id] = true;
      HUD.unlock(item.id);
      HUD.toast(`拾得信物　<b>${item.name}</b>`, 'item', 4200);
      if (MT.Audio.ok) MT.Audio.sfx.pickup();
      this.updateQuests();
    }

    talkTo(npc) {
      npc.talking = true;
      this.talkingNPC = npc;
      const line = npc.nextLine();
      HUD.openDialogue(line.s || npc.name, line.t);
      if (!this.state.talkedSet[npc.name]) {
        this.state.talkedSet[npc.name] = true;
        this.state.talkCount++;
        this.updateQuests();
      }
      if (MT.Audio.ok) MT.Audio.sfx.click();
    }
    endTalk() {
      if (this.talkingNPC) { this.talkingNPC.talking = false; this.talkingNPC = null; }
    }
    advanceDialogue() {
      if (!this.talkingNPC) { HUD.closeDialogue(); return; }
      const npc = this.talkingNPC;
      const c = HUD.culture;
      const list = c.dialogues[npc.linesKey] || c.dialogues.field;
      if (npc.lineIndex >= list.length) {
        HUD.closeDialogue();
        this.endTalk();
        if (Math.random() < 0.5) HUD.hint(HUD.culture.ambient[(Math.random() * HUD.culture.ambient.length) | 0], 3000);
        return;
      }
      const line = npc.nextLine();
      HUD.openDialogue(line.s || npc.name, line.t);
    }

    startHarvest(hit) {
      this.harvesting = { hit, t: 0, dur: 1.35 };
      HUD.setProgress(true, 0, (hit.paddy ? '插秧 / 除草' : '收' + hit.name) + '…');
      if (MT.Audio.ok) MT.Audio.sfx.harvest(hit.crop === 'wheat' ? 'wheat' : 'other');
    }
    finishHarvest() {
      const hit = this.harvesting.hit;
      const res = this.farm.harvestAt(this.player.position.x, this.player.position.z, 3.2);
      this.state.harvestCount++;
      this.harvesting = null;
      HUD.setProgress(false);
      if (MT.Audio.ok) MT.Audio.sfx.harvest(hit.crop === 'wheat' ? 'wheat' : 'other');
      // 解锁相关图鉴
      const map = { wheat: 'wheat', rice: 'paddy', corn: 'produce_grain', rape: 'produce_grain', greens: 'greenhouse' };
      const id = map[hit.crop];
      if (id) HUD.unlock(id);
      HUD.toast(`收了 <b>${hit.name}</b>　（${res ? res.removed : 0} 株）`, 'item');
      this.player.shake(0.5, 0.25);
      this.updateQuests();
    }

    visitPoi(poi) {
      const first = !this.state.discovered[poi.id];
      this.state.discovered[poi.id] = true;
      poi.discovered = true;          // 小地图/大地图上标记出来
      const c = HUD.culture;
      const entry = c.entries[poi.id] || c.items[poi.id];
      HUD.unlock(poi.id, !first);
      if (entry) {
        HUD.hint(`<b>${entry.name}</b><br>${entry.text}`, 8000);
      } else {
        HUD.hint(`<b>${poi.name}</b><br>这里还有些说不完的故事。`, 5000);
      }
      if (MT.Audio.ok) MT.Audio.sfx.bell();
      // 特殊地点标记
      if (poi.id === 'levee') this.state.flags.levee = true;
      if (poi.id === 'dock') this.state.flags.dock = true;
      if (poi.id === 'hall' || poi.id === 'temple') this.state.flags.ritual = true;
      this.updateQuests();
      // 解锁周边图鉴
      const near = { market: ['market', 'spring'], shop: ['shop', 'produce_grain'], temple: ['temple', 'nianhua'], dock: ['dock', 'fish'], river: ['river'], levee: ['levee'], school: ['school'], committee: ['committee'], oldhouse: ['oldhouse', 'wall'], mill: ['mill'], watertower: ['watertower'], pond: ['pond'], lotus: ['lotus'], bigtree: ['bigtree'], oldwell: ['oldwell'], threshing: ['threshing', 'scarecrow'], paddy: ['paddy', 'season_farming'], wheat: ['wheat', 'season_farming'], greenhouse: ['greenhouse'], canal: ['canal'], forest: ['forest'], wan: ['wan'], clinic: ['clinic'], pump: ['well_irrigation'], hall: ['hall', 'wedding'], board: ['board'] };
      const list = near[poi.id];
      if (list) list.forEach((id) => HUD.unlock(id, true));
    }

    /* ---------------- 渡船 ---------------- */
    rideTo(dock) {
      const self = this;
      this.ride = { t: 0, dock, phase: 'fade-out' };
      HUD.hint('渡船离岸了…船夫说：「坐稳喽。」', 4200);
      HUD.setFade(1);
      if (MT.Audio.ok) MT.Audio.sfx.splash(0.8);
    }
    _updateRide(dt) {
      const r = this.ride;
      if (!r) return;
      r.t += dt;
      if (r.phase === 'fade-out' && r.t > 0.9) {
        // 传送
        const target = (r.dock.north ? this.landingSouth : this.landingNorth) || { x: 101, z: -190 };
        this.player.spawnAt(target.x, target.z, r.dock.north ? Math.PI * 0.92 : 0);
        this.player.velocity.set(0, 0, 0);
        r.phase = 'fade-in';
        r.t = 0;
        this.state.rides++;
        HUD.setFade(0);
        if (MT.Audio.ok) MT.Audio.sfx.splash(1);
        HUD.hint(r.dock.north ? '回到南岸 · 任庄村这一边。' : '到了北岸 · 另一片滩涂与杨树林。', 5000);
        // 对岸观察点
        HUD.unlock('river');
        this.state.flags.river = true;
        this.updateQuests();
      } else if (r.phase === 'fade-in' && r.t > 1.4) {
        this.ride = null;
      }
    }

    /* =========================================================
     *  任务
     * ========================================================= */
    questList() {
      const c = HUD.culture;
      return c.quests.map((q) => {
        let progress = 0;
        if (q.type === 'poi') progress = Object.keys(this.state.discovered).length;
        else if (q.type === 'item') progress = Object.keys(this.state.taken).length;
        else if (q.type === 'talk') progress = this.state.talkCount;
        else if (q.type === 'harvest') progress = this.state.harvestCount;
        else if (q.type === 'season') progress = Object.keys(this.state.seasonSeen).length;
        else if (q.type === 'flag') progress = (q.flags || []).filter((f) => this.state.flags[f]).length;
        progress = Math.min(progress, q.need);
        return {
          id: q.id, name: q.name, desc: q.desc,
          progress, need: q.need,
          done: progress >= q.need,
          newly: !!this._justDone && this._justDone[q.id],
        };
      });
    }
    _buildHUDQuests() { HUD.setQuests(this.questList()); }
    updateQuests() {
      const list = this.questList();
      const justDone = {};
      for (const q of list) {
        if (q.done && !this.state.questDone[q.id]) {
          this.state.questDone[q.id] = true;
          justDone[q.id] = true;
          HUD.toast(`任务完成　<b>${q.name}</b>`, 'unlock', 4600);
          HUD.unlock('season_farming', true);
          if (MT.Audio.ok) MT.Audio.sfx.bell();
        }
      }
      this._justDone = justDone;
      HUD.setQuests(list);
      this._justDone = null;
    }

    /* =========================================================
     *  存档
     * ========================================================= */
    save(silent) {
      const p = this.player;
      const data = {
        v: 1,
        pos: { x: p.position.x, y: p.position.y, z: p.position.z },
        yaw: p.yaw, pitch: p.pitch,
        hour: this.sky.hour, month: this.sky.month, day: this.sky.day,
        season: this.sky.season, weather: this.sky.weather,
        quests: this.state.questDone,
        last: Date.now(),
        state: {
          discovered: this.state.discovered,
          unlocked: HUD.unlocked,
          taken: this.state.taken,
          talkCount: this.state.talkCount,
          talkedSet: this.state.talkedSet,
          harvestCount: this.state.harvestCount,
          flags: this.state.flags,
          seasonSeen: this.state.seasonSeen,
          rides: this.state.rides,
        },
      };
      try {
        localStorage.setItem('mytown.save', JSON.stringify(data));
        if (!silent) HUD.toast('进度已保存', 'unlock', 2600);
      } catch (e) {
        if (!silent) HUD.toast('保存失败（浏览器禁用了本地存储）', 'warn');
      }
    }
    load() {
      let raw = null;
      try { raw = localStorage.getItem('mytown.save'); } catch (e) { }
      if (!raw) return false;
      let d = null;
      try { d = JSON.parse(raw); } catch (e) { return false; }
      if (!d) return false;
      const p = this.player;
      p.position.set(d.pos.x, d.pos.y, d.pos.z);
      p.yaw = d.yaw || 0; p.pitch = d.pitch || 0;
      p.velocity.set(0, 0, 0);
      this.sky.hour = d.hour || 8;
      if (d.season && d.season !== this.sky.season) this.setSeason(d.season);
      if (d.weather) { this.sky.setWeather(d.weather, true); HUD.settings.weather = d.weather; }
      const s = d.state || {};
      this.state.discovered = s.discovered || {};
      this.state.taken = s.taken || {};
      this.state.talkCount = s.talkCount || 0;
      this.state.talkedSet = s.talkedSet || {};
      this.state.harvestCount = s.harvestCount || 0;
      this.state.flags = s.flags || {};
      this.state.seasonSeen = s.seasonSeen || {};
      this.state.rides = s.rides || 0;
      this.state.questDone = d.quests || {};
      HUD.unlocked = s.unlocked || {};
      for (const it of this.village.collectibles) {
        if (this.state.taken[it.id]) { it.taken = true; it.obj.visible = false; }
      }
      for (const poi of this.village.pois) {
        poi.discovered = !!this.state.discovered[poi.id];
      }
      HUD.setQuests(this.questList());
      HUD.syncSettingsUI();
      return true;
    }

    /* =========================================================
     *  主循环
     * ========================================================= */
    onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    _loop() {
      const self = this;
      this._lastTick = performance.now();
      const loop = () => {
        self._lastTick = performance.now();
        self._tick();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      // 兜底：某些嵌入式/后台环境里 rAF 会被节流甚至停摆，
      // 用定时器保证画面仍在推进（正常浏览器里这段永远不会触发）
      if (!this._fallbackTimer) {
        this._fallbackTimer = setInterval(() => {
          const now = performance.now();
          if (now - self._lastTick > 250) {
            self._lastTick = now;
            self._tick();
          }
        }, 150);
      }
    }

    _tick() {
      const dtRaw = this.clock.getDelta();
      const dt = Math.min(dtRaw, 0.06);
      this.t += dt;
      this.frame++;

      // FPS
      if (dtRaw > 0) this.fpsSmooth = lerp(this.fpsSmooth, 1 / dtRaw, 0.08);

      try {
        if (!this.paused) {
          this._updatePlaying(dt);
        }
      } catch (e) {
        // 单帧出错不至于让整个游戏停摆：最多提示 5 次
        this._errCount = (this._errCount || 0) + 1;
        if (this._errCount <= 5) {
          console.error('[MyTown] 更新循环出错：', e);
          if (this._errCount <= 2) MT.HUD.toast('小问题：' + (e && e.message), 'warn', 5000);
        }
      }
      // 暂停时仍然渲染（但时间不推进）
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (e) {
        this._errCount = (this._errCount || 0) + 1;
        if (this._errCount <= 5) console.error('[MyTown] 渲染出错：', e);
      }
      // 输入帧结束：清空“本帧刚按下”的标记与滚轮累计，避免状态粘滞
      MT.Input.endFrame();
    }

    _updatePlaying(dt) {
      const I = MT.Input;
      const p = this.player;

      // 快捷输入
      if (I.consumePressed('fly')) this.toggleFly();
      if (I.consumePressed('photo')) { this.setPhoto(!HUD.photoOpen); }
      if (I.consumePressed('map')) HUD.toggleMap();
      if (I.consumePressed('codex')) { if (HUD.codexOpen) HUD.closeCodex(); else HUD.openCodex(); }
      if (I.consumePressed('hud')) HUD.toggleHUD();
      if (I.consumePressed('interact')) {
        if (HUD.isDialogueOpen()) this.advanceDialogue();
        else if (!HUD.photoOpen && !HUD.mapOpen && !HUD.codexOpen) this.tryInteract();
      }
      if (I.isDown('timeFast')) this.sky.hour += dt * 0.6;
      if (I.isDown('timeSlow')) this.sky.hour -= dt * 0.6;
      // 拍照模式
      if (HUD.photoOpen) {
        if (I.justPressed('jump')) { this.takePhoto(); I.pressedOnce['Space'] = false; }
        if (I.justPressed('zoom')) {
          p.zooming = !p.zooming;
          this.camera.fov = p.zooming ? Math.max(18, this.camera.fov - 15) : (HUD.settings.fov || 68);
          this.camera.updateProjectionMatrix();
        }
      }

      // 交互中（收割）时冻结移动
      const busy = !!this.harvesting || !!this.ride || HUD.isDialogueOpen();
      p.frozen = busy;
      if (busy) {
        p.velocity.x = damp(p.velocity.x, 0, 8, dt);
        p.velocity.z = damp(p.velocity.z, 0, 8, dt);
      }
      p.update(dt);

      // 收割进度
      if (this.harvesting) {
        this.harvesting.t += dt;
        const lbl = HUD.el['progress-label'] ? HUD.el['progress-label'].textContent : '';
        HUD.setProgress(true, this.harvesting.t / this.harvesting.dur, lbl);
        if (this.harvesting.t >= this.harvesting.dur) this.finishHarvest();
      }
      this._updateRide(dt);
      if (this.ride && this.player) {
        // 过河时不让玩家乱跑
        this.player.velocity.x = 0; this.player.velocity.z = 0;
      }

      // 世界更新
      const env = this.sky.update(dt, this.camera.position, this.camera);
      this.terrain.update(dt, this.camera);
      this.npcs.update(dt, this.t, p);
      this.vegetation.update(dt, this.camera);
      this.farm.update(dt);
      this.village.updateNight(env.nightFactor);
      // 逐帧动画（家禽、旗帜、渡船等）
      const anims = MT.animated;
      if (anims) {
        for (let i = 0; i < anims.length; i++) {
          const o = anims[i];
          if (o.visible === false || !o.parent) continue;
          const d = o.position.distanceToSquared(this.camera.position);
          if (d > 26000) continue;   // 远处的动画不更新（>160m）
          if (o.userData.anim) o.userData.anim(this.t, dt, o);
        }
      }
      // 曝光
      this.renderer.toneMappingExposure = this.sky.exposure || 1;

      // 声音
      if (MT.Audio.ok) {
        MT.Audio.update(dt, env);
        if (p.telemetry.region !== this._lastRegion) {
          this._lastRegion = p.telemetry.region;
          MT.Audio.ambience.setRegion(p.telemetry.region);
          MT.Audio.cicada(p.telemetry.region === 'field' || p.telemetry.region === 'village',
            this.sky.season === 'summer' ? 1 : this.sky.season === 'autumn' ? 0.4 : 0);
          MT.Audio.music.setMood(env.nightFactor > 0.5 ? 'night' : 'day');
        }
        // 公鸡打鸣（清晨）
        if (this.sky.hour > 5.2 && this.sky.hour < 6.6 && Math.random() < dt * 0.25) MT.Audio.sfx.rooster();
        // 雷阵雨
        if (this.sky.weather === 'storm' && Math.random() < dt * 0.06) MT.Audio.sfx.thunder();
      }

      // 交互提示
      const it = (HUD.photoOpen || HUD.isDialogueOpen() || busy) ? null : this._findInteraction();
      this.interaction = it || { target: null, type: null, dist: 0 };
      if (it) HUD.setPrompt(true, it.text, 'E');
      else HUD.setPrompt(false);

      // HUD
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.2;
        const d = this.sky.dateInfo();
        HUD.setTime(this.sky.hour, d.season, d.term, d.weather, `${d.month}月${d.day}日`);
        HUD.setFps(this.fpsSmooth);
        HUD.setCoords(this.player.position);
        HUD.drawMinimap(this.player, this.village.pois, this.npcs.npcs, false);
        if (HUD.mapOpen) HUD.drawBigMap();
      }
      HUD.drawCompass(this.player.yaw);
      HUD.update(dt);

      // 自动存档
      this._autoSaveTimer = (this._autoSaveTimer || 0) + dt;
      if (this._autoSaveTimer > 120) { this._autoSaveTimer = 0; this.save(true); }

      // 场景状态提示（地点名）
      const nearPoi = this._nearestPoiName();
      if (nearPoi !== this._lastPoiName) {
        this._lastPoiName = nearPoi;
        if (nearPoi) HUD.setLocation(nearPoi, '河南省信阳市淮滨县固城乡 · 任庄村任洼队');
      }
    }

    _nearestPoiName() {
      const p = this.player.position;
      let best = null, bd = 42;
      for (const poi of this.village.pois) {
        const d = Math.hypot(poi.x - p.x, poi.z - p.z);
        if (d < bd) { bd = d; best = poi; }
      }
      return best ? best.name : '任庄村';
    }
  }

  MT.Game = Game;
})();
