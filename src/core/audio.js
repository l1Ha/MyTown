/* =============================================================
 *  MyTown · 我的家乡 3D  —  程序化音频（WebAudio 合成，无音频文件）
 *  audio.js : 环境音（风、水、鸟、蝉、蛙、鸡犬）+ 音效 + 生成式乡音小调
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const { clamp, lerp } = MT.util;

  const A = {
    ctx: null,
    ready: false,
    failed: false,
    enabled: true,
    volumes: { master: 0.85, amb: 0.7, sfx: 0.9, music: 0.45 },
    buses: {},
    _amb: null,
    _music: null,
    _timers: [],
  };

  /* ---------------- 初始化 ---------------- */
  A.init = function () {
    if (A.ready || A.failed) return A.ready;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('WebAudio 不可用');
      const ctx = (A.ctx = new Ctx());
      const master = ctx.createGain();
      master.gain.value = A.volumes.master;
      master.connect(ctx.destination);
      // 轻压缩，避免叠加爆音
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 20; comp.ratio.value = 4;
      comp.attack.value = 0.006; comp.release.value = 0.25;
      comp.connect(master);
      A.master = master; A.busOut = comp;
      const mk = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(comp); return g; };
      A.buses.sfx = mk(A.volumes.sfx);
      A.buses.amb = mk(A.volumes.amb);
      A.buses.music = mk(A.volumes.music);

      // 混响（合成脉冲响应：乡村晒场的开阔感）
      const conv = ctx.createConvolver();
      conv.buffer = makeIR(ctx, 1.9, 2.6);
      const wet = ctx.createGain(); wet.gain.value = 0.28;
      conv.connect(wet); wet.connect(comp);
      A.reverb = conv;

      A.noiseBuf = makeNoise(ctx, 3);
      A.ready = true;
      return true;
    } catch (e) {
      console.warn('[audio] 初始化失败：', e && e.message);
      A.failed = true;
      return false;
    }
  };

  A.resume = function () {
    if (!A.ready) A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };
  A.suspend = function () { if (A.ctx && A.ctx.state === 'running') A.ctx.suspend(); };

  A.setVolume = function (which, v) {
    A.volumes[which] = clamp(v, 0, 1);
    if (!A.ready) return;
    if (which === 'master') A.master.gain.value = A.volumes.master;
    else if (A.buses[which]) A.buses[which].gain.value = A.volumes[which];
  };

  /* ---------------- 基础素材 ---------------- */
  function makeNoise(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function makeIR(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }
  function loopNoise(ctx, buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    return s;
  }
  function env(ctx, node, t0, a, d, peak, sustain) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sustain || 0.0002), t0 + a + d);
    node.connect(g);
    return g;
  }

  /* ---------------- 音效 ---------------- */
  const SFX = {};

  SFX.click = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.05);
    const g = env(ctx, o, t, 0.004, 0.09, 0.18);
    g.connect(A.buses.sfx); o.start(t); o.stop(t + 0.16);
  };

  SFX.footstep = function (surface) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const src = loopNoise(ctx, A.noiseBuf);
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const f = ctx.createBiquadFilter();
    const p = ctx.createBiquadFilter();
    p.type = 'peaking';
    let peak = 0.13, dur = 0.11, band = 900;
    switch (surface) {
      case 'water': return SFX.splash(0.45);
      case 'grass': band = 2200; break;
      case 'mud': band = 420; peak = 0.17; dur = 0.16; break;
      case 'straw': band = 3200; peak = 0.11; break;
      case 'stone':
      case 'cement': band = 1500; peak = 0.2; dur = 0.08; break;
      default: band = 700; break;
    }
    f.type = 'bandpass'; f.frequency.value = band; f.Q.value = 0.9;
    p.frequency.value = band * 0.4; p.gain.value = 6;
    src.connect(f); f.connect(p);
    const g = env(ctx, p, t, 0.004, dur, peak);
    g.connect(A.buses.sfx);
    src.start(t); src.stop(t + dur + 0.06);
  };

  SFX.splash = function (amp) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const src = loopNoise(ctx, A.noiseBuf);
    src.playbackRate.value = 1.2;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.25);
    src.connect(f);
    const g = env(ctx, f, t, 0.006, 0.32, 0.2 * (amp || 1));
    g.connect(A.buses.sfx);
    src.start(t); src.stop(t + 0.4);
  };

  /** 鸟叫：短促上滑音 */
  SFX.bird = function (kind) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle';
    const base = kind === 'cuckoo' ? 780 : 1800 + Math.random() * 1200;
    const n = kind === 'cuckoo' ? 2 : (1 + (Math.random() * 3 | 0));
    let tt = t;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.connect(A.buses.amb);
    for (let i = 0; i < n; i++) {
      const d = 0.06 + Math.random() * 0.07;
      o.frequency.setValueAtTime(base * (1 + Math.random() * 0.1), tt);
      o.frequency.linearRampToValueAtTime(base * (1.25 + Math.random() * 0.4), tt + d);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(0.09, tt + d * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
      tt += d + (kind === 'cuckoo' ? 0.28 : 0.05 + Math.random() * 0.12);
    }
    o.connect(g);
    o.start(t); o.stop(tt + 0.1);
  };

  /** 蛙鸣 */
  SFX.frog = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const reps = 2 + (Math.random() * 4 | 0);
    for (let i = 0; i < reps; i++) {
      const tt = t + i * 0.16;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(320 + Math.random() * 120, tt);
      o.frequency.exponentialRampToValueAtTime(180, tt + 0.1);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
      o.connect(f);
      const g = env(ctx, f, tt, 0.008, 0.1, 0.11);
      g.connect(A.buses.amb);
      o.start(tt); o.stop(tt + 0.14);
    }
  };

  /** 蝉鸣（夏季白天） */
  A.cicada = function (on, intensity) {
    if (!A.ready) return;
    if (A._cicada) {
      if (!on) {
        try {
          A._cicada.gain.gain.value = 0;
          A._cicada.src.stop();
          if (A._cicada.lfo) A._cicada.lfo.stop();
          A._cicada.src.disconnect();
          A._cicada.gain.disconnect();
          if (A._cicada.lfo) A._cicada.lfo.disconnect();
        } catch (e) { }
        A._cicada = null;
      }
      else { A._cicada.gain.gain.value = intensity * 0.09; return; }
    }
    if (!on) return;
    const ctx = A.ctx;
    const src = loopNoise(ctx, A.noiseBuf);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4200; f.Q.value = 6;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 6300; f2.Q.value = 5;
    const g = ctx.createGain(); g.gain.value = intensity * 0.09;
    const am = ctx.createGain(); am.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 42;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG); lfoG.connect(am.gain);
    src.connect(f); src.connect(f2); f.connect(am); f2.connect(am);
    am.connect(g); g.connect(A.buses.amb);
    src.start(); lfo.start();
    A._cicada = { src, gain: g, lfo };
  };

  /** 公鸡打鸣 */
  SFX.rooster = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1100; f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2400; f2.Q.value = 4;
    const seq = [[420, 0.0, 0.20], [700, 0.22, 0.30], [560, 0.55, 0.45], [420, 1.05, 0.35]];
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    seq.forEach(([f, dt, dur]) => {
      o.frequency.setValueAtTime(f * 0.85, t + dt);
      o.frequency.linearRampToValueAtTime(f, t + dt + dur * 0.25);
      o.frequency.linearRampToValueAtTime(f * 0.7, t + dt + dur);
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime(0.16, t + dt + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur);
    });
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g);
    g.connect(A.buses.amb); g.connect(A.reverb);
    o.start(t); o.stop(t + 1.6);
  };

  SFX.dog = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) {
      const tt = t + i * 0.22;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(300 + Math.random() * 80, tt);
      o.frequency.exponentialRampToValueAtTime(140, tt + 0.12);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
      o.connect(f);
      const g = env(ctx, f, tt, 0.006, 0.13, 0.11);
      g.connect(A.buses.amb);
      o.start(tt); o.stop(tt + 0.2);
    }
  };

  SFX.chicken = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1300, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 2.5;
    o.connect(f);
    const g = env(ctx, f, t, 0.006, 0.14, 0.055);
    g.connect(A.buses.amb);
    o.start(t); o.stop(t + 0.2);
  };

  /** 收成 / 拾取 */
  SFX.harvest = function (kind) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const src = loopNoise(ctx, A.noiseBuf);
    src.playbackRate.value = kind === 'wheat' ? 1.6 : 1.0;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'wheat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'wheat' ? 3000 : 1200;
    src.connect(f);
    const g = env(ctx, f, t, 0.01, 0.28, 0.16);
    g.connect(A.buses.sfx);
    src.start(t); src.stop(t + 0.36);
  };

  SFX.pickup = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    [0, 0.1, 0.22].forEach((dt, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      const freqs = [880, 1180, 1560];
      o.frequency.value = freqs[i];
      const g = env(ctx, o, t + dt, 0.005, 0.16, 0.13);
      g.connect(A.buses.sfx); g.connect(A.reverb);
      o.start(t + dt); o.stop(t + dt + 0.24);
    });
  };

  SFX.bell = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    [1, 2.02, 3.01, 4.4].forEach((m, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = 440 * m;
      const g = env(ctx, o, t, 0.004, 1.4 / (i + 1), 0.1 / (i + 1));
      g.connect(A.buses.sfx); g.connect(A.reverb);
      o.start(t); o.stop(t + 1.6);
    });
  };

  SFX.thunder = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const src = loopNoise(ctx, A.noiseBuf);
    src.playbackRate.value = 0.32;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(70, t + 1.6);
    src.connect(f);
    const g = env(ctx, f, t, 0.03, 2.0, 0.32);
    g.connect(A.buses.amb); g.connect(A.reverb);
    src.start(t); src.stop(t + 2.2);
  };

  /* ---------------- 环境层 ---------------- */
  const Amb = {
    nodes: null,
    region: 'field',
    target: { wind: 0.5, water: 0, crowd: 0 },
    cur: { wind: 0.5, water: 0, crowd: 0 },
    _nextBird: 0, _nextFrog: 0, _nextChicken: 0,
  };

  Amb.start = function () {
    if (!A.ready || Amb.nodes) return;
    const ctx = A.ctx;
    // 风
    const windSrc = loopNoise(ctx, A.noiseBuf);
    const windF = ctx.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 420; windF.Q.value = 0.6;
    const windF2 = ctx.createBiquadFilter(); windF2.type = 'highpass'; windF2.frequency.value = 90;
    const windG = ctx.createGain(); windG.gain.value = 0.0;
    windSrc.connect(windF2); windF2.connect(windF);
    windF.connect(windG); windG.connect(A.buses.amb);
    windSrc.start();
    // 风阵（LFO）
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.05;
    lfo.connect(lfoG); lfoG.connect(windG.gain); lfo.start();

    // 水声
    const wSrc = loopNoise(ctx, A.noiseBuf);
    const wF = ctx.createBiquadFilter(); wF.type = 'bandpass'; wF.frequency.value = 900; wF.Q.value = 0.5;
    const wF2 = ctx.createBiquadFilter(); wF2.type = 'bandpass'; wF2.frequency.value = 2200; wF2.Q.value = 0.8;
    const wG = ctx.createGain(); wG.gain.value = 0;
    wSrc.connect(wF); wSrc.connect(wF2); wF.connect(wG); wF2.connect(wG); wG.connect(A.buses.amb);
    wSrc.start();
    const wLfo = ctx.createOscillator(); wLfo.frequency.value = 0.24;
    const wLfoG = ctx.createGain(); wLfoG.gain.value = 0.03;
    wLfo.connect(wLfoG); wLfoG.connect(wG.gain); wLfo.start();

    // 村落人声感觉（低频嘈杂，棚下闲聊的氛围）
    const cSrc = loopNoise(ctx, A.noiseBuf);
    const cF = ctx.createBiquadFilter(); cF.type = 'bandpass'; cF.frequency.value = 500; cF.Q.value = 0.8;
    const cG = ctx.createGain(); cG.gain.value = 0;
    cSrc.connect(cF); cF.connect(cG); cG.connect(A.buses.amb);
    cSrc.start();

    Amb.nodes = { windG, wG, cG };
  };

  Amb.setRegion = function (region) {
    Amb.region = region;
    const T = { field: { wind: 0.045, water: 0, crowd: 0 }, water: { wind: 0.035, water: 0.16, crowd: 0 }, village: { wind: 0.02, water: 0, crowd: 0.03 }, forest: { wind: 0.06, water: 0, crowd: 0 } };
    const t = T[region] || T.field;
    Amb.target.wind = t.wind; Amb.target.water = t.water; Amb.target.crowd = t.crowd;
  };

  Amb.update = function (dt, env) {
    if (!A.ready || !Amb.nodes) return;
    const k = 1 - Math.exp(-dt * 1.2);
    Amb.cur.wind = lerp(Amb.cur.wind, Amb.target.wind * (env && env.windStrength !== undefined ? env.windStrength : 1), k);
    Amb.cur.water = lerp(Amb.cur.water, Amb.target.water, k);
    Amb.cur.crowd = lerp(Amb.cur.crowd, Amb.target.crowd, k);
    Amb.nodes.windG.gain.value = Amb.cur.wind;
    Amb.nodes.wG.gain.value = Amb.cur.water;
    Amb.nodes.cG.gain.value = Amb.cur.crowd;

    const now = A.ctx.currentTime;
    // 鸟：白天多一些
    const dayFactor = env ? env.dayFactor : 1;
    if (now > Amb._nextBird) {
      Amb._nextBird = now + 1.5 + Math.random() * (dayFactor > 0.3 ? 5 : 22);
      if (Math.random() < 0.25 + 0.6 * dayFactor) SFX.bird(Math.random() < 0.25 ? 'cuckoo' : 'sparrow');
    }
    if (now > Amb._nextFrog) {
      Amb._nextFrog = now + 1.2 + Math.random() * 6;
      if (Amb.region === 'water' && Math.random() < (env && env.nightFactor > 0.4 ? 0.75 : 0.3)) SFX.frog();
    }
    if (now > Amb._nextChicken) {
      Amb._nextChicken = now + 6 + Math.random() * 25;
      if (Amb.region === 'village' && Math.random() < 0.5) {
        if (Math.random() < 0.2) SFX.dog(); else SFX.chicken();
      }
    }
  };

  /* ---------------- 生成式音乐（五声音阶 · 竹笛/古筝意象） ---------------- */
  const Mus = { playing: false, next: 0, scale: [0, 2, 4, 7, 9], root: 293.66, step: 0, mode: 'day', gainNode: null };

  Mus.note = function (freq, dur, level, type) {
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'triangle';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq * 5;
    o.connect(f); o2.connect(f); f.connect(g);
    g.connect(Mus.gainNode);
    const rev = ctx.createGain(); rev.gain.value = 0.35; g.connect(rev); rev.connect(A.reverb);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  };

  Mus.start = function () {
    if (!A.ready || Mus.playing) return;
    if (!Mus.gainNode) {
      Mus.gainNode = A.ctx.createGain();
      Mus.gainNode.gain.value = 0.5;
      Mus.gainNode.connect(A.buses.music);
    }
    Mus.playing = true;
    Mus.next = A.ctx.currentTime + 0.2;
  };
  Mus.stop = function () { Mus.playing = false; };
  Mus.setMood = function (m) { Mus.mode = m; };

  Mus.update = function () {
    if (!A.ready || !Mus.playing) return;
    const now = A.ctx.currentTime;
    if (now < Mus.next) return;
    Mus.step++;
    const s = Mus.scale;
    const oct = Mus.mode === 'night' ? -1 : (Math.random() < 0.25 ? 1 : 0);
    const deg = s[(Math.random() * s.length) | 0];
    const freq = Mus.root * Math.pow(2, (deg + 12 * oct) / 12) * (Math.random() < 0.3 ? 0.5 : 1);
    const dur = 1.2 + Math.random() * 2.2;
    const lvl = 0.10 + Math.random() * 0.07;
    Mus.note(freq, dur, lvl, Math.random() < 0.5 ? 'triangle' : 'sine');
    // 偶尔来一个低音五度，像远处唢呐/低音鼓
    if (Mus.step % 6 === 0) Mus.note(freq * 0.5, dur * 2.2, 0.06, 'sine');
    const gap = Mus.mode === 'night' ? 2.2 + Math.random() * 3.5 : 0.9 + Math.random() * 2.2;
    Mus.next = now + gap;
  };

  /* ---------------- 对外接口 ---------------- */
  MT.Audio = {
    init: A.init,
    resume: A.resume,
    suspend: A.suspend,
    setVolume: A.setVolume,
    volumes: A.volumes,
    sfx: SFX,
    ambience: Amb,
    music: Mus,
    cicada: A.cicada,
    update(dt, env) {
      if (!A.ready) return;
      Amb.update(dt, env);
      Mus.update();
    },
    get ok() { return A.ready && !A.failed; },
  };
})();
