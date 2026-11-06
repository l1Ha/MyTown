/* =============================================================
 *  MyTown · 我的家乡 3D  —  第一人称玩家控制器
 *  player.js : 行走 / 奔跑 / 蹲下 / 跳跃 / 涉水游泳 / 飞行观景 /
 *              地形贴合 / 建筑碰撞 / 脚步声 / 头部晃动
 * ============================================================= */
(function () {
  'use strict';
  const MT = window.MT;
  const THREE = window.THREE;
  const { clamp, lerp, damp, rad } = MT.util;

  const EYE = 1.68;          // 眼高
  const CROUCH_EYE = 0.95;
  const RADIUS = 0.36;       // 碰撞半径
  const SPEED_WALK = 3.1;
  const SPEED_RUN = 6.0;
  const SPEED_CROUCH = 1.5;
  const SPEED_SWIM = 2.0;
  const JUMP = 4.6;
  const GRAVITY = 15.5;

  class Player {
    constructor(camera, terrain, opts = {}) {
      this.camera = camera;
      this.terrain = terrain;
      this.position = new THREE.Vector3(14, 0, 26);   // 脚底位置
      this.velocity = new THREE.Vector3();
      this.yaw = 0;            // 0 = 面向 -Z（北，朝淮河 / 村口）
      this.pitch = -0.05;
      this.mode = 'walk';
      this.flySpeed = 14;
      this.eyeHeight = EYE;
      this.crouching = false;
      this.onGround = true;
      this.inWater = false;
      this.waterY = 0;
      this.headBob = 0;
      this.bobAmount = 0;
      this.stepTimer = 0;
      this.fov = opts.fov || 68;
      this.baseFov = this.fov;
      this.zoomFov = 28;
      this.zooming = false;
      this.walkSpeedMul = 1;
      this.lastSurface = 'grass';
      this.splashTimer = 0;
      this.enabled = true;
      this.bounds = 476;
      this._v = new THREE.Vector3();
      this._q = new THREE.Quaternion();
      this._mouse = { x: 0, y: 0 };
      this._move = { x: 0, z: 0, len: 0 };
      this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
      this.shakeT = 0;
      this.shakeAmp = 0;
      this.frozen = false;
      this.telemetry = { speed: 0, region: 'field' };
    }

    spawnAt(x, z, yaw) {
      this.position.set(x, this.terrain.heightAt(x, z) + 0.1, z);
      if (yaw !== undefined) this.yaw = yaw;
      this.velocity.set(0, 0, 0);
    }

    setMode(mode) {
      this.mode = mode;
      if (mode === 'fly') this.velocity.set(0, 0, 0);
    }

    /** 世界坐标 → 碰撞盒局部坐标 */
    _local(c, dx, dz) {
      const cw = c.cw !== undefined ? c.cw : (c.cos !== undefined ? c.cos : Math.cos(c.ry || 0));
      const sw = c.sw !== undefined ? c.sw : (c.sin !== undefined ? -c.sin : Math.sin(c.ry || 0));
      return { lx: dx * cw - dz * sw, lz: dx * sw + dz * cw, cw, sw };
    }
    _world(c, lx, lz, cw, sw) {
      return { x: lx * cw + lz * sw, z: -lx * sw + lz * cw };
    }

    /** 与建筑碰撞体的水平推开 */
    resolveCollisions() {
      const colliders = MT.colliders;
      if (!colliders || !colliders.length) return;
      const p = this.position;
      const footY = p.y;
      const headY = p.y + (this.crouching ? 1.2 : 1.75);
      const r = RADIUS * (this.crouching ? 0.9 : 1);
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.active === false) continue;
        // 垂直范围
        const cTop = c.y + c.hh, cBot = c.y - c.hh;
        if (cBot > headY || cTop < footY + 0.12) continue;
        const dx = p.x - c.x, dz = p.z - c.z;
        // 粗筛
        const rr = Math.max(c.hw, c.hd) + r + 0.3;
        if (dx * dx + dz * dz > rr * rr * 2.2) continue;
        const L = this._local(c, dx, dz);
        const cx = clamp(L.lx, -c.hw, c.hw);
        const cz = clamp(L.lz, -c.hd, c.hd);
        let ddx = L.lx - cx, ddz = L.lz - cz;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 > r * r) continue;
        let pushX, pushZ;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const need = r - d;
          pushX = (ddx / d) * need;
          pushZ = (ddz / d) * need;
        } else {
          // 中心在盒内：沿最小穿透方向推出
          const px = c.hw + r - Math.abs(L.lx);
          const pz = c.hd + r - Math.abs(L.lz);
          if (px < pz) { pushX = Math.sign(L.lx || 1) * px; pushZ = 0; }
          else { pushX = 0; pushZ = Math.sign(L.lz || 1) * pz; }
        }
        const w = this._world(c, pushX, pushZ, L.cw, L.sw);
        p.x += w.x; p.z += w.z;
      }
    }

    update(dt) {
      if (!this.enabled) return;
      const Input = MT.Input;
      const T = this.terrain;
      const t = performance.now() * 0.001;

      /* ---- 视角 ---- */
      Input.takeMouseDelta(this._mouse);
      const sens = 0.0022;
      this.yaw -= this._mouse.x * sens;
      this.pitch -= this._mouse.y * sens;
      this.pitch = clamp(this.pitch, rad(-88), rad(88));
      // 视角随脚步声轻微摇晃
      if (this.shakeT > 0) this.shakeT -= dt;

      /* ---- 移动输入 ---- */
      Input.getMove(this._move);
      if (this.frozen) { this._move.x = 0; this._move.z = 0; this._move.len = 0; }
      const moving = this._move.len > 0.01;

      const water = T.waterAt(this.position.x, this.position.z);
      const depth = water ? Math.max(0, water.y - this.position.y) : 0;
      const swimming = water && depth > 0.55 && this.mode === 'walk';

      if (this.mode === 'fly') {
        this._updateFly(dt, moving);
      } else {
        this._updateWalk(dt, moving, swimming);
      }

      /* ---- 相机 ---- */
      const eyeTarget = this.mode === 'fly' ? 0.0 : (this.crouching ? CROUCH_EYE : EYE);
      this.eyeHeight = damp(this.eyeHeight, eyeTarget, 9, dt);
      // 头部晃动
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      this.telemetry.speed = speed;
      if (this.mode === 'walk' && this.onGround && !swimming) {
        const target = clamp(speed / SPEED_WALK, 0, 1.6);
        this.bobAmount = damp(this.bobAmount, target, 8, dt);
        if (this.bobAmount > 0.06) this.headBob += dt * (5.2 + speed * 0.85);
        else this.headBob = damp(this.headBob, 0, 6, dt);
      } else {
        this.bobAmount = damp(this.bobAmount, 0, 6, dt);
        this.headBob = damp(this.headBob, 0, 6, dt);
      }
      const bobY = Math.sin(this.headBob * 2) * 0.045 * this.bobAmount;
      const bobX = Math.cos(this.headBob) * 0.035 * this.bobAmount;
      const roll = -Math.cos(this.headBob) * 0.008 * this.bobAmount;
      const pitchShake = Math.sin(this.headBob * 2) * 0.006 * this.bobAmount;
      const shakeY = this.shakeT > 0 ? Math.sin(this.shakeT * 55) * 0.05 * this.shakeAmp : 0;

      this._euler.set(this.pitch + pitchShake, this.yaw, roll, 'YXZ');
      this.camera.quaternion.setFromEuler(this._euler);
      // 左右偏移需转换为相机局部
      const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
      this.camera.position.set(
        this.position.x + rightX * bobX,
        this.position.y + this.eyeHeight + bobY + shakeY,
        this.position.z + rightZ * bobX
      );

      /* ---- 脚步 / 涉水音效 ---- */
      if (MT.Audio && MT.Audio.ok) {
        if (this.mode === 'walk' && this.onGround && this.bobAmount > 0.2 && !swimming) {
          this.stepTimer -= dt * (speed / SPEED_WALK);
          if (this.stepTimer <= 0) {
            this.stepTimer = 0.62;
            const surf = T.surfaceAt(this.position.x, this.position.z);
            this.lastSurface = surf;
            MT.Audio.sfx.footstep(surf);
          }
        }
        if (swimming) {
          this.splashTimer -= dt;
          if (this.splashTimer <= 0) { this.splashTimer = 1.15; MT.Audio.sfx.splash(0.4); }
        }
      }

      /* ---- 环境区域（用于环境音） ---- */
      this.telemetry.region = this._region();
      this.telemetry.inWater = !!swimming;
      return this.telemetry;
    }

    _region() {
      const p = this.position;
      const T = this.terrain;
      const VC = MT.TerrainConst;
      if (p.z < VC.LEVEE_Z + 16) return 'water';
      const dv = Math.hypot(p.x - VC.VILLAGE.x, p.z - VC.VILLAGE.z);
      const dw = Math.hypot(p.x - VC.WA_CLUSTER.x, p.z - VC.WA_CLUSTER.z);
      if (dv < 110 || dw < 70) return 'village';
      if (p.x < -170 && T.heightAt(p.x, p.z) > 14) return 'forest';
      const w = T.waterAt(p.x, p.z);
      if (w && T.heightAt(p.x, p.z) < w.y + 1.2) return 'water';
      return 'field';
    }

    _updateWalk(dt, moving, swimming) {
      const Input = MT.Input;
      const T = this.terrain;
      const p = this.position;
      this.crouching = Input.isDown('crouch') && this.onGround;
      const running = Input.isDown('run') && !this.crouching;

      let speed = this.crouching ? SPEED_CROUCH : running ? SPEED_RUN : SPEED_WALK;
      speed *= this.walkSpeedMul;
      if (swimming) speed = SPEED_SWIM;
      this.crouchSpeed = speed;

      // 期望速度（世界坐标）
      const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
      const fwdX = -sinY, fwdZ = -cosY;
      const rightX = cosY, rightZ = -sinY;
      let wx = fwdX * this._move.z + rightX * this._move.x;
      let wz = fwdZ * this._move.z + rightZ * this._move.x;
      const wl = Math.hypot(wx, wz);
      if (wl > 1e-4) { wx /= wl; wz /= wl; } else { wx = wz = 0; }

      // 上坡减速
      if (moving && this.onGround && !swimming) {
        const slope = T.slopeAt(p.x + wx * 0.6, p.z + wz * 0.6);
        speed *= lerp(1, 0.55, clamp((slope - 0.3) / 0.7, 0, 1));
      }

      const accel = this.onGround ? (swimming ? 5 : 14) : 3.2;
      const targetVX = wx * speed, targetVZ = wz * speed;
      this.velocity.x = damp(this.velocity.x, targetVX, accel, dt);
      this.velocity.z = damp(this.velocity.z, targetVZ, accel, dt);

      // 跳跃
      if (this.mode === 'walk' && !this.frozen && this.onGround && !swimming && Input.isDown('jump')) {
        this.velocity.y = JUMP;
        this.onGround = false;
        if (MT.Audio && MT.Audio.ok) MT.Audio.sfx.footstep('mud');
      }

      if (swimming) {
        // 浮力：把人推向水面
        const w = T.waterAt(p.x, p.z);
        const surface = w.y - 0.42;
        const diff = surface - p.y;
        this.velocity.y = damp(this.velocity.y, clamp(diff * 3.2, -2.4, 2.4), 4, dt);
        if (Input.isDown('jump')) this.velocity.y = 1.6;
        // 水中不能跳上高处
        this.onGround = false;
        if (diff > 0.1) this.onGround = true;
      } else {
        this.velocity.y -= GRAVITY * dt;
        this.velocity.y = Math.max(this.velocity.y, -45);
      }

      // 位移
      const prevX = p.x, prevZ = p.z;
      p.x += this.velocity.x * dt;
      p.z += this.velocity.z * dt;
      p.y += this.velocity.y * dt;
      // 安全阀：单帧水平位移不应超过 5 米（防止碰撞异常把人弹飞）
      const mdx = p.x - prevX, mdz = p.z - prevZ;
      const mdist = Math.hypot(mdx, mdz);
      if (mdist > 5) {
        p.x = prevX + (mdx / mdist) * 5;
        p.z = prevZ + (mdz / mdist) * 5;
      }

      // 世界边界
      const b = this.bounds;
      p.x = clamp(p.x, -b, b);
      p.z = clamp(p.z, -b, b);

      // 碰撞
      if (!swimming) this.resolveCollisions();

      // 地形贴合
      const gh = T.heightAt(p.x, p.z);
      const groundY = gh;   // 站在地形上；深水由 swimming 分支单独处理
      if (p.y <= groundY + 0.02) {
        p.y = groundY;
        if (this.velocity.y < 0) {
          if (!this.onGround && this.velocity.y < -6 && MT.Audio && MT.Audio.ok) {
            MT.Audio.sfx.footstep('mud');
          }
          this.velocity.y = 0;
        }
        this.onGround = true;
      } else {
        this.onGround = p.y - groundY < 0.12;
      }
      if (swimming) this.onGround = false;

      // 掉出世界保护
      if (p.y < -30) { this.spawnAt(MT.TerrainConst.VILLAGE.x, MT.TerrainConst.VILLAGE.z); }
    }

    _updateFly(dt, moving) {
      const Input = MT.Input;
      const boost = Input.isDown('run') ? 3.4 : 1;
      const speed = this.flySpeed * boost;
      const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
      const fwdX = -sinY, fwdZ = -cosY;
      const rightX = cosY, rightZ = -sinY;
      // 飞行的前进方向包含俯仰
      const pitchCos = Math.cos(this.pitch), pitchSin = Math.sin(this.pitch);
      let wx = fwdX * this._move.z * pitchCos + rightX * this._move.x;
      let wz = fwdZ * this._move.z * pitchCos + rightZ * this._move.x;
      let wy = pitchSin * this._move.z;   // 看向上方时前进上升
      if (Input.isDown('jump')) wy += 1;
      if (Input.isDown('crouch')) wy -= 1;
      this.velocity.set(wx * speed, wy * speed, wz * speed);
      const p = this.position;
      p.x += this.velocity.x * dt;
      p.y += this.velocity.y * dt;
      p.z += this.velocity.z * dt;
      const minY = this.terrain.heightAt(p.x, p.z) + 1.2;
      if (p.y < minY) p.y = minY;
      p.y = Math.min(p.y, 240);
      const b = this.bounds + 60;
      p.x = clamp(p.x, -b, b);
      p.z = clamp(p.z, -b, b);
    }

    /** 相机前方向（单位向量） */
    forward(out) {
      out = out || new THREE.Vector3();
      this.camera.getWorldDirection(out);
      return out;
    }

    /** 屏幕中心射线 */
    rayFromCamera() {
      const origin = this.camera.position.clone();
      const dir = this.forward();
      return { origin, dir };
    }
    shake(amp, time) {
      this.shakeAmp = amp; this.shakeT = time;
    }
  }

  MT.Player = Player;
  MT.PlayerConst = { EYE, CROUCH_EYE, RADIUS, SPEED_WALK, SPEED_RUN, SPEED_SWIM };
})();
