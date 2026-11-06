/* =============================================================
 *  MyTown · 我的家乡 3D  —  输入系统
 *  input.js : 键盘 / 鼠标 / 指针锁定 / 动作回调
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const { clamp } = MT.util;

  const KEYMAP = {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['Space'],
    run: ['ShiftLeft', 'ShiftRight'],
    crouch: ['ControlLeft', 'KeyC'],
    interact: ['KeyE'],
    fly: ['KeyF'],
    photo: ['KeyP'],
    map: ['KeyM'],
    codex: ['KeyJ'],
    hud: ['KeyH'],
    zoom: ['KeyZ'],
    timeFast: ['BracketRight'],
    timeSlow: ['BracketLeft'],
    reset: ['KeyR'],
  };

  const Input = {
    dom: null,
    enabled: true,
    keys: Object.create(null),
    pressedOnce: Object.create(null),
    mouse: { dx: 0, dy: 0, left: false, right: false, wheel: 0 },
    locked: false,
    pointerLockSupported: true,
    sensitivity: 1.0,
    invertY: false,
    listeners: {},
    _ignoreUntil: 0,
  };

  Input.init = function (dom) {
    if (Input._inited) return;   // 防止重复绑定监听器
    Input._inited = true;
    Input.dom = dom;
    Input.pointerLockSupported = 'pointerLockElement' in document || 'mozPointerLockElement' in document;

    window.addEventListener('keydown', (e) => {
      // 输入框内不拦截
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!Input.keys[e.code]) Input.pressedOnce[e.code] = true;
      Input.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
      if (e.code === 'Escape') Input._emit('escape');
    }, { passive: false });

    window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });

    window.addEventListener('blur', () => { Input.keys = Object.create(null); Input.mouse.left = Input.mouse.right = false; });

    dom.addEventListener('mousedown', (e) => {
      if (!Input.locked) return;
      if (e.button === 0) { Input.mouse.left = true; Input._emit('primary'); }
      if (e.button === 2) { Input.mouse.right = true; Input._emit('secondary'); }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) Input.mouse.left = false;
      if (e.button === 2) Input.mouse.right = false;
    });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
      if (!Input.locked) return;
      Input.lookBy(e.movementX || 0, e.movementY || 0);
    });

    dom.addEventListener('wheel', (e) => {
      Input.mouse.wheel += Math.sign(e.deltaY);
      Input._emit('wheel', Math.sign(e.deltaY));
      if (Input.zooming) e.preventDefault();
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      const el = document.pointerLockElement || document.mozPointerLockElement;
      const was = Input.locked;
      Input.locked = el === dom;
      if (was && !Input.locked) Input._emit('unlock');
      if (!was && Input.locked) Input._emit('lock');
    });
    document.addEventListener('pointerlockerror', () => {
      Input.pointerLockSupported = false;
      Input._emit('lockerror');
    });

    // 触摸：简易虚拟摇杆由 hud 负责，这里只收集轴
    Input.touch = { x: 0, y: 0, look: false };
  };

  Input.lock = function () {
    if (!Input.dom) return;
    try {
      if (!Input.locked && Input.dom.requestPointerLock) {
        const p = Input.dom.requestPointerLock();
        if (p && p.catch) p.catch(() => { Input.pointerLockSupported = false; });
      }
    } catch (e) { Input.pointerLockSupported = false; }
  };
  Input.unlock = function () {
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { }
  };

  Input.on = function (name, cb) {
    (Input.listeners[name] = Input.listeners[name] || []).push(cb);
    return Input;
  };
  Input._emit = function (name, arg) {
    const l = Input.listeners[name];
    if (!l) return;
    for (let i = 0; i < l.length; i++) { try { l[i](arg); } catch (e) { console.error(e); } }
  };

  Input.isDown = function (action) {
    const codes = KEYMAP[action];
    if (!codes) return !!Input.keys[action];
    for (let i = 0; i < codes.length; i++) if (Input.keys[codes[i]]) return true;
    return false;
  };
  /** 本帧刚按下（只看 pressedOnce，按键已抬起也能识别，避免快速点按漏检） */
  Input.justPressed = function (action) {
    const codes = KEYMAP[action];
    if (!codes) return false;
    for (let i = 0; i < codes.length; i++) if (Input.pressedOnce[codes[i]]) return true;
    return false;
  };
  Input.consumePressed = function (action) {
    const codes = KEYMAP[action];
    if (!codes) return false;
    let hit = false;
    for (let i = 0; i < codes.length; i++) {
      if (Input.pressedOnce[codes[i]]) { hit = true; Input.pressedOnce[codes[i]] = false; }
    }
    return hit;
  };

  /** 移动轴：x 右为正，z 前为正 */
  Input.getMove = function (out) {
    out = out || { x: 0, z: 0 };
    let x = 0, z = 0;
    if (Input.isDown('forward')) z += 1;
    if (Input.isDown('back')) z -= 1;
    if (Input.isDown('right')) x += 1;
    if (Input.isDown('left')) x -= 1;
    if (Input.touch) { x += Input.touch.x; z += Input.touch.y; }
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    out.x = x; out.z = z; out.len = Math.min(1, len);
    return out;
  };

  Input.takeMouseDelta = function (out) {
    out = out || { x: 0, y: 0 };
    out.x = Input.mouse.dx; out.y = Input.mouse.dy;
    Input.mouse.dx = 0; Input.mouse.dy = 0;
    return out;
  };

  /** 视角增量（触屏/摇杆用，像素值，自动乘灵敏度） */
  Input.lookBy = function (dx, dy) {
    Input.mouse.dx += dx * Input.sensitivity;
    Input.mouse.dy += dy * Input.sensitivity * (Input.invertY ? -1 : 1);
  };
  /** 虚拟"按住"（触屏按钮）：直接置位对应按键 */
  Input.virtualHold = function (action, down) {
    const codes = KEYMAP[action];
    if (!codes) return;
    for (let i = 0; i < codes.length; i++) Input.keys[codes[i]] = !!down;
  };
  /** 虚拟"轻点"（触屏按钮）：置位 pressedOnce，交由 consumePressed 消费 */
  Input.virtualPress = function (action) {
    const codes = KEYMAP[action];
    if (!codes) return;
    for (let i = 0; i < codes.length; i++) Input.pressedOnce[codes[i]] = true;
  };

  Input.endFrame = function () {
    Input.pressedOnce = Object.create(null);
    Input.mouse.wheel = 0;
  };

  MT.Input = Input;
})();
