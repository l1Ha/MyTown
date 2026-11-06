/* =============================================================
 *  MyTown · 我的家乡 3D  —  触屏 / 手机模式
 *  touch.js : 虚拟摇杆、拖动视角、动作按钮；把触屏事件转成 MT.Input
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;

  const Touch = {
    enabled: false,
    dom: null,
    _stickId: null,
    _stickCx: 0,
    _stickCy: 0,
    _lookId: null,
    _lastX: 0,
    _lastY: 0,
  };

  Touch.isTouchDevice = function () {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  };
  /** 根据设置解析是否启用：'auto' | 'on' | 'off' */
  Touch.resolve = function (mode) {
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return Touch.isTouchDevice();
  };

  Touch.init = function () {
    if (Touch.dom) return Touch;
    const wrap = document.createElement('div');
    wrap.id = 'touch-ui';
    wrap.className = 'hidden';
    wrap.innerHTML = [
      '<div id="touch-look"></div>',
      '<div id="touch-stick"><div id="touch-knob"></div></div>',
      '<div id="touch-actions">',
      '  <button class="tbtn wide" data-t="interact">交互</button>',
      '  <div class="trow">',
      '    <button class="tbtn" data-t="jump">跳</button>',
      '    <button class="tbtn" data-t="run">跑</button>',
      '  </div>',
      '  <div class="trow">',
      '    <button class="tbtn" data-t="crouch">蹲</button>',
      '    <button class="tbtn" data-t="fly">飞行</button>',
      '  </div>',
      '</div>',
      '<button class="tbtn small" id="touch-menu" data-t="menu">☰</button>',
    ].join('');
    document.body.appendChild(wrap);
    Touch.dom = wrap;

    const Input = MT.Input;
    const stick = wrap.querySelector('#touch-stick');
    const knob = wrap.querySelector('#touch-knob');
    const look = wrap.querySelector('#touch-look');
    const STICK_R = 54;

    const setKnob = (dx, dy) => {
      knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    };
    const releaseStick = () => {
      Touch._stickId = null;
      setKnob(0, 0);
      Input.touch.x = 0; Input.touch.y = 0;
    };

    // 摇杆
    stick.addEventListener('pointerdown', (e) => {
      Touch._stickId = e.pointerId;
      try { stick.setPointerCapture(e.pointerId); } catch (err) { }
      const r = stick.getBoundingClientRect();
      Touch._stickCx = r.left + r.width / 2;
      Touch._stickCy = r.top + r.height / 2;
      releaseStick();
      Touch._stickId = e.pointerId;
      e.preventDefault();
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== Touch._stickId) return;
      let dx = e.clientX - Touch._stickCx, dy = e.clientY - Touch._stickCy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_R) { dx = dx / len * STICK_R; dy = dy / len * STICK_R; }
      setKnob(dx, dy);
      Input.touch.x = dx / STICK_R;     // 右为正
      Input.touch.y = -dy / STICK_R;    // 屏幕向上 = 前进
      e.preventDefault();
    });
    stick.addEventListener('pointerup', (e) => { if (e.pointerId === Touch._stickId) releaseStick(); });
    stick.addEventListener('pointercancel', (e) => { if (e.pointerId === Touch._stickId) releaseStick(); });
    stick.addEventListener('lostpointercapture', releaseStick);

    // 拖动视角
    look.addEventListener('pointerdown', (e) => {
      Touch._lookId = e.pointerId;
      try { look.setPointerCapture(e.pointerId); } catch (err) { }
      Touch._lastX = e.clientX; Touch._lastY = e.clientY;
      e.preventDefault();
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== Touch._lookId) return;
      const dx = e.clientX - Touch._lastX, dy = e.clientY - Touch._lastY;
      Touch._lastX = e.clientX; Touch._lastY = e.clientY;
      Input.lookBy(dx * 1.4, dy * 1.4);
      e.preventDefault();
    });
    const endLook = (e) => { if (e.pointerId === Touch._lookId) Touch._lookId = null; };
    look.addEventListener('pointerup', endLook);
    look.addEventListener('pointercancel', endLook);
    look.addEventListener('lostpointercapture', endLook);

    // 动作按钮
    const HOLD = { jump: 1, run: 1, crouch: 1 };
    wrap.querySelectorAll('.tbtn').forEach((btn) => {
      const act = btn.dataset.t;
      const down = (e) => {
        btn.classList.add('active');
        if (HOLD[act]) Input.virtualHold(act, true);
        else if (act === 'menu') Input._emit('escape');
        else Input.virtualPress(act);      // interact / fly 等轻点型
        e.preventDefault();
        e.stopPropagation();
      };
      const up = (e) => {
        btn.classList.remove('active');
        if (HOLD[act]) Input.virtualHold(act, false);
        if (e) e.preventDefault();
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    return Touch;
  };

  Touch.setEnabled = function (on) {
    on = !!on;
    if (on && !Touch.dom) Touch.init();
    Touch.enabled = on;
    if (Touch.dom) Touch.dom.classList.toggle('hidden', !on);
    document.body.classList.toggle('mobile', on);
    if (!on) {
      // 关闭时释放所有虚拟输入，避免"卡住"
      const Input = MT.Input;
      Input.touch.x = 0; Input.touch.y = 0;
      Input.virtualHold('jump', false);
      Input.virtualHold('run', false);
      Input.virtualHold('crouch', false);
      Input.mouse.dx = 0; Input.mouse.dy = 0;
      Touch._stickId = null; Touch._lookId = null;
    }
  };

  MT.Touch = Touch;
})();
