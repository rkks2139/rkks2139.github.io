/* 睦子米魔人 — stage waves, enemies, items and effects */
(function () {
  'use strict';
  const G = window.G;
  const TAU = G.TAU;
  const PF = G.PF;

  /* ================================================================== */
  /*  particles / effects                                                */
  /* ================================================================== */
  class Effects {
    constructor() {
      this.particles = [];
      this.rings = [];
      this.texts = [];
      this.lasers = [];
    }
    reset() {
      this.particles.length = 0;
      this.rings.length = 0;
      this.texts.length = 0;
    }
    spark(x, y, color, n = 5, spd = 2.2, size = 2.2, life = 24) {
      for (let i = 0; i < n; i++) {
        if (this.particles.length > 700) break;
        const a = Math.random() * TAU;
        const s = spd * (0.4 + Math.random() * 0.8);
        this.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: life * (0.6 + Math.random() * 0.7), maxLife: life,
          size: size * (0.5 + Math.random()), color, drag: 0.94, grav: 0.02
        });
      }
    }
    burst(x, y, color, n = 24, spd = 3.5) {
      for (let i = 0; i < n; i++) {
        if (this.particles.length > 700) break;
        const a = (i / n) * TAU + Math.random() * 0.1;
        const s = spd * (0.5 + Math.random() * 0.8);
        this.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 30 + Math.random() * 30, maxLife: 60,
          size: 1.4 + Math.random() * 2.2, color, drag: 0.96, grav: 0.01
        });
      }
    }
    ring(x, y, color, r0 = 4, r1 = 60, width = 2, life = 26) {
      this.rings.push({ x, y, r: r0, r1, color, width, life, maxLife: life });
    }
    text(x, y, str, color, size = 12) {
      this.texts.push({ x, y, str, color, size, life: 60, maxLife: 60, vy: -0.8 });
    }
    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav;
        p.life--;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.life--;
        r.r += (r.r1 - r.r) * 0.18;
        if (r.life <= 0) this.rings.splice(i, 1);
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.y += t.vy;
        t.life--;
        if (t.life <= 0) this.texts.splice(i, 1);
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        const a = G.clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, TAU);
        ctx.fill();
      }
      for (const r of this.rings) {
        const a = G.clamp(r.life / r.maxLife, 0, 1);
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width * a + 0.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      for (const t of this.texts) {
        const a = G.clamp(t.life / t.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `${t.size}px ${G.Art.SANS}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
        ctx.restore();
      }
    }
  }

  /* ================================================================== */
  /*  items                                                              */
  /* ================================================================== */
  class Item {
    constructor(game, x, y, type) {
      this.game = game;
      this.x = x; this.y = y;
      this.vx = G.rand(-1.1, 1.1);
      this.vy = G.rand(-2.2, -0.6);
      this.type = type;
      this.t = 0;
      this.magnet = false;
      this.dead = false;
      this.phase = Math.random() * TAU;
      this.value = 0;
    }
    update() {
      this.t++;
      const p = this.game.player;
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const magnetR = p.focused ? 78 : 42;
      if (this.magnet || this.t > 26 || d < magnetR) {
        if (d < 170 || this.magnet) {
          const sp = Math.min(13, 3.2 + this.t * 0.12);
          this.x += (dx / d) * sp;
          this.y += (dy / d) * sp;
        }
      } else {
        this.vy += 0.06;
        this.vx *= 0.99;
        this.x += this.vx;
        this.y += this.vy;
      }
      this.x = G.clamp(this.x, PF.x + 6, PF.x + PF.w - 6);
      if (this.y > PF.y + PF.h + 12) this.dead = true;
      if (d < 15 && !p.dead) this.collect();
    }
    collect() {
      if (this.dead) return;
      this.dead = true;
      const p = this.game.player;
      switch (this.type) {
        case 'power':
          this.game.addPower(0.08);
          this.game.addScore(650);
          G.Audio.sfx('power');
          break;
        case 'bigpower':
          this.game.addPower(0.6);
          this.game.addScore(2200);
          G.Audio.sfx('power');
          this.game.effects.text(this.x, this.y - 6, '+POWER', '#ffb0b8', 11);
          break;
        case 'point': {
          const high = this.y < PF.y + 170;
          const val = high ? 2600 : 1250;
          this.game.addScore(val);
          this.game.effects.text(this.x, this.y - 5, G.fmt(val), high ? '#9fe8ff' : '#bcd6ff', 10);
          G.Audio.sfx('item');
          break;
        }
        case 'life':
          p.lives++;
          this.game.addScore(10000);
          G.Audio.sfx('extend');
          this.game.effects.text(this.x, this.y - 8, '1UP', '#ff8fa2', 15);
          this.game.effects.burst(this.x, this.y, '#ff6a80', 22, 3);
          break;
        case 'bomb':
          p.bombs++;
          this.game.addScore(5000);
          G.Audio.sfx('extend');
          this.game.effects.text(this.x, this.y - 8, '+BOMB', '#9fe8ff', 13);
          break;
      }
      this.game.itemsCollected++;
      this.game.effects.spark(this.x, this.y, this.type === 'point' ? '#a8d8ff' : '#ff9aa8', 3, 1.2, 1.6, 12);
    }
    draw(ctx, t) {
      const bob = Math.sin(t * 0.12 + this.phase) * 1.2;
      const x = this.x, y = this.y + bob;
      ctx.save();
      if (this.type === 'power' || this.type === 'bigpower') {
        const big = this.type === 'bigpower';
        const s = big ? 9 : 6.5;
        ctx.shadowColor = 'rgba(92,240,184,0.9)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#12a86c';
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(220,255,235,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - s + 0.5, y - s + 0.5, s * 2 - 1, s * 2 - 1);
        ctx.fillStyle = '#effff7';
        ctx.font = `${big ? 11 : 8}px ${G.Art.SANS}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('P', x, y + 0.5);
        if (big) {
          ctx.strokeStyle = 'rgba(180,255,215,0.55)';
          ctx.beginPath(); ctx.arc(x, y, 13 + Math.sin(t * 0.1) * 2, 0, TAU); ctx.stroke();
        }
      } else if (this.type === 'point') {
        ctx.shadowColor = 'rgba(80,255,190,0.8)';
        ctx.shadowBlur = 7;
        ctx.fillStyle = '#c8ffe4';
        ctx.beginPath();
        ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 4, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x - 1, y - 3, 2, 3);
      } else if (this.type === 'life') {
        ctx.shadowColor = 'rgba(92,240,184,0.95)';
        ctx.shadowBlur = 12;
        G.Art.lifeIcon(ctx, x, y, true, 1.8);
      } else if (this.type === 'bomb') {
        ctx.shadowColor = 'rgba(92,240,184,0.9)';
        ctx.shadowBlur = 12;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#8fffcf'; ctx.fillRect(-4.5, -4.5, 9, 9);
        ctx.fillStyle = '#fff'; ctx.fillRect(-1.8, -1.8, 3.6, 3.6);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /* ================================================================== */
  /*  enemies                                                            */
  /* ================================================================== */
  class Enemy {
    constructor(game, cfg) {
      this.game = game;
      this.x = cfg.x; this.y = cfg.y;
      this.startX = cfg.x; this.startY = cfg.y;
      this.t = 0;
      this.dur = cfg.dur || 280;
      this.hp = cfg.hp || 14;
      this.maxHp = this.hp;
      this.r = cfg.r || 8;
      this.color = cfg.color === undefined ? 0 : cfg.color;
      this.size = cfg.size || 1;
      this.score = cfg.score || 800;
      this.fireType = cfg.fire || 'aimed';
      this.fireInterval = cfg.interval || 64;
      this.fireOffset = cfg.offset || G.randInt(0, 40);
      this.timer = this.fireOffset;
      this.drops = cfg.drops || { power: 1, point: 1 };
      this.flash = 0;
      this.dead = false;
      this.gone = false;
      this.cfg = cfg;
      this.phase = Math.random() * TAU;
      this.stayT = cfg.stayT || 0;
      this.path = cfg.path || null;
      this.big = !!cfg.big;
      this.lastFire = 0;
    }
    update() {
      this.t++;
      if (this.flash > 0) this.flash--;
      if (this.path) this.path(this);
      else {
        this.y += (this.cfg.vy || 0);
        this.x += (this.cfg.vx || 0);
      }
      if (this.y > PF.y + PF.h + 40 || this.y < PF.y - 80 || this.x < PF.x - 90 || this.x > PF.x + PF.w + 90) {
        if (this.t > 30) { this.gone = true; return; }
      }
      if (this.t > this.dur + 120) { this.gone = true; return; }

      // firing
      if (!this.gone) {
        this.timer--;
        if (this.timer <= 0 && this.onScreen()) {
          this.fire();
          this.timer = this.fireInterval;
        }
      }
    }
    onScreen() {
      return this.x > PF.x + 6 && this.x < PF.x + PF.w - 6 && this.y > PF.y - 10 && this.y < PF.y + PF.h - 20;
    }
    fire() {
      const g = this.game, d = g.diff, p = g.player;
      const spd = (this.big ? 2.3 : 2.0) * d.bulletSpeed;
      switch (this.fireType) {
        case 'aimed':
          g.bullets.aimed(this.x, this.y + 4, p, spd, { kind: 'orb', color: this.color, r: this.big ? 4.4 : 3.4 });
          break;
        case 'aimed3':
          g.bullets.aimedFan(this.x, this.y + 4, p, 3, 0.38, spd, { kind: 'rice', color: this.color, r: this.big ? 4.8 : 3.8 });
          break;
        case 'spread5':
          g.bullets.aimedFan(this.x, this.y + 4, p, 5, 0.7, spd * 0.9, { kind: 'orb', color: this.color, r: this.big ? 4.6 : 3.6 });
          break;
        case 'ring':
          g.bullets.ring(this.x, this.y, this.big ? 12 : 8, this.t * 0.03, spd * 0.85, {
            kind: 'orb', color: this.color, r: this.big ? 4.6 : 3.5
          });
          break;
        case 'ringSlow':
          g.bullets.ring(this.x, this.y, 10, this.t * 0.04, spd * 0.6, {
            kind: 'bubble', color: this.color, r: 6, mode: 1, accel: 0.004, maxSpd: 1.8, life: 500
          });
          break;
        case 'none':
        default:
          break;
      }
    }
    hit(dmg) {
      if (this.dead) return;
      this.hp -= dmg;
      this.flash = 3;
      this.game.effects.spark(this.x + G.rand(-4, 4), this.y + G.rand(-4, 4), '#ffe0b0', 1, 1.2, 1.2, 8);
      if (this.hp <= 0) this.die();
    }
    die() {
      if (this.dead) return;
      this.dead = true;
      this.gone = true;
      this.game.addScore(Math.round(this.score * this.game.diff.scoreMul));
      this.game.effects.burst(this.x, this.y, G.COLORS[this.color % G.COLORS.length].mid, this.big ? 26 : 12, this.big ? 3.8 : 2.4);
      this.game.effects.ring(this.x, this.y, 'rgba(255,220,200,0.7)', 2, this.big ? 48 : 26, 2, 20);
      G.Audio.sfx('enemy');
      // drops
      const drops = this.drops || {};
      let dp = drops.power || 0, dpt = drops.point || 0;
      for (let i = 0; i < dp; i++) {
        this.game.items.push(new Item(this.game, this.x + G.rand(-8, 8), this.y + G.rand(-4, 4), 'power'));
      }
      for (let i = 0; i < dpt; i++) {
        this.game.items.push(new Item(this.game, this.x + G.rand(-10, 10), this.y + G.rand(-6, 6), 'point'));
      }
      if (drops.bigpower) this.game.items.push(new Item(this.game, this.x, this.y, 'bigpower'));
      if (drops.life) this.game.items.push(new Item(this.game, this.x, this.y, 'life'));
      if (drops.bomb) this.game.items.push(new Item(this.game, this.x, this.y, 'bomb'));
    }
    draw(ctx, t) {
      if (this.gone) return;
      ctx.save();
      if (this.flash > 0) ctx.globalAlpha = 1;
      G.Art.drawFairy(ctx, this.x, this.y, t, this.color, this.size);
      if (this.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, this.r + 4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (this.big) {
        // small hp bar
        const w = 24;
        const p = G.clamp(this.hp / this.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - w / 2, this.y + 13, w, 2.4);
        ctx.fillStyle = '#ff5a70';
        ctx.fillRect(this.x - w / 2, this.y + 13, w * p, 2.4);
      }
    }
  }

  /* ================================================================== */
  /*  stage                                                              */
  /* ================================================================== */
  class Stage {
    constructor(game) {
      this.game = game;
      this.reset();
    }

    reset() {
      this.time = 0;
      this.events = [];
      this.enemyList = [];
      this.mode = 'normal';
      this.waitT = 0;
      this.midboss = null;
      this.bossStarted = false;
      this.introT = 0;
      this.buildEvents();
    }

    add(t, fn) { this.events.push({ t, fn, fired: false }); }

    buildEvents() {
      this.add(50, () => this.wave1());
      this.add(250, () => this.wave2());
      this.add(455, () => this.wave3());
      this.add(660, () => this.wave4());
      this.add(900, () => this.wave5());
      this.add(1120, () => this.wave6());
      this.add(1340, () => this.wave7());
      this.add(1500, () => this.startMidboss());
      this.add(2320, () => this.wave8());
      this.add(2520, () => this.wave9());
      this.add(2740, () => this.wave10());
      this.add(2960, () => this.startBoss());
      this.events.sort((a, b) => a.t - b.t);
    }

    spawn(cfg) {
      const e = new Enemy(this.game, cfg);
      this.enemyList.push(e);
      return e;
    }

    update() {
      if (this.mode === 'midboss') return;
      if (this.mode === 'boss') return;
      if (this.mode === 'wait') {
        this.waitT--;
        if (this.waitT <= 0) this.mode = 'normal';
        return;
      }

      this.time++;
      for (const ev of this.events) {
        if (!ev.fired && this.time >= ev.t) {
          ev.fired = true;
          ev.fn();
          if (this.mode !== 'normal') break;
        }
      }

      for (let i = this.enemyList.length - 1; i >= 0; i--) {
        const e = this.enemyList[i];
        e.update();
        if (e.gone || e.dead) this.enemyList.splice(i, 1);
      }
    }

    /* ---------------- waves ---------------- */
    wave1() {
      const game = this.game;
      for (let i = 0; i < 6; i++) {
        const sx = PF.x + 74 + i * 47;
        this.spawn({
          x: sx, y: PF.y - 16, hp: 13, r: 7, color: 0, size: 0.95,
          fire: 'aimed', interval: 72, offset: 40 + i * 6,
          drops: { power: 1, point: 1 },
          dur: 300,
          path: (e) => {
            const u = G.clamp(e.t / 260, 0, 1);
            e.x = sx + Math.sin(u * Math.PI * 2 + i) * 14;
            e.y = G.lerp(PF.y - 16, PF.y + PF.h + 20, G.smooth(u));
          }
        });
      }
    }

    wave2() {
      for (let i = 0; i < 4; i++) {
        const fromLeft = i % 2 === 0;
        const y = PF.y + 80 + i * 34;
        const sx = fromLeft ? PF.x - 20 : PF.x + PF.w + 20;
        const ex = fromLeft ? PF.x + PF.w + 40 : PF.x - 40;
        this.spawn({
          x: sx, y, hp: 20, r: 7, color: fromLeft ? 4 : 2, size: 1,
          fire: 'ring', interval: 88, offset: 50,
          drops: { power: 1, point: 2 }, dur: 320,
          path: (e) => {
            const u = G.clamp(e.t / 300, 0, 1);
            e.x = G.lerp(sx, ex, G.smooth(u));
            e.y = y + Math.sin(u * Math.PI * 3) * 22;
          }
        });
      }
    }

    wave3() {
      for (let i = 0; i < 9; i++) {
        const baseX = PF.x + 100 + (i % 3) * 92;
        const d = i * 16;
        this.spawn({
          x: baseX, y: PF.y - 20 - d, hp: 11, r: 6, color: 1, size: 0.9,
          fire: 'aimed3', interval: 78, offset: 30 + i * 5,
          drops: { power: 1, point: 1 }, dur: 260,
          path: (e) => {
            const u = G.clamp(e.t / 240, 0, 1);
            e.y = G.lerp(PF.y - 20 - d, PF.y + PF.h + 30, u);
            e.x = baseX + Math.sin(u * Math.PI * 4 + i * 0.7) * 46;
          }
        });
      }
    }

    wave4() {
      // big fairy + escorts
      this.spawn({
        x: PF.x + PF.w / 2, y: PF.y - 30, hp: 90, r: 12, color: 5, size: 1.7,
        fire: 'spread5', interval: 64, offset: 60,
        drops: { power: 4, point: 4, bigpower: true }, dur: 520, big: true,
        path: (e) => {
          if (e.t < 110) {
            e.y = G.lerp(PF.y - 30, PF.y + 104, G.smooth(e.t / 110));
            e.x = PF.x + PF.w / 2;
          } else if (e.t < 420) {
            e.x = PF.x + PF.w / 2 + Math.sin((e.t - 110) * 0.018) * 70;
            e.y = PF.y + 104 + Math.sin((e.t - 110) * 0.03) * 8;
          } else {
            e.y += 1.8;
            e.x += Math.sin(e.t * 0.02) * 1.2;
          }
        }
      });
      for (const s of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const sx = PF.x + PF.w / 2 + s * (86 + k * 34);
          this.spawn({
            x: sx, y: PF.y - 20 - k * 24, hp: 14, r: 6, color: 5, size: 0.9,
            fire: 'aimed', interval: 80, offset: 55 + k * 8,
            drops: { power: 1, point: 1 }, dur: 300,
            path: (e) => {
              const u = G.clamp(e.t / 280, 0, 1);
              e.x = sx + Math.sin(u * Math.PI * 2) * 18;
              e.y = G.lerp(PF.y - 20 - k * 24, PF.y + PF.h + 24, G.smooth(u));
            }
          });
        }
      }
    }

    wave5() {
      // crossing diagonals
      for (let i = 0; i < 8; i++) {
        const fromLeft = i % 2 === 0;
        const sx = fromLeft ? PF.x - 24 : PF.x + PF.w + 24;
        const sy = PF.y + 20 + (i % 4) * 26;
        const ex = fromLeft ? PF.x + PF.w + 30 : PF.x - 30;
        const ey = PF.y + 260 + (i % 4) * 40;
        this.spawn({
          x: sx, y: sy, hp: 18, r: 7, color: i % 2 ? 3 : 1, size: 1,
          fire: 'aimed3', interval: 72, offset: 45,
          drops: { power: 1, point: 2 }, dur: 330,
          path: (e) => {
            const u = G.clamp(e.t / 300, 0, 1);
            e.x = G.lerp(sx, ex, u);
            e.y = G.lerp(sy, ey, u) + Math.sin(u * Math.PI) * 30;
          }
        });
      }
    }

    wave6() {
      for (let i = 0; i < 7; i++) {
        const baseX = PF.x + 60 + i * 44;
        this.spawn({
          x: baseX, y: PF.y - 20, hp: 24, r: 8, color: 7, size: 1.1,
          fire: 'ringSlow', interval: 96, offset: 55,
          drops: { power: 1, point: 2 }, dur: 380,
          path: (e) => {
            const u = G.clamp(e.t / 340, 0, 1);
            e.x = baseX + Math.sin(u * Math.PI * 2 + i) * 30;
            e.y = G.lerp(PF.y - 20, PF.y + 180, G.smooth(Math.min(1, u * 2))) + Math.max(0, u - 0.5) * 260;
          }
        });
      }
    }

    wave7() {
      for (const [x, c] of [[PF.x + 110, 2], [PF.x + 274, 4]]) {
        this.spawn({
          x, y: PF.y - 26, hp: 55, r: 10, color: c, size: 1.35,
          fire: 'ring', interval: 80, offset: 50, big: true,
          drops: { power: 3, point: 3 }, dur: 400,
          path: (e) => {
            if (e.t < 100) e.y = G.lerp(PF.y - 26, PF.y + 96, G.smooth(e.t / 100));
            else if (e.t < 330) {
              e.y = PF.y + 96 + Math.sin(e.t * 0.04) * 6;
              e.x = x + Math.sin((e.t - 100) * 0.02) * 26;
            } else e.y += 1.6;
          }
        });
      }
    }

    startMidboss() {
      this.mode = 'midboss';
      this.game.effects.text(PF.x + PF.w / 2, PF.y + 200, 'MID BOSS', '#cfeaff', 16);
      this.game.beginMidbossFight();
    }

    onMidbossDefeated() {
      this.mode = 'wait';
      this.waitT = 150;
      this.game.effects.text(PF.x + PF.w / 2, PF.y + 210, 'MIDBOSS CLEAR', '#ffe0b0', 15);
    }

    wave8() {
      for (let i = 0; i < 10; i++) {
        const s = i % 2 === 0 ? 1 : -1;
        const baseX = PF.x + PF.w / 2 + s * (30 + (i % 5) * 34);
        this.spawn({
          x: baseX, y: PF.y - 30 - i * 12, hp: 16, r: 6, color: 0, size: 0.95,
          fire: 'aimed', interval: 66, offset: 35,
          drops: { power: 1, point: 1 }, dur: 300,
          path: (e) => {
            const u = G.clamp(e.t / 280, 0, 1);
            e.y = G.lerp(PF.y - 30 - i * 12, PF.y + PF.h + 30, G.smooth(u));
            e.x = baseX + Math.sin(u * Math.PI * 3 + i) * 38;
          }
        });
      }
    }

    wave9() {
      for (const x of [PF.x + 120, PF.x + 192, PF.x + 264]) {
        this.spawn({
          x, y: PF.y - 30, hp: 60, r: 10, color: 2, size: 1.3, big: true,
          fire: 'spread5', interval: 72, offset: 40,
          drops: { power: 2, point: 3, bomb: x > 200 }, dur: 420,
          path: (e) => {
            if (e.t < 110) e.y = G.lerp(PF.y - 30, PF.y + 90, G.smooth(e.t / 110));
            else if (e.t < 350) {
              e.y = PF.y + 90 + Math.sin(e.t * 0.03) * 8;
              e.x = x + Math.sin(e.t * 0.015) * 40;
            } else e.y += 1.4;
          }
        });
      }
    }

    wave10() {
      for (let i = 0; i < 14; i++) {
        const baseX = PF.x + 50 + (i % 7) * 47;
        this.spawn({
          x: baseX, y: PF.y - 20 - i * 10, hp: 13, r: 6, color: i % 2 ? 1 : 7, size: 0.9,
          fire: 'aimed3', interval: 70, offset: 40,
          drops: { power: 1, point: 1 }, dur: 300,
          path: (e) => {
            const u = G.clamp(e.t / 280, 0, 1);
            e.y = G.lerp(PF.y - 20 - i * 10, PF.y + PF.h + 30, u);
            e.x = baseX + Math.sin(u * Math.PI * 2 + i) * 30;
          }
        });
      }
    }

    startBoss() {
      this.mode = 'boss';
      this.game.beginBossFight();
    }

    draw(ctx, t) {
      for (const e of this.enemyList) e.draw(ctx, t);
    }
  }

  G.Effects = Effects;
  G.Item = Item;
  G.Enemy = Enemy;
  G.Stage = Stage;
})();
