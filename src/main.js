/* =============================================================
 *  MyTown · 我的家乡 3D  —  引导程序
 *  main.js : 载入流程、错误提示、启动游戏
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;

  const TIPS = [
    '小提示：W A S D 走路，Shift 跑，空格跳，E 看东西。',
    '小提示：按 F 可以飞到天上看看全村的布局。',
    '小提示：按 M 打开地图，按 J 打开家乡图鉴。',
    '小提示：村里的发光物是"文化信物"，走近按 E 拾取。',
    '小提示：按 [ 和 ] 可以加快或减慢时间。',
    '小提示：Esc 打开菜单，可以换季节、天气和时间。',
    '小提示：夜里会亮灯，清晨能听见公鸡打鸣。',
    '小提示：走到麦田、菜园旁边按 E，可以下地干活。',
    '小提示：渡口的渡船会把你送到淮河北岸。',
    '小提示：戴上耳机，风声、蝉鸣和水声都是现场合成的。',
  ];

  function fail(title, detail) {
    const l = document.getElementById('loading');
    if (l) {
      l.innerHTML = `<div class="load-inner">
        <div class="load-seal" style="background:#5a1a14">出错</div>
        <h1 class="load-title" style="font-size:30px">${title}</h1>
        <div class="load-sub" style="margin:14px 0 6px;line-height:1.9">${detail || ''}</div>
        <p class="load-help">如果双击打开不行，请用本地服务器运行：
        <code>python -m http.server 8080</code>，然后访问 http://localhost:8080/</p>
      </div>`;
    }
    console.error('[MyTown]', title, detail);
  }

  function boot() {
    if (!window.THREE) {
      fail('没有找到 Three.js',
        '请确认 <code>vendor/three/three.min.js</code> 存在（应与 index.html 在同一目录下的 vendor 文件夹中）。');
      return;
    }
    if (!MT || !MT.Game) {
      fail('脚本没有正确载入', '请检查 src 目录下的 js 文件是否齐全。');
      return;
    }
    // 同步模式（自动化测试用：?sync=1 一次性生成世界）
    if (/[?&]sync=1/.test(location.search)) MT.NO_YIELD = true;
    // 初始化界面（必须先于游戏，读取设置）
    MT.HUD.init();
    MT.HUD.setLoading(0.01, '正在启动…');

    // 载入提示轮播
    let tipIndex = 0;
    const tipTimer = setInterval(() => {
      tipIndex = (tipIndex + 1) % TIPS.length;
      MT.HUD.setLoadingTip(TIPS[tipIndex]);
    }, 3200);
    MT.HUD.setLoadingTip(TIPS[0]);

    // WebGL 检查
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) {
        clearInterval(tipTimer);
        fail('你的浏览器没有开启 WebGL', '请更新浏览器或在设置中开启硬件加速后重试。');
        return;
      }
    } catch (e) { /* 继续尝试 */ }

    let game = null;
    const t0 = performance.now();
    try {
      game = new MT.Game({ canvas: document.getElementById('scene') });
      window.__game = game;
    } catch (e) {
      clearInterval(tipTimer);
      fail('初始化失败', (e && e.message) || String(e));
      console.error(e);
      return;
    }

    game.init((p, text) => {
      MT.HUD.setLoading(p, text);
    }).then(() => {
      clearInterval(tipTimer);
      MT.HUD.setLoading(1, '准备就绪');
      const ms = Math.round(performance.now() - t0);
      console.log('[MyTown] 世界生成完成，用时 ' + ms + ' ms');
      const btn = document.getElementById('start-btn');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '进入村庄';
      }
      // 自动载入存档
      try { game.load(); } catch (e) { }
      MT.HUD.setLoadingTip('世界已生成：房舍 ' + (MT.colliders ? MT.colliders.length : 0) + ' 处碰撞体 · 用时 ' + (ms / 1000).toFixed(1) + ' 秒');
    }).catch((e) => {
      clearInterval(tipTimer);
      fail('生成世界时出错', (e && e.message) || String(e));
      console.error(e);
    });

    // 键盘也能开始
    const startOnKey = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        const btn = document.getElementById('start-btn');
        if (btn && !btn.disabled) { btn.click(); window.removeEventListener('keydown', startOnKey); }
      }
    };
    window.addEventListener('keydown', startOnKey);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
