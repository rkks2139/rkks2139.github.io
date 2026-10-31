/* 睦子米魔人 — player, shots, bombs */
(function () {
  'use strict';
  const G = window.G;
  const TAU = G.TAU;
  const PF = G.PF;

  const HITBOX = 2.2;

  class Player {
    constructor(game) {
      this.game = game;
      this.reset(true);
    }

    reset(full) {
      this.x = PF.x + PF.w / 2;
      this.y = PF.y + PF.h - 64;
      this.nx = this.x; this.ny = this.y;
      this.lives = this.game.diffIndex === 0 ? 4 : 3;
      this.bombs = 3;
      this.power = 1.0;
      this.graze = 0;
      this.focused = false;
      this.invuln = 90;
      this.dead = false;
      this.deadTimer = 0;
      this.bombTime = 0;
      this.bombCooldown = 0;
      this.shotCd = 0;
      this.optCd = 0;
      this.tilt = 0;
      this.flash = 0;
      this.shots = [];
      this.shotCount = 0;
      this.optionPhase = 0;
      this.autoFire = true;
      this.spawnGlow = 30;
    }

    get hitR() { return HITBOX; }

    update(input, game) {
      if (this.dead) {
        this.deadTimer--;
        if (this.deadTimer <= 0) this.respawn(game);
        return;
      }
      if (this.invuln > 0) this.invuln--;
      if (this.spawnGlow > 0) this.spawnGlow--;
      if (this.bombTime > 0) {
        this.bombTime--;
        this.invuln = Math.max(this.invuln, 2);
        if (this.bombTime === 130) game.bombBlast();
        if (this.bombTime === 60) game.bombBlast();
      }
      if (this.bombCooldown > 0) this.bombCooldown--;
      if (this.flash > 0) this.flash--;

      this.focused = input.isDown('focus') || input.gp.focus || !!(game.touch && game.touch.focus);
      const speed = this.focused ? 1.85 : 4.35;
      let ax = 0, ay = 0;

      if (game.touch && game.touch.active) {
        const tx = game.touch.x, ty = game.touch.y;
        const dx = tx - this.x, dy = ty - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 1.5) {
          const sp = Math.min(speed, d * 0.55);
          ax = (dx / d) * sp;
          ay = (dy / d) * sp;
        }
      } else {
        const v = input.axis();
        ax = v.x * speed;
        ay = v.y * speed;
      }

      this.x += ax;
      this.y += ay;
      this.tilt = G.lerp(this.tilt, ax / Math.max(1, speed), 0.18);

      const pad = 9;
      this.x = G.clamp(this.x, PF.x + pad, PF.x + PF.w - pad);
      this.y = G.clamp(this.y, PF.y + pad + 4, PF.y + PF.h - pad);

      // options (orbiting display)
      this.optionPhase += 0.05;

      // auto-collect items at the top when focused
      if (this.focused && this.y < PF.y + 92) {
        game.collectAllItems();
      }

      // shooting
      const wantShoot = this.autoFire || input.isDown('shoot') || input.gp.shoot || !!(game.touch && (game.touch.active || game.touch.enabled));
      if (this.shotCd > 0) this.shotCd--;
      if (this.optCd > 0) this.optCd--;
      if (wantShoot && this.shotCd <= 0 && game.state === 'play') {
        this.fireMain();
        this.shotCd = 4;
        if (this.shotCount % 3 === 0) G.Audio.sfx('shot');
      }
      if (wantShoot && this.optCd <= 0 && game.state === 'play') {
        this.fireOptions();
        this.optCd = 9;
      }

      // bomb
      if (input.consume('bomb') && this.bombs > 0 && this.bombCooldown <= 0) {
        this.doBomb(game);
      }

      // update shots
      const target = game.getPlayerTarget();
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i];
        s.t++;
        if (s.homing && target) {
          const ta = G.angleTo(s.x, s.y, target.x, target.y);
          s.ang = G.approachAngle(s.ang, ta, 0.075);
        }
        s.x += Math.cos(s.ang) * s.spd;
        s.y += Math.sin(s.ang) * s.spd;
        if (s.y < PF.y - 20 || s.x < PF.x - 20 || s.x > PF.x + PF.w + 20 || s.t > 150) {
          this.shots.splice(i, 1);
        }
      }
      this.shotCount++;
    }

    fireMain() {
      const p = this.power;
      const mainCount = 2 + (p >= 2 ? 1 : 0) + (p >= 4 ? 1 : 0);
      const spread = this.focused ? 0.010 : 0.042;
      for (let i = 0; i < mainCount; i++) {
        const off = mainCount === 1 ? 0 : (i / (mainCount - 1) - 0.5);
        const ang = -Math.PI / 2 + off * spread * (mainCount - 1);
        this.shots.push({
          x: this.x + off * 7, y: this.y - 12, ang, spd: 15.5,
          type: 'needle', dmg: 2.4, t: 0, homing: false
        });
      }
    }

    fireOptions() {
      const target = this.game.getPlayerTarget();
      const side = this.focused ? 9 : 15;
      for (const s of [-1, 1]) {
        this.shots.push({
          x: this.x + s * side, y: this.y - 4,
          ang: -Math.PI / 2 + (this.focused ? 0 : s * 0.03),
          spd: 8.6, type: 'ofuda', dmg: 1.9, t: 0, homing: !this.focused && !!target
        });
      }
    }

    doBomb(game) {
      this.bombs--;
      this.bombTime = 180;
      this.bombCooldown = 20;
      this.invuln = Math.max(this.invuln, 190);
      game.onBomb();
    }

    hit(game) {
      if (this.invuln > 0 || this.dead || this.bombTime > 0) return false;
      this.die(game);
      return true;
    }

    die(game) {
      this.lives--;
      this.dead = true;
      this.deadTimer = 34;
      this.invuln = 200;
      this.power = Math.max(0, this.power - 1.0);
      this.bombs = Math.min(this.bombs, 2);
      this.shots.length = 0;
      game.onPlayerDeath();
    }

    respawn(game) {
      this.dead = false;
      this.x = PF.x + PF.w / 2;
      this.y = PF.y + PF.h - 70;
      this.invuln = 190;
      this.bombTime = 0;
      this.spawnGlow = 30;
      if (this.lives < 0) game.gameOver();
    }

    bombClearRadius() {
      return 210;
    }

    draw(ctx, t) {
      if (this.dead) return;
      if (this.invuln > 0 && this.spawnGlow <= 0 && this.bombTime === 0 && Math.floor(t / 4) % 2 === 0) return;

      // options
      const side = this.focused ? 9 : 15;
      const oy = this.focused ? -2 : 2;
      for (const s of [-1, 1]) {
        const bob = Math.sin(this.optionPhase + (s > 0 ? Math.PI : 0)) * 1.6;
        G.Art.drawOption(ctx, this.x + s * side, this.y + oy + bob, t, this.focused);
      }

      // bomb aura
      if (this.bombTime > 0) {
        const p = 1 - this.bombTime / 180;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const r = 20 + p * 160 + i * 18;
          const a = (1 - p) * 0.35 * (1 - i * 0.25);
          ctx.strokeStyle = `rgba(255,${140 + i * 30},${160 + i * 30},${a})`;
          ctx.lineWidth = 2.5 - i * 0.5;
          ctx.beginPath();
          ctx.arc(this.x, this.y, r + Math.sin(t * 0.1 + i) * 4, 0, TAU);
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, 40);
        g.addColorStop(0, 'rgba(255,220,220,0.55)');
        g.addColorStop(1, 'rgba(255,60,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, 40, 0, TAU); ctx.fill();
        ctx.restore();
      }

      G.Art.drawPlayer(ctx, this.x, this.y, t, {
        focus: this.focused,
        tilt: this.tilt,
        invuln: this.invuln
      });

      // shots
      for (const s of this.shots) {
        const spr = G.Art.shot(s.type);
        const size = s.type === 'needle' ? 22 : 15;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.ang + Math.PI / 2);
        if (s.type === 'ofuda') {
          ctx.globalCompositeOperation = 'lighter';
        }
        ctx.drawImage(spr, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
    }
  }

  G.Player = Player;
  G.HITBOX = HITBOX;
})();
