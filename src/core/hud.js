/* =============================================================
 *  MyTown · 我的家乡 3D  —  界面层（HUD / 小地图 / 图鉴 / 菜单）
 *  hud.js
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const { clamp, lerp, fmtTime, rad } = MT.util;
  const $ = (id) => document.getElementById(id);

  const HUD = {
    el: {},
    toasts: [],
    quests: [],
    mapBg: null,
    mapBgSize: 0,
    lastMapDraw: 0,
    promptVisible: false,
    progressVisible: false,
    dialogue: null,
    codexOpen: false,
    mapOpen: false,
    pauseOpen: false,
    photoOpen: false,
    hintTimer: 0,
    visible: true,
    onAction: null,
  };

  /* ---------------- 初始化 ---------------- */
  HUD.init = function (opts) {
    HUD.opts = opts || {};
    const ids = [
      'loading', 'loading-bar', 'loading-text', 'loading-tip', 'start-btn', 'loading-note',
      'hud', 'crosshair', 'loc-name', 'loc-sub', 'clock-time', 'clock-season', 'clock-term', 'clock-weather',
      'quest-list', 'quest-panel', 'quest-toggle', 'quest-count', 'quest-caret', 'compass', 'minimap', 'minimap-label', 'prompt', 'prompt-text', 'prompt-key',
      'progress', 'progress-bar', 'progress-label', 'toasts', 'hint',
      'dialogue', 'dlg-name', 'dlg-text', 'dlg-avatar',
      'codex', 'codex-grid', 'codex-count', 'codex-tabs', 'codex-close',
      'map-panel', 'map-canvas', 'map-close',
      'pause', 'pause-resume', 'pause-save', 'pause-load', 'pause-codex', 'pause-map', 'pause-photo', 'pause-restart',
      'set-quality', 'set-fov', 'set-fov-v', 'set-sens', 'set-vol', 'set-music', 'set-season', 'set-weather', 'set-hour', 'set-hour-v', 'set-dayspeed', 'set-mobile',
      'photo-bar', 'photo-exit', 'photo-shot', 'photo-fov', 'photo-filter', 'photo-hud',
      'fps', 'coords', 'stat-panel', 'help', 'help-close', 'btn-help', 'quick-bar', 'version-tag',
      'fade',
    ];
    for (const id of ids) HUD.el[id] = $(id);
    // 任务清单：点标题折叠/展开（HUD.init 可能被调用多次，只绑定一次）
    HUD.questsVisible = true;
    if (HUD.el['quest-toggle'] && !HUD._questBound) {
      HUD._questBound = true;
      HUD.el['quest-toggle'].addEventListener('click', function () { HUD.toggleQuests(); });
    }
    // 从 localStorage 读取设置
    HUD.settings = Object.assign({
      quality: 'high', fov: 68, sensitivity: 1.0, volume: 0.85, music: 0.45,
      season: 'summer', weather: 'fair', hour: 8, dayspeed: 0.02, photofilter: 'none',
      invertY: false, mobile: 'auto',
    }, HUD.loadSettings());
    HUD.culture = MT.Culture;
  };

  HUD.loadSettings = function () {
    try {
      const s = localStorage.getItem('mytown.settings');
      return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
  };
  HUD.saveSettings = function () {
    try { localStorage.setItem('mytown.settings', JSON.stringify(HUD.settings)); } catch (e) { }
  };

  /* ---------------- 载入界面 ---------------- */
  HUD.setLoading = function (p, text) {
    const bar = HUD.el['loading-bar'];
    if (bar) bar.style.width = Math.round(clamp(p, 0, 1) * 100) + '%';
    if (text && HUD.el['loading-text']) HUD.el['loading-text'].textContent = text;
  };
  HUD.hideLoading = function () {
    const l = HUD.el['loading'];
    if (!l) return;
    l.classList.add('fade-out');
    setTimeout(() => { l.style.display = 'none'; }, 900);
  };
  HUD.setLoadingTip = function (t) {
    if (HUD.el['loading-tip']) HUD.el['loading-tip'].textContent = t;
  };

  /* ---------------- 基础信息 ---------------- */
  HUD.setLocation = function (name, sub) {
    if (HUD.el['loc-name']) HUD.el['loc-name'].textContent = name;
    if (HUD.el['loc-sub'] && sub) HUD.el['loc-sub'].textContent = sub;
  };
  HUD.setTime = function (hour, season, term, weather, day) {
    if (HUD.el['clock-time']) HUD.el['clock-time'].textContent = fmtTime(hour);
    if (HUD.el['clock-season']) HUD.el['clock-season'].textContent = season;
    if (HUD.el['clock-term']) HUD.el['clock-term'].textContent = term;
    if (HUD.el['clock-weather']) HUD.el['clock-weather'].textContent = weather;
    if (day && HUD.el['clock-weather']) HUD.el['clock-weather'].title = day;
  };
  HUD.setFps = function (fps) {
    if (HUD.el['fps']) HUD.el['fps'].textContent = fps.toFixed(0) + ' FPS';
  };
  HUD.setCoords = function (p) {
    if (HUD.el['coords']) HUD.el['coords'].textContent = `X ${p.x.toFixed(0)}　Z ${p.z.toFixed(0)}　Y ${p.y.toFixed(1)}`;
  };

  /* ---------------- 提示条 ---------------- */
  HUD.toast = function (text, type, ms) {
    const wrap = HUD.el['toasts'];
    if (!wrap) return;
    const d = document.createElement('div');
    d.className = 'toast' + (type ? ' ' + type : '');
    d.innerHTML = text;
    wrap.appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    setTimeout(() => {
      d.classList.remove('show');
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 600);
    }, ms || 3600);
    HUD.toasts.push(d);
    if (HUD.toasts.length > 6) {
      const old = HUD.toasts.shift();
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }
  };
  HUD.hint = function (text, ms) {
    const h = HUD.el['hint'];
    if (!h) return;
    h.innerHTML = text;
    h.classList.add('show');
    HUD.hintTimer = (ms || 4200) / 1000;
  };

  /* ---------------- 交互提示 ---------------- */
  HUD.setPrompt = function (show, text, key) {
    const p = HUD.el['prompt'];
    if (!p) return;
    if (show) {
      if (HUD.el['prompt-text']) HUD.el['prompt-text'].textContent = text || '查看';
      if (HUD.el['prompt-key']) HUD.el['prompt-key'].textContent = key || 'E';
      if (!HUD.promptVisible) { p.classList.add('show'); HUD.promptVisible = true; }
    } else if (HUD.promptVisible) {
      p.classList.remove('show'); HUD.promptVisible = false;
    }
  };
  HUD.setProgress = function (show, value, label) {
    const p = HUD.el['progress'];
    if (!p) return;
    if (show) {
      if (!HUD.progressVisible) { p.classList.add('show'); HUD.progressVisible = true; }
      if (HUD.el['progress-bar']) HUD.el['progress-bar'].style.width = Math.round(clamp(value, 0, 1) * 100) + '%';
      if (HUD.el['progress-label']) HUD.el['progress-label'].textContent = label || '';
    } else if (HUD.progressVisible) {
      p.classList.remove('show'); HUD.progressVisible = false;
    }
  };

  /* ---------------- 任务 ---------------- */
  HUD.setQuests = function (list) {
    HUD.quests = list;
    const ul = HUD.el['quest-list'];
    if (!ul) return;
    ul.innerHTML = '';
    let done = 0;
    for (const q of list) {
      if (q.done) done++;
      const li = document.createElement('li');
      li.className = 'quest' + (q.done ? ' done' : '') + (q.newly ? ' newly' : '');
      li.innerHTML =
        `<span class="q-check">${q.done ? '✓' : '○'}</span>` +
        `<span class="q-body"><span class="q-name">${q.name}</span>` +
        `<span class="q-desc">${q.desc}</span>` +
        `<span class="q-num">${q.progress}/${q.need}</span></span>`;
      ul.appendChild(li);
    }
    const panel = HUD.el['quest-panel'];
    if (panel) panel.classList.toggle('hidden', list.length === 0);
    const cnt = HUD.el['quest-count'];
    if (cnt) cnt.textContent = done + '/' + list.length;
    // 有更新时展开，并在数秒后自动隐藏
    HUD.showQuests(true);
    HUD.scheduleQuestHide();
  };
  /** 展开/收起任务清单 */
  HUD.showQuests = function (show) {
    HUD.questsVisible = !!show;
    const p = HUD.el['quest-panel'];
    if (p) p.classList.toggle('collapsed', !HUD.questsVisible);
  };
  HUD.toggleQuests = function () {
    HUD.showQuests(!HUD.questsVisible);
    if (HUD.questsVisible) HUD.scheduleQuestHide();
    else if (HUD._questTimer) { clearTimeout(HUD._questTimer); HUD._questTimer = null; }
  };
  /** 数秒后自动隐藏（收起为小标题） */
  HUD.scheduleQuestHide = function (ms) {
    if (HUD._questTimer) clearTimeout(HUD._questTimer);
    HUD._questTimer = setTimeout(function () { HUD.showQuests(false); }, ms || 6000);
  };

  /* ---------------- 对话 ---------------- */
  HUD.openDialogue = function (name, text, avatar) {
    HUD.dialogue = { name, text };
    const d = HUD.el['dialogue'];
    if (!d) return;
    if (HUD.el['dlg-name']) HUD.el['dlg-name'].textContent = name;
    if (HUD.el['dlg-text']) HUD.el['dlg-text'].textContent = text;
    d.classList.remove('hidden');
    d.classList.add('show');
  };
  HUD.closeDialogue = function () {
    const d = HUD.el['dialogue'];
    if (d) { d.classList.remove('show'); d.classList.add('hidden'); }
    HUD.dialogue = null;
  };
  HUD.isDialogueOpen = function () { return !!HUD.dialogue; };

  /* ---------------- 图鉴 ---------------- */
  HUD.unlocked = HUD.unlocked || {};
  HUD.codexTab = 'all';
  HUD.openCodex = function () {
    HUD.codexOpen = true;
    HUD.renderCodex();
    const c = HUD.el['codex'];
    if (c) { c.classList.remove('hidden'); c.classList.add('show'); }
  };
  HUD.closeCodex = function () {
    HUD.codexOpen = false;
    const c = HUD.el['codex'];
    if (c) { c.classList.remove('show'); c.classList.add('hidden'); }
  };
  HUD.unlock = function (id, silent) {
    if (HUD.unlocked[id]) return false;
    HUD.unlocked[id] = true;
    const e = HUD.culture ? HUD.culture.entry(id) : null;
    if (e && !silent) HUD.toast(`<b>图鉴解锁</b>　${e.name}`, 'unlock');
    return true;
  };
  HUD.renderCodex = function () {
    const grid = HUD.el['codex-grid'];
    if (!grid) return;
    const c = HUD.culture;
    grid.innerHTML = '';
    let unlockedCount = 0, totalCount = 0;
    // 分类
    const tabs = HUD.el['codex-tabs'];
    if (tabs && !tabs.dataset.built) {
      tabs.dataset.built = '1';
      const cats = [['all', '全部']].concat(Object.keys(c.CATS).map((k) => [k, c.CATS[k]]));
      for (const [k, name] of cats) {
        const b = document.createElement('button');
        b.className = 'codex-tab' + (k === 'all' ? ' active' : '');
        b.textContent = name;
        b.dataset.cat = k;
        b.addEventListener('click', () => {
          HUD.codexTab = k;
          Array.from(tabs.children).forEach((x) => x.classList.toggle('active', x.dataset.cat === k));
          HUD.renderCodex();
        });
        tabs.appendChild(b);
      }
    }
    const all = [];
    for (const id in c.entries) all.push([id, c.entries[id]]);
    for (const id in c.items) all.push([id, c.items[id]]);
    for (const [id, e] of all) {
      totalCount++;
      const got = !!HUD.unlocked[id];
      if (got) unlockedCount++;
      if (HUD.codexTab !== 'all' && e.cat !== HUD.codexTab) continue;
      const card = document.createElement('div');
      card.className = 'codex-card' + (got ? '' : ' locked');
      card.innerHTML = got
        ? `<div class="cc-cat">${c.CATS[e.cat] || ''}</div><div class="cc-name">${e.name}</div><div class="cc-text">${e.text}</div>`
        : `<div class="cc-cat">${c.CATS[e.cat] || ''}</div><div class="cc-name">？？？</div><div class="cc-text">在村里找到或走近它，就会记在这里。</div>`;
      grid.appendChild(card);
    }
    if (HUD.el['codex-count']) {
      HUD.el['codex-count'].textContent = `已收录 ${unlockedCount} / ${totalCount}`;
    }
  };

  /* ---------------- 小地图 ---------------- */
  HUD.initMinimap = function (terrain) {
    HUD.terrain = terrain;
    const size = 256;
    const data = terrain.minimapData(size);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const palette = {
      1: [104, 132, 78],   // 草地
      2: [64, 108, 122],   // 水
      3: [168, 154, 116],  // 滩涂
      4: [96, 112, 72],    // 山岗
      5: [176, 172, 164],  // 路
    };
    for (let i = 0; i < size * size; i++) {
      const v = data[i];
      const p = palette[v] || palette[1];
      // 轻微阴影提升层次
      const shade = 1 - ((i % size) / size) * 0.06;
      img.data[i * 4] = p[0] * shade;
      img.data[i * 4 + 1] = p[1] * shade;
      img.data[i * 4 + 2] = p[2] * shade;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    HUD.mapBg = c;
    HUD.mapBgSize = size;
  };

  HUD.drawMinimap = function (player, pois, npcs, showAll) {
    const canvas = HUD.el['minimap'];
    if (!canvas || !HUD.mapBg) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const WORLD = MT.TerrainConst.WORLD, HALF = WORLD / 2;
    const zoom = showAll ? 1 : 3.1;      // 1 = 全图，3.1 = 局部
    const px = player.position.x, pz = player.position.z;
    const cx = showAll ? 0 : px;
    const cz = showAll ? 0 : pz;
    const cxW = showAll ? HALF : HALF / zoom;
    // 背景
    const sx = (x) => ((x - (cx - cxW)) / (cxW * 2)) * W;
    const sy = (z) => ((z - (cz - cxW)) / (cxW * 2)) * H;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(HUD.mapBg, sx(-HALF), sy(-HALF), (WORLD / (cxW * 2)) * W, (WORLD / (cxW * 2)) * H);
    ctx.restore();
    // 圆形裁剪
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(HUD.mapBg, sx(-HALF), sy(-HALF), (WORLD / (cxW * 2)) * W, (WORLD / (cxW * 2)) * H);
    // POI
    for (const p of pois) {
      if (!p.discovered && !showAll) continue;
      const x = sx(p.x), y = sy(p.z);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      const isI = p.cat === 'custom' || p.cat === 'relic' || p.cat === '物产';
      const isF = p.cat === '农田' || p.cat === 'farm';
      ctx.fillStyle = isI ? '#e0b040' : isF ? '#8fc060' : '#dcd6c0';
      ctx.beginPath();
      ctx.arc(x, y, showAll ? 3.2 : 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // 信物
    if (HUD.collectibles) {
      for (const it of HUD.collectibles) {
        if (it.taken) continue;
        const x = sx(it.x), y = sy(it.z);
        if (x < 0 || y < 0 || x > W || y > H) continue;
        ctx.fillStyle = '#ffe66a';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // NPC
    if (npcs) {
      ctx.fillStyle = '#7fd0ff';
      for (const n of npcs) {
        const x = sx(n.groupObj.position.x), y = sy(n.groupObj.position.z);
        if (x < 0 || y < 0 || x > W || y > H) continue;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 玩家
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#ff5a3c';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 视锥
    ctx.restore();
    ctx.restore();
    // 外圈
    ctx.strokeStyle = 'rgba(255,240,210,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    // 北
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('北', W / 2, 14);
    // 比例尺
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const scaleM = showAll ? 100 : 40;
    const scalePx = (scaleM / (cxW * 2)) * W;
    ctx.fillRect(10, H - 16, scalePx, 2);
    ctx.fillText(scaleM + 'm', 10, H - 20);
  };

  /* ---------------- 罗盘 ---------------- */
  HUD.drawCompass = function (yaw) {
    const el = HUD.el['compass'];
    if (!el) return;
    let canvas = el.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 420; canvas.height = 34;
      el.appendChild(canvas);
      HUD._compassCanvas = canvas;
    }
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const spanDeg = 120;              // 视野内可见角度
    const pxPerDeg = W / spanDeg;
    // 玩家朝向（0 = 北 = -Z）
    const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    const marks = [
      [0, '北'], [45, '东北'], [90, '东'], [135, '东南'],
      [180, '南'], [225, '西南'], [270, '西'], [315, '西北'],
    ];
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (const [deg, name] of marks) {
      let d = deg - heading;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      if (Math.abs(d) > spanDeg / 2) continue;
      const x = W / 2 + d * pxPerDeg;
      const major = deg % 90 === 0;
      ctx.fillStyle = major ? 'rgba(255,235,190,0.95)' : 'rgba(230,224,205,0.6)';
      ctx.fillRect(x - 0.5, H - (major ? 12 : 7), 1, major ? 12 : 7);
      if (major) ctx.fillText(name, x, 12);
    }
    // 刻度
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let d = -180; d < 180; d += 15) {
      let dd = d - heading;
      while (dd > 180) dd -= 360;
      while (dd < -180) dd += 360;
      if (Math.abs(dd) > spanDeg / 2) continue;
      const x = W / 2 + dd * pxPerDeg;
      ctx.fillRect(x - 0.5, H - 4, 1, 4);
    }
    // 中心指针
    ctx.fillStyle = '#ff8a5c';
    ctx.beginPath();
    ctx.moveTo(W / 2, H - 1);
    ctx.lineTo(W / 2 - 5, H - 11);
    ctx.lineTo(W / 2 + 5, H - 11);
    ctx.closePath();
    ctx.fill();
    // 渐隐遮罩（缓存渐变，避免每帧重建）
    if (!HUD._compassGrad || HUD._compassGradW !== W) {
      const gr = ctx.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0.0)');
      gr.addColorStop(0.15, 'rgba(0,0,0,0.35)');
      gr.addColorStop(0.5, 'rgba(0,0,0,0.55)');
      gr.addColorStop(0.85, 'rgba(0,0,0,0.35)');
      gr.addColorStop(1, 'rgba(0,0,0,0.0)');
      HUD._compassGrad = gr; HUD._compassGradW = W;
    }
    const g = HUD._compassGrad;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------------- 大地图 ---------------- */
  HUD.toggleMap = function (show) {
    HUD.mapOpen = show === undefined ? !HUD.mapOpen : show;
    const p = HUD.el['map-panel'];
    if (p) { p.classList.toggle('hidden', !HUD.mapOpen); p.classList.toggle('show', HUD.mapOpen); }
    if (HUD.mapOpen) HUD.drawBigMap();
  };
  HUD.drawBigMap = function () {
    const canvas = HUD.el['map-canvas'];
    if (!canvas || !HUD.mapBg) return;
    const size = 720;
    if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#20303a';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(HUD.mapBg, 0, 0, size, size);
    const WORLD = MT.TerrainConst.WORLD, HALF = WORLD / 2;
    const sx = (x) => ((x + HALF) / WORLD) * size;
    const sy = (z) => ((z + HALF) / WORLD) * size;
    // 路名
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    // POI
    if (HUD.pois) {
      for (const p of HUD.pois) {
        const x = sx(p.x), y = sy(p.z);
        const isI = p.cat === 'custom' || p.cat === '习俗';
        ctx.fillStyle = p.discovered ? (isI ? '#e0b040' : '#f0ead6') : 'rgba(200,200,200,0.35)';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        if (p.discovered) {
          ctx.fillStyle = 'rgba(20,16,10,0.85)';
          ctx.strokeStyle = 'rgba(255,240,210,0.9)';
          ctx.lineWidth = 3;
          ctx.strokeText(p.name, x, y - 8);
          ctx.fillText(p.name, x, y - 8);
        }
      }
    }
    // 玩家
    if (HUD.player) {
      const x = sx(HUD.player.position.x), y = sy(HUD.player.position.z);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-HUD.player.yaw);
      ctx.fillStyle = '#ff5a3c';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3.5); ctx.lineTo(-6, 7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // 地名
    ctx.font = 'bold 15px "KaiTi",serif';
    ctx.fillStyle = 'rgba(255,246,220,0.8)';
    ctx.textAlign = 'left';
    ctx.fillText('我的家乡', 14, size - 16);
    ctx.font = '11px sans-serif';
    ctx.fillText('豫南 · 淮河岸边', 14, size - 2);
  };

  /* ---------------- 面板切换 ---------------- */
  HUD.togglePause = function (show) {
    HUD.pauseOpen = show === undefined ? !HUD.pauseOpen : show;
    const p = HUD.el['pause'];
    if (p) { p.classList.toggle('hidden', !HUD.pauseOpen); p.classList.toggle('show', HUD.pauseOpen); }
    if (HUD.pauseOpen) HUD.syncSettingsUI();
  };
  HUD.togglePhoto = function (show) {
    HUD.photoOpen = show === undefined ? !HUD.photoOpen : show;
    const p = HUD.el['photo-bar'];
    if (p) p.classList.toggle('hidden', !HUD.photoOpen);
    document.body.classList.toggle('photo-mode', HUD.photoOpen);
    const h = HUD.el['hud'];
    if (h) h.classList.toggle('hidden', HUD.photoOpen);
  };
  HUD.toggleHUD = function (show) {
    HUD.visible = show === undefined ? !HUD.visible : show;
    const h = HUD.el['hud'];
    if (h) h.classList.toggle('hidden', !HUD.visible);
  };

  HUD.syncSettingsUI = function () {
    const s = HUD.settings;
    const set = (id, v) => { const e = HUD.el[id]; if (e) e.value = v; };
    set('set-quality', s.quality);
    set('set-fov', s.fov);
    set('set-sens', s.sensitivity);
    set('set-vol', s.volume);
    set('set-music', s.music);
    set('set-season', s.season);
    set('set-weather', s.weather);
    set('set-hour', s.hour);
    set('set-dayspeed', s.dayspeed);
    set('set-mobile', s.mobile);
    set('photo-filter', s.photofilter);
  };

  HUD.setFade = function (alpha) {
    const f = HUD.el['fade'];
    if (f) f.style.opacity = alpha;
  };

  HUD.update = function (dt) {
    if (HUD.hintTimer > 0) {
      HUD.hintTimer -= dt;
      if (HUD.hintTimer <= 0) {
        const h = HUD.el['hint'];
        if (h) h.classList.remove('show');
      }
    }
  };

  MT.HUD = HUD;
})();
