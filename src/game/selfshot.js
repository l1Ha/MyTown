/* =============================================================
 *  MyTown · 我的家乡 3D  —  自检截图系统
 *  selfshot.js : 固定机位、单张/批量截图、性能报告
 *
 *  用途：
 *    · 开发时用 window.__game.captureAll({ upload: '/__shot' })
 *      把各机位截图和 report.json 发给本地工具（tools/shotserver.py），
 *      直接看图定位问题，不再靠猜。
 *    · 普通玩家按 F9 保存当前画面（带水印）。
 *    · 自动化可用 ?selftest=1 在进入游戏后自动跑一遍。
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { TAU } = MT.util;
  const G = MT.Game.prototype;

  /* ---------------- 机位 ---------------- */

  /** 以 POI 为中心，从村庄外侧看向它（避免把镜头放进墙里） */
  function poiView(game, id, label, opts) {
    opts = opts || {};
    const poi = (game.village.pois || []).find((p) => p.id === id);
    if (!poi) return null;
    const cx = opts.cx === undefined ? 0 : opts.cx;
    const cz = opts.cz === undefined ? 0 : opts.cz;
    let dx = poi.x - cx, dz = poi.z - cz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    // 机位默认在 POI 外侧（远离村庄中心）
    const dist = opts.dist === undefined ? Math.max(8, (poi.r || 6) * 2.0) : opts.dist;
    const camH = opts.camH === undefined ? 3.4 : opts.camH;
    const lookH = opts.lookH === undefined ? 2.4 : opts.lookH;
    return {
      id, label,
      pos: [poi.x + dx * dist, camH, poi.z + dz * dist],
      look: [poi.x, lookH, poi.z],
      fov: opts.fov || 58,
    };
  }

  G._shotViews = function () {
    const out = [];
    const spawn = this.spawn || { x: 14, z: 26 };

    // 1. 村庄全景（高空斜俯视）
    out.push({
      id: 'overview', label: '村庄全景',
      pos: [spawn.x + 78, 62, spawn.z + 96],
      look: [0, 0, 6], fov: 55,
    });
    // 2. 村口街道（人眼高度）
    out.push({
      id: 'street', label: '村口街道',
      pos: [spawn.x + 2, 1.75, spawn.z + 12],
      look: [-4, 1.6, spawn.z - 36], fov: 66,
    });
    // 3~8. 主要地点
    const add = (v) => { if (v) out.push(v); };
    // 集市：站在摊位外侧的过道里，斜看一整排摊面（6 个摊位现在朝村子一字排开）
    out.push({ id: 'market', label: '集市摊位', pos: [-40.2, 1.72, -0.8], look: [-45.2, 1.0, -16.5], fov: 62 });
    // 单个摊位正面近景：对着豆腐摊，看清招牌、布棚、桌面货物
    out.push({ id: 'stall', label: '摊位近景', pos: [-44.4, 1.7, -8.6], look: [-44.5, 1.05, -11.0], fov: 52 });
    add(poiView(this, 'oldwell', '老井', { dist: 7, camH: 2.2, lookH: 1.3, fov: 52 }));
    add(poiView(this, 'hall', '任氏宗祠', { camH: 4.2, lookH: 3.0, fov: 60 }));
    add(poiView(this, 'school', '村小学', { camH: 4.6, lookH: 3.0, fov: 60 }));
    add(poiView(this, 'bigtree', '村口大槐树', { dist: 15, camH: 3.2, lookH: 3.4, fov: 56 }));
    // 渡口：从河面一侧回看栈桥、渡船和上岸的台阶（原来站在坡上，只拍到一片土坡）
    out.push({ id: 'dock', label: '淮河渡口', pos: [92.5, 7.6, -213], look: [101, 1.4, -202.5], fov: 62 });

    // 农田：找一块稻田，从田埂外看进去
    let plot = null;
    if (this.farm && this.farm.plots) {
      plot = this.farm.plots.find((p) => p.paddy && p.crop === 'rice') ||
             this.farm.plots.find((p) => p.paddy) ||
             this.farm.plots.find((p) => p.crop === 'wheat') ||
             this.farm.plots[0];
    }
    if (plot) {
      out.push({
        id: 'field', label: '农田作物',
        pos: [plot.x + 13, 3.0, plot.z + 17],
        look: [plot.x, 0.7, plot.z], fov: 62,
      });
    }

    // 9. 村民特写（在采集时按当前朝向取景）
    out.push({ id: 'npc', label: '村民特写', npc: true, fov: 38 });
    return out;
  };

  /** 找到一个适合拍特写的村民（默认优先成年人） */
  function pickNpc(game, want) {
    const list = (game.npcs && game.npcs.npcs) || [];
    if (!list.length) return null;
    if (want) {
      const n = list.find((x) => x.name === want || x.role === want);
      if (n) return n;
    }
    const at = (game.player && game.player.position) || game.spawn;
    let best = null, bd = Infinity, bestAdult = null, bad = Infinity;
    for (const n of list) {
      if (!n.groupObj) continue;
      const d = n.groupObj.position.distanceToSquared(at);
      if (d < bd) { bd = d; best = n; }
      if (n.role !== 'child' && d < bad) { bad = d; bestAdult = n; }
    }
    return bestAdult || best;
  }

  /** 从村民四周挑一个能拍到完整人物的方向：既避开身后的墙，也避开挡在镜头前的柱子/摊布 */
  function clearAngle(game, npc, dist) {
    const p = npc.groupObj.position;
    const s = (npc.height || 1.68) / 1.68;
    const rc = new THREE.Raycaster();
    const targets = [];
    game.scene.traverse((o) => {
      if (!o.isMesh || !o.visible || o.isInstancedMesh) return;
      if (o.userData.terrain || o.userData.water || o.userData.vegetation) return;
      if (o.material && o.material.transparent) return;   // 光柱、玻璃不算遮挡
      let q = o;
      while (q) { if (q === npc.groupObj) return; q = q.parent; }
      targets.push(o);
    });
    // 取景框里的几个关键点：头、肩左、肩右、胸
    const sample = (a) => {
      const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const pts = [
        new THREE.Vector3(p.x, p.y + 1.52 * s, p.z),
        new THREE.Vector3(p.x, p.y + 1.2 * s, p.z),
        new THREE.Vector3(p.x, p.y + 1.0 * s, p.z),
      ];
      for (const sx of [-1, 1]) {
        pts.push(new THREE.Vector3(p.x + side.x * 0.34, p.y + 1.45 * s, p.z + side.z * 0.34));
        pts.push(new THREE.Vector3(p.x + side.x * 0.52, p.y + 1.1 * s, p.z + side.z * 0.52));
      }
      return pts;
    };
    const cam = new THREE.Vector3(), dir = new THREE.Vector3();
    let bestA = npc.groupObj.rotation.y, bestScore = -Infinity;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      cam.set(p.x + Math.sin(a) * dist, p.y + 1.5 * s, p.z + Math.cos(a) * dist);
      let score = 99;
      for (const pt of sample(a)) {
        const len = cam.distanceTo(pt);
        dir.copy(pt).sub(cam).normalize();
        rc.set(cam, dir); rc.near = 0.1; rc.far = Math.max(0.2, len - 0.18);
        let hits = [];
        try { hits = rc.intersectObjects(targets, false); } catch (e) { hits = []; }
        for (const h of hits) if (h.distance > 0.1 && h.distance < score) score = h.distance;
      }
      // 轻微偏好当前朝向，避免为了避障转到奇怪的角度
      const diff = Math.abs((((a - npc.groupObj.rotation.y) % TAU) + TAU * 1.5) % TAU - Math.PI);
      score += (Math.PI - diff) * 0.03;
      if (score > bestScore) { bestScore = score; bestA = a; }
    }
    return bestA;
  }

  /** 把相机放到村民正前方、与脸同高（自动避开背后的墙和摊位布） */
  function npcView(game, opts) {
    const npc = pickNpc(game, opts.npc);
    if (!npc) return null;
    const p = npc.groupObj.position;
    const s = (npc.height || 1.68) / 1.68;
    const dist = opts.npcDist || 2.35;
    const angle = clearAngle(game, npc, dist);
    const camX = p.x + Math.sin(angle) * dist;
    const camZ = p.z + Math.cos(angle) * dist;
    const ground = game.terrain.heightAt(camX, camZ);
    return {
      id: 'npc', label: '村民特写',
      pos: [camX, p.y + 1.5 * s - ground, camZ],
      look: [p.x, 1.4 * s, p.z],
      fov: opts.fov || 38,
      npc, npcFace: angle,
    };
  }

  /* ---------------- 截取 ---------------- */

  /**
   * 在指定机位截一张图。
   * @returns {{id,label,url,width,height}}
   */
  G.captureView = function (id, opts) {
    opts = opts || {};
    const cam = this.camera;
    const views = this._shotViews();
    let view = null;
    if (typeof id === 'object' && id) view = id;
    else if (id === 'npc') view = npcView(this, opts);
    else view = views.find((v) => v.id === id);

    if (!view && id === 'npc') view = views.find((v) => v.id === 'npc');
    if (!view) throw new Error('未知机位：' + id);

    // 保存相机与界面状态
    const saved = {
      pos: cam.position.clone(),
      quat: cam.quaternion.clone(),
      fov: cam.fov,
      aspect: cam.aspect,
    };
    const hide = [];
    for (const elId of ['hud', 'photo-bar', 'loading', 'touch-root']) {
      const el = document.getElementById(elId);
      if (el) { hide.push([el, el.style.display]); el.style.display = 'none'; }
    }
    // NPC 特写：临时把人物转向选好的开阔方向，保证拍到正脸
    const npcSavedRot = (view.npc && view.npcFace !== undefined) ? view.npc.groupObj.rotation.y : null;
    if (npcSavedRot !== null) view.npc.groupObj.rotation.y = view.npcFace;

    try {
      const ty = (x, z) => this.terrain.heightAt(x, z);
      // pos[1] / look[1] 都按“离地高度”解释，避免地形起伏时镜头埋地或飞到天上
      const ground = ty(view.pos[0], view.pos[2]);
      const px = view.pos[0], py = ground + view.pos[1], pz = view.pos[2];
      cam.position.set(px, py, pz);
      cam.fov = view.fov || 58;
      cam.updateProjectionMatrix();
      cam.lookAt(view.look[0], ty(view.look[0], view.look[2]) + view.look[1], view.look[2]);

      // 阴影相机跟随当前机位（否则远处的截图会没有影子）
      try { this.sky.update(0, cam.position, cam); } catch (e) { /* 截图不应因此失败 */ }

      this.renderer.render(this.scene, cam);
      const url = this.renderer.domElement.toDataURL(opts.type || 'image/jpeg', opts.quality || 0.9);
      return {
        id: view.id, label: view.label, url,
        width: this.renderer.domElement.width,
        height: this.renderer.domElement.height,
      };
    } finally {
      cam.position.copy(saved.pos);
      cam.quaternion.copy(saved.quat);
      cam.fov = saved.fov;
      cam.aspect = saved.aspect;
      cam.updateProjectionMatrix();
      if (npcSavedRot !== null) view.npc.groupObj.rotation.y = npcSavedRot;
      for (const [el, disp] of hide) el.style.display = disp;
      // 恢复玩家视角的阴影相机
      try { this.sky.update(0, cam.position, cam); } catch (e) { /* noop */ }
    }
  };

  /** dataURL → Blob（不依赖 atob 的大文件性能更好） */
  function dataUrlToBlob(url) {
    const comma = url.indexOf(',');
    const meta = url.slice(0, comma);
    const b64 = url.slice(comma + 1);
    const mime = (/data:([^;]+)/.exec(meta) || [])[1] || 'image/jpeg';
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  /**
   * 批量截图。opts:
   *   upload: '/__shot'      POST 到本地开发服务器（tools/shotserver.py）
   *   ids: ['overview',...]  只截这些机位
   *   download: true         逐张下载（浏览器可能拦截多文件）
   *   npc: '任大爷'          指定村民特写对象
   * @returns 报告对象
   */
  G.captureAll = async function (opts) {
    opts = opts || {};
    const all = this._shotViews();
    let ids = opts.ids;
    if (!ids) {
      // 默认跳过 NPC？不，特写是最需要看的，保留
      ids = all.map((v) => v.id);
    }
    const results = [];
    const infoBefore = this._errCount || 0;

    for (const id of ids) {
      let shot;
      try {
        shot = this.captureView(id, opts);
      } catch (e) {
        results.push({ id, ok: false, error: (e && e.message) || String(e) });
        continue;
      }
      const item = { id: shot.id, label: shot.label, width: shot.width, height: shot.height };
      try {
        if (opts.upload) {
          const blob = dataUrlToBlob(shot.url);
          const res = await fetch(opts.upload + '?name=' + encodeURIComponent(shot.id), {
            method: 'POST',
            headers: { 'Content-Type': blob.type || 'image/jpeg' },
            body: blob,
          });
          item.uploaded = res.ok;
          item.bytes = blob.size;
        }
        if (opts.download) {
          const a = document.createElement('a');
          a.href = shot.url;
          a.download = '我的家乡_自检_' + shot.id + '.jpg';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      } catch (e) {
        item.uploaded = false;
        item.error = '上传失败：' + ((e && e.message) || e);
      }
      results.push(item);
      // 让出主线程（后台标签页 rAF 会被节流，这里不能用 rAF）
      await new Promise((r) => setTimeout(r, 0));
    }

    const info = this.renderer.info;
    const report = {
      kind: 'mytown-selftest',
      time: new Date().toISOString(),
      url: location.href,
      version: (function () { const m = /[?&]v=([^&]+)/.exec(location.search); return m ? m[1] : ''; })(),
      quality: this.quality,
      viewport: [window.innerWidth, window.innerHeight],
      pixelRatio: this.renderer.getPixelRatio ? this.renderer.getPixelRatio() : 1,
      season: this.sky && this.sky.season,
      hour: this.sky && +(+this.sky.hour).toFixed(2),
      stats: {
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        npcs: (this.npcs && this.npcs.npcs && this.npcs.npcs.length) || 0,
        grass: (this.vegetation && this.vegetation.grassSet && this.vegetation.grassSet.mesh.count) || 0,
      },
      errors: (this._errCount || 0) - infoBefore,
      views: results,
    };

    if (opts.upload) {
      try {
        await fetch(opts.upload + '?name=_report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report, null, 2),
        });
      } catch (e) { /* 报告失败不影响截图 */ }
    }
    if (opts.log !== false) console.log('[MyTown] 自检截图完成', report);
    return report;
  };

  /* ---------------- 玩家快捷键 ---------------- */

  window.addEventListener('keydown', function (e) {
    if (e.code !== 'F9' || e.repeat) return;
    const g = window.__game;
    if (!g || !g.started || !g.takePhoto) return;
    e.preventDefault();
    if (e.shiftKey) {
      // 批量自检：存到下载目录，便于反馈
      g.captureAll({ download: true }).then((r) => {
        MT.HUD.toast('自检截图完成：' + r.views.filter((v) => !v.error).length + ' 张', 'item', 4000);
      }).catch((err) => MT.HUD.toast('自检失败：' + err.message, 'warn', 5000));
    } else {
      g.takePhoto();
    }
  });

  MT.SelfShot = {
    description: '固定机位自检截图：__game.captureView("overview") / __game.captureAll({upload:"/__shot"})',
  };
})();
