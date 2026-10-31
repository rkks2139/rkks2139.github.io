/* 睦子米魔人 — bullet pool, movement and firing helpers */
(function () {
  'use strict';
  const G = window.G;
  const TAU = G.TAU;

  const MAX_BULLETS = 2600;

  const DEFAULTS = {
    x: 0, y: 0, vx: 0, vy: 0, ang: 0, spd: 0, accel: 0, angVel: 0,
    r: 4, cr: 3.2, kind: 'orb', color: 0, rot: 0, rotVel: 0,
    t: 0, life: 1200, warn: 0, width: 6, len: 0, mode: 0,
    grazed: false, wait: 0, homing: 0, splitAt: 0, splitN: 0, splitSpd: 2.4,
    splitColor: -1, splitKind: 'orb', wa: 0, wf: 0.1, wp: 0, alpha: 1, glow: 1,
    maxSpd: 999, minSpd: -999, spinOffset: 0, active: false, tag: 0, tex: 0
  };

  function blank() { return Object.assign({}, DEFAULTS); }

  class BulletManager {
    constructor() {
      this.objs = new Array(MAX_BULLETS);
      this.free = new Array(MAX_BULLETS);
      for (let i = 0; i < MAX_BULLETS; i++) {
        this.objs[i] = blank();
        this.free[i] = MAX_BULLETS - 1 - i;
      }
      this.count = 0;
      this.overwrite = 0;
      this.px = 0; this.py = 0;
      this.paused = false;
    }

    reset() {
      for (let i = 0; i < MAX_BULLETS; i++) {
        this.objs[i].active = false;
        this.free[i] = MAX_BULLETS - 1 - i;
      }
      this.count = 0;
    }

    _get() {
      if (this.free.length === 0) {
        // recycle in round-robin order
        const idx = this.overwrite % MAX_BULLETS;
        this.overwrite++;
        this.objs[idx].active = false;
        return this.objs[idx];
      }
      const idx = this.free.pop();
      return this.objs[idx];
    }

    fire(x, y, ang, spd, opt) {
      const b = this._get();
      Object.assign(b, DEFAULTS, opt || {});
      b.active = true;
      b.x = x; b.y = y;
      b.ang = ang; b.spd = spd;
      b.vx = Math.cos(ang) * spd;
      b.vy = Math.sin(ang) * spd;
      b.t = 0;
      b.grazed = false;
      b.rot = ang + Math.PI / 2;
      b.rotVel = b.rotVel || 0;
      if (!opt || opt.life === undefined) b.life = 1200;
      if (b.kind === 'laser') {
        b.cr = b.width * 0.55;
      } else if (b.cr === 3.2) {
        b.cr = b.r * 0.78;
      }
      this.count++;
      return b;
    }

    /* ---- composite firing helpers ---- */
    aimed(x, y, target, spd, opt) {
      return this.fire(x, y, G.angleTo(x, y, target.x, target.y), spd, opt);
    }

    fan(x, y, centerAng, count, spread, spd, opt) {
      const n = Math.max(1, count);
      const out = [];
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : spread * (i / (n - 1) - 0.5);
        out.push(this.fire(x, y, centerAng + off, spd, opt));
      }
      return out;
    }

    aimedFan(x, y, target, count, spread, spd, opt) {
      return this.fan(x, y, G.angleTo(x, y, target.x, target.y), count, spread, spd, opt);
    }

    ring(x, y, count, a0, spd, opt) {
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push(this.fire(x, y, a0 + (i / count) * TAU, spd, opt));
      }
      return out;
    }

    arc(x, y, count, centerAng, arc, spd, opt) {
      const out = [];
      for (let i = 0; i < count; i++) {
        const a = centerAng + (count === 1 ? 0 : (i / (count - 1) - 0.5) * arc);
        out.push(this.fire(x, y, a, spd, opt));
      }
      return out;
    }

    laser(x, y, ang, len, opt) {
      const b = this.fire(x, y, ang, 0, Object.assign({ kind: 'laser', warn: 70, width: 8, len, life: 220, r: 8 }, opt));
      return b;
    }

    /* ---- update ---- */
    update(player) {
      const objs = this.objs;
      this.count = 0;
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = objs[i];
        if (!b.active) continue;
        b.t++;

        if (b.wait > 0) {
          b.wait--;
          continue;
        }

        if (b.kind === 'laser') {
          if (b.warn > 0) b.warn--;
          else {
            b.ang += b.angVel;
            b.life--;
            if (b.life <= 0) { b.active = false; this.free.push(i); continue; }
          }
          this.count++;
          continue;
        }

        if (b.mode === 2) {
          // curved: angular velocity, accelerating speed
          b.ang += b.angVel;
          b.spd += b.accel;
          if (b.maxSpd !== undefined && b.spd > b.maxSpd) b.spd = b.maxSpd;
          if (b.minSpd !== undefined && b.spd < b.minSpd) b.spd = b.minSpd;
          b.vx = Math.cos(b.ang) * b.spd;
          b.vy = Math.sin(b.ang) * b.spd;
        } else if (b.mode === 1) {
          // accelerate along current heading
          b.spd += b.accel;
          if (b.maxSpd !== undefined && b.spd > b.maxSpd) b.spd = b.maxSpd;
          if (b.minSpd !== undefined && b.spd < b.minSpd) b.spd = b.minSpd;
          b.vx = Math.cos(b.ang) * b.spd;
          b.vy = Math.sin(b.ang) * b.spd;
        } else if (b.mode === 3 && player) {
          // gentle homing
          const ta = G.angleTo(b.x, b.y, player.x, player.y);
          b.ang = G.approachAngle(b.ang, ta, b.homing || 0.02);
          b.vx = Math.cos(b.ang) * b.spd;
          b.vy = Math.sin(b.ang) * b.spd;
        }

        b.x += b.vx;
        b.y += b.vy;

        if (b.wa) {
          b.wp += b.wf;
          const perp = b.ang + Math.PI / 2;
          b.x += Math.cos(perp) * Math.sin(b.wp) * b.wa;
          b.y += Math.sin(perp) * Math.sin(b.wp) * b.wa;
        }

        if (b.rotVel) {
          b.rot += b.rotVel;
          if (b.kind === 'knife' || b.kind === 'rice') {
            // orientation follows velocity for these
            b.rot = b.ang + Math.PI / 2 + (b.spinOffset || 0);
            b.spinOffset = (b.spinOffset || 0) + b.rotVel;
          }
        }

        if (b.splitAt && b.t >= b.splitAt) {
          const n = b.splitN || 8;
          const col = b.splitColor >= 0 ? b.splitColor : b.color;
          const spd = b.splitSpd || 2.2;
          for (let k = 0; k < n; k++) {
            this.fire(b.x, b.y, (k / n) * TAU + b.t * 0.01, spd, {
              kind: b.splitKind || 'orb', color: col, r: 3.2, life: 500, tex: b.tex
            });
          }
          b.active = false;
          this.free.push(i);
          continue;
        }

        b.life--;
        if (b.life <= 0) { b.active = false; this.free.push(i); continue; }

        const m = 90;
        if (b.x < G.PF.x - m || b.x > G.PF.x + G.PF.w + m || b.y < G.PF.y - m || b.y > G.PF.y + G.PF.h + m) {
          b.active = false;
          this.free.push(i);
          continue;
        }
        this.count++;
      }
    }

    forEach(fn) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = this.objs[i];
        if (b.active) fn(b, i);
      }
    }

    *active() {
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = this.objs[i];
        if (b.active) yield b;
      }
    }

    clear(fn) {
      let n = 0;
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = this.objs[i];
        if (!b.active) continue;
        b.active = false;
        this.free.push(i);
        n++;
        if (fn && n < 400) fn(b);
      }
      this.count = 0;
      return n;
    }

    draw(ctx, t) {
      const objs = this.objs;
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = objs[i];
        if (!b.active) continue;
        if (b.kind === 'laser') {
          G.Art.drawLaser(ctx, b, t);
        } else {
          if (b.alpha !== 1) {
            ctx.save();
            ctx.globalAlpha = b.alpha;
            G.Art.drawBullet(ctx, b);
            ctx.restore();
          } else {
            G.Art.drawBullet(ctx, b);
          }
        }
      }
    }
  }

  G.BulletManager = BulletManager;
  G.MAX_BULLETS = MAX_BULLETS;

  /* difficulty scaling */
  G.DIFFS = [
    { key: 'easy', name: 'Easy', cn: '简单', color: '#bfe8ff', hp: 0.68, bulletSpeed: 0.86, density: 0.75, bossTime: 1.15, scoreMul: 0.7 },
    { key: 'normal', name: 'Normal', cn: '普通', color: '#7fc8ff', hp: 1.0, bulletSpeed: 1.0, density: 1.0, bossTime: 1.0, scoreMul: 1.0 },
    { key: 'hard', name: 'Hard', cn: '困难', color: '#e9cfa2', hp: 1.28, bulletSpeed: 1.09, density: 1.22, bossTime: 0.94, scoreMul: 1.35 },
    { key: 'lunatic', name: 'Lunatic', cn: '狂气', color: '#fff2d0', hp: 1.55, bulletSpeed: 1.17, density: 1.45, bossTime: 0.9, scoreMul: 1.8 }
  ];
})();
