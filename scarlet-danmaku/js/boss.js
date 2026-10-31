/* 睦子米魔人 — bosses, spell cards & danmaku patterns */
(function () {
  'use strict';
  const G = window.G;
  const TAU = G.TAU;
  const PF = G.PF;

  const C = { red: 0, pink: 1, magenta: 2, purple: 3, blue: 4, cyan: 5, green: 6, yellow: 7, orange: 8, white: 9, scarlet: 10, ice: 11 };

  function D(b) { return b.game.diff; }

  /* ================================================================== */
  /*  Remilia phases                                                     */
  /* ================================================================== */

  function remiliaSweep(b, f, amp, yAmp) {
    const tx = PF.x + PF.w / 2 + Math.sin(f * 0.0072) * (amp || 105);
    const ty = PF.y + 108 + Math.sin(f * 0.014 + 1) * (yAmp || 10);
    b.moveTo(tx, ty, 0.035);
  }

  const remiliaPhases = [
    {
      type: 'nonspell',
      name: '碧雾',
      hp: 1500,
      time: 1800,
      color: C.red,
      move(b, f) { remiliaSweep(b, f, 100, 12); },
      attack(b, f) {
        const g = b.game, d = D(b);
        if (f % 42 === 0) {
          g.bullets.aimedFan(b.x, b.y + 12, g.player, 3 + (d.density > 1 ? 2 : 0), 0.52, 2.35 * d.bulletSpeed, {
            kind: 'orb', color: C.red, r: 4.2
          });
        }
        if (f % 96 === 0) {
          const off = f * 0.01;
          const n = Math.round(20 * d.density);
          g.bullets.ring(b.x, b.y + 6, n, off, 1.55, {
            kind: 'rice', color: C.pink, r: 4.6, mode: 1, accel: 0.0026, maxSpd: 2.4, life: 600
          });
        }
        if (f % 210 === 0) {
          g.bullets.aimed(b.x, b.y + 8, g.player, 1.35, {
            kind: 'bubble', color: C.scarlet, r: 11, life: 420,
            splitAt: 95, splitN: Math.round(8 * d.density), splitSpd: 1.7, splitKind: 'orb', splitColor: C.pink
          });
        }
      }
    },
    {
      type: 'spell',
      name: '碧符「千面相」',
      hp: 2400,
      time: 3000,
      color: C.scarlet,
      move(b, f) { remiliaSweep(b, f, 70, 6); },
      attack(b, f) {
        const g = b.game, d = D(b);
        const period = Math.max(34, Math.round(58 - b.game.diffIndex * 5));
        if (f % period === 0) {
          const wave = Math.floor(f / period);
          const n = Math.round(28 * d.density);
          const a0 = wave * 0.34;
          const gap = wave * 0.9 + 0.4;
          for (let i = 0; i < n; i++) {
            const a = a0 + (i / n) * TAU;
            if (Math.abs(G.wrapAngle(a - gap)) < 0.33) continue;
            g.bullets.fire(b.x, b.y + 4, a, 0.7, {
              kind: 'orb', color: wave % 3 === 0 ? C.scarlet : C.red, r: 5.2,
              mode: 1, accel: 0.019, minSpd: 0.7, maxSpd: 2.35 * d.bulletSpeed, life: 520
            });
          }
          G.Audio.sfx('tick');
        }
        if (f % 110 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 3, 0.2, 3.0 * d.bulletSpeed, {
            kind: 'knife', color: C.pink, r: 5.2
          });
        }
        if (d.density > 1.3 && f % 150 === 0) {
          g.bullets.ring(b.x, b.y, 12, -f * 0.02, 1.8, { kind: 'rice', color: C.white, r: 3.6 });
        }
      }
    },
    {
      type: 'nonspell',
      name: '魔人游戏',
      hp: 1750,
      time: 1800,
      color: C.purple,
      move(b, f) {
        const tx = PF.x + PF.w / 2 + Math.sin(f * 0.012) * 120;
        const ty = PF.y + 100 + Math.cos(f * 0.009) * 20;
        b.moveTo(tx, ty, 0.05);
      },
      attack(b, f) {
        const g = b.game, d = D(b);
        if (f % 5 === 0) {
          const side = Math.floor(f / 5) % 2 === 0 ? 1 : -1;
          const base = -Math.PI / 2 + side * 1.15;
          g.bullets.fire(b.x, b.y + 6, base + Math.sin(f * 0.05) * 0.12, 1.7, {
            kind: 'rice', color: side > 0 ? C.purple : C.magenta, r: 4.2,
            mode: 2, angVel: side * 0.019, accel: 0.003, maxSpd: 3.0, life: 700
          });
        }
        if (f % 55 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 5, 0.6, 2.4 * d.bulletSpeed, {
            kind: 'orb', color: C.white, r: 3.4
          });
        }
        if (f % 160 === 0) {
          const n = Math.round(16 * d.density);
          g.bullets.ring(b.x, b.y, n, f * 0.013, 2.15, {
            kind: 'knife', color: C.magenta, r: 5.0, mode: 2, angVel: 0.004, life: 500
          });
        }
      }
    },
    {
      type: 'spell',
      name: '翠符「千影葬」',
      hp: 2600,
      time: 3000,
      color: C.red,
      move(b, f) {
        const tx = PF.x + PF.w / 2 + Math.sin(f * 0.011) * 118;
        b.moveTo(tx, PF.y + 104, 0.045);
      },
      attack(b, f) {
        const g = b.game, d = D(b);
        // continuous fast aimed stream
        if (f % 46 === 0) {
          const a = G.angleTo(b.x, b.y, g.player.x, g.player.y);
          const n = 3;
          for (let i = 0; i < n; i++) {
            g.bullets.fire(b.x, b.y + 10, a + (i - 1) * 0.085, 3.7 * d.bulletSpeed, {
              kind: 'knife', color: C.scarlet, r: 5.0, life: 420
            });
          }
        }
        // horizontal wall with a gap
        if (f % 185 === 90) {
          const fromLeft = Math.floor(f / 185) % 2 === 0;
          const gapY = PF.y + 60 + Math.random() * (PF.h - 140);
          const n = 24;
          for (let i = 0; i < n; i++) {
            const y = PF.y + 22 + i * ((PF.h - 44) / (n - 1));
            if (Math.abs(y - gapY) < 34) continue;
            g.bullets.fire(fromLeft ? PF.x - 16 : PF.x + PF.w + 16, y, fromLeft ? 0 : Math.PI, 2.6 * d.bulletSpeed, {
              kind: 'rice', color: C.red, r: 4.4, life: 400
            });
          }
        }
        if (f % 230 === 0) {
          const n = Math.round(22 * d.density);
          g.bullets.ring(b.x, b.y, n, f * 0.01, 1.5, {
            kind: 'bubble', color: C.pink, r: 9, mode: 1, accel: 0.004, maxSpd: 2.2, life: 600
          });
        }
        if (f % 90 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 2, 0.3, 2.2 * d.bulletSpeed, {
            kind: 'orb', color: C.orange, r: 3.4
          });
        }
      }
    },
    {
      type: 'spell',
      name: '魔枪「碧落贯日」',
      hp: 2800,
      time: 3000,
      color: C.orange,
      move(b, f) {
        b.moveTo(PF.x + PF.w / 2 + Math.sin(f * 0.006) * 46, PF.y + 96, 0.04);
      },
      attack(b, f) {
        const g = b.game, d = D(b);
        if (f % 170 === 0) {
          const a = G.angleTo(b.x, b.y, g.player.x, g.player.y);
          const spread = d.density > 1.2 ? 0.15 : 0;
          const count = d.density > 1.2 ? 3 : 1;
          for (let i = 0; i < count; i++) {
            const off = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
            g.bullets.laser(b.x, b.y + 4, a + off, 720, {
              warn: 78, width: i === Math.floor(count / 2) ? 15 : 9,
              color: i === Math.floor(count / 2) ? C.orange : C.scarlet,
              life: 30
            });
          }
          G.Audio.sfx('laser');
          g.shake(9, 20);
        }
        // small knives rain while charging
        if (f % 9 === 0) {
          const a = -Math.PI / 2 + Math.sin(f * 0.031) * 1.25;
          g.bullets.fire(b.x, b.y + 6, a, 1.8, {
            kind: 'knife', color: C.yellow, r: 3.8, mode: 2, angVel: 0.006, life: 700
          });
        }
        if (f % 95 === 0) {
          const n = Math.round(18 * d.density);
          g.bullets.ring(b.x, b.y, n, f * 0.02, 1.9, {
            kind: 'orb', color: C.red, r: 4.0, mode: 1, accel: 0.003, maxSpd: 2.5, life: 500
          });
        }
        if (f % 260 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 7, 0.8, 2.2 * d.bulletSpeed, {
            kind: 'rice', color: C.orange, r: 4.2
          });
        }
      }
    },
    {
      type: 'spell',
      name: '「睦子米·终焉」',
      hp: 3400,
      time: 3600,
      color: C.scarlet,
      move(b, f) {
        b.moveTo(PF.x + PF.w / 2 + Math.sin(f * 0.005) * 40, PF.y + 100 + Math.sin(f * 0.01) * 8, 0.03);
      },
      attack(b, f) {
        const g = b.game, d = D(b);
        const lowHp = b.hp / b.maxHp < 0.4;
        const arms = lowHp ? 6 : 4;
        const step = lowHp ? 0.075 : 0.095;
        if (f % 4 === 0) {
          const base = f * step;
          const col = (Math.floor(f / 4) % 2) ? C.scarlet : C.magenta;
          for (let k = 0; k < arms; k++) {
            g.bullets.fire(b.x, b.y + 6, base + (k / arms) * TAU, 1.7, {
              kind: 'orb', color: col, r: 4.2,
              mode: 1, accel: 0.006, maxSpd: 2.45 * d.bulletSpeed, life: 800
            });
          }
        }
        if (f % 70 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 5, 0.5, 3.0 * d.bulletSpeed, {
            kind: 'knife', color: C.white, r: 4.4
          });
        }
        if (f % 240 === 0) {
          const n = Math.round(24 * d.density);
          g.bullets.ring(b.x, b.y, n, -f * 0.008, 1.2, {
            kind: 'bubble', color: C.purple, r: 10, mode: 1, accel: 0.0045, maxSpd: 2.0, life: 700
          });
        }
        if (f % 45 === 0) {
          // slow rotating cross of rice bullets
          const a = -f * 0.012;
          for (let k = 0; k < 4; k++) {
            g.bullets.fire(b.x, b.y, a + k * TAU / 4, 1.1, {
              kind: 'rice', color: C.purple, r: 4.0, mode: 2, angVel: 0.012, life: 900
            });
          }
        }
      }
    }
  ];

  /* ================================================================== */
  /*  Cirno phases                                                       */
  /* ================================================================== */
  const cirnoPhases = [
    {
      type: 'nonspell',
      name: '霜结',
      hp: 850,
      time: 1600,
      color: C.cyan,
      move(b, f) {
        b.moveTo(PF.x + PF.w / 2 + Math.sin(f * 0.008) * 100, PF.y + 106 + Math.sin(f * 0.017) * 10, 0.04);
      },
      attack(b, f) {
        const g = b.game, d = D(b);
        if (f % 44 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 5, 0.62, 2.8 * d.bulletSpeed, {
            kind: 'knife', color: C.ice, r: 4.6
          });
        }
        if (f % 105 === 0) {
          const n = Math.round(18 * d.density);
          g.bullets.ring(b.x, b.y, n, f * 0.014, 1.55, {
            kind: 'orb', color: C.blue, r: 4.0, mode: 1, accel: 0.003, maxSpd: 2.2, life: 550
          });
        }
        if (f % 200 === 0) {
          g.bullets.aimed(b.x, b.y + 8, g.player, 1.4, {
            kind: 'bubble', color: C.ice, r: 10, life: 420,
            splitAt: 80, splitN: 8, splitSpd: 1.5, splitKind: 'rice', splitColor: C.cyan
          });
        }
      }
    },
    {
      type: 'spell',
      name: '霜符「六花坠落」',
      hp: 1500,
      time: 2400,
      color: C.ice,
      move(b, f) {
        b.moveTo(PF.x + PF.w / 2 + Math.sin(f * 0.01) * 60, PF.y + 100, 0.03);
      },
      attack(b, f) {
        const g = b.game, d = D(b);
        const period = Math.max(46, Math.round(88 - g.diffIndex * 10));
        if (f % period === 0) {
          const n = 14;
          const gapCenter = PF.x + 40 + Math.random() * (PF.w - 80);
          const gapHalf = 38 - g.diffIndex * 4;
          for (let i = 0; i < n; i++) {
            const x = PF.x + 14 + i * ((PF.w - 28) / (n - 1));
            if (Math.abs(x - gapCenter) < gapHalf) continue;
            g.bullets.fire(x, PF.y + 4, Math.PI / 2, 1.35 + Math.random() * 0.25, {
              kind: 'rice', color: C.ice, r: 4.2, life: 460
            });
          }
        }
        if (f % 105 === 0) {
          g.bullets.aimedFan(b.x, b.y + 8, g.player, 3, 0.45, 2.9 * d.bulletSpeed, {
            kind: 'knife', color: C.cyan, r: 4.4
          });
        }
        if (f % 235 === 0) {
          const n = Math.round(16 * d.density);
          g.bullets.ring(b.x, b.y, n, f * 0.02, 1.8, {
            kind: 'orb', color: C.ice, r: 4.0, mode: 1, accel: 0.004, maxSpd: 2.4, life: 500
          });
        }
      }
    }
  ];

  /* ================================================================== */
  /*  Boss class                                                         */
  /* ================================================================== */
  class Boss {
    constructor(game, config) {
      this.game = game;
      this.config = config;
      this.phases = config.phases.map((p) => Object.assign({}, p));
      this.name = config.name;
      this.title = config.title;
      this.which = config.which;
      this.isMid = !!config.isMid;
      this.x = PF.x + PF.w / 2;
      this.y = PF.y - 60;
      this.tx = this.x;
      this.ty = PF.y + 110;
      this.state = 'intro';
      this.introT = 50;
      this.phaseIndex = -1;
      this.phase = null;
      this.hp = 1;
      this.maxHp = 1;
      this.timeLeft = 0;
      this.maxTime = 1;
      this.attackFrame = 0;
      this.declareT = 0;
      this.endT = 0;
      this.phasePerfect = true;
      this.spellBonus = 0;
      this.spellBonusMax = 0;
      this.flash = 0;
      this.dead = false;
      this.finished = false;
      this.timeout = false;
      this.captured = false;
      this.circleRot = 0;
      this.spawnT = 0;
      this.lastPhase = false;
      this.bulletsOnDeclare = 0;
      this.hitSfxCd = 0;
      this.totalDamage = 0;
    }

    begin() {
      this.state = 'intro';
      this.introT = this.isMid ? 30 : 60;
      this.tx = PF.x + PF.w / 2;
      this.ty = PF.y + 112;
      this.y = PF.y - 50;
      this.x = this.tx;
    }

    moveTo(tx, ty, k) {
      this.tx = tx;
      this.ty = ty;
    }

    startPhase(index) {
      if (index >= this.phases.length) {
        this.dead = true;
        this.state = 'end';
        this.endT = 30;
        return;
      }
      this.phaseIndex = index;
      this.phase = this.phases[index];
      const d = this.game.diff;
      this.maxHp = Math.round(this.phase.hp * d.hp * (this.isMid ? 0.95 : 1));
      this.hp = this.maxHp;
      this.maxTime = Math.round(this.phase.time * (this.phase.type === 'spell' ? d.bossTime : 1));
      this.timeLeft = this.maxTime;
      this.attackFrame = 0;
      this.phasePerfect = true;
      this.timeout = false;
      this.captured = false;
      this.lastPhase = index === this.phases.length - 1;
      this.state = 'declare';
      this.declareT = this.phase.type === 'spell' ? 96 : 46;
      this.spellBonus = this.phase.type === 'spell' ? Math.round((1800000 + index * 260000) * this.game.diff.scoreMul) : 0;
      this.spellBonusMax = this.spellBonus;
      this.pat = {};
      this.game.onPhaseStart(this.phase, this);
    }

    notifyPlayerHit() {
      this.phasePerfect = false;
    }

    update() {
      const t = this.game.t;
      this.spawnT++;
      if (this.flash > 0) this.flash--;
      if (this.hitSfxCd > 0) this.hitSfxCd--;
      this.circleRot += 0.008;

      if (this.state === 'intro') {
        this.introT--;
        this.x = G.lerp(this.x, this.tx, 0.06);
        this.y = G.lerp(this.y, this.ty, 0.06);
        if (this.introT <= 0) this.startPhase(0);
        return;
      }

      if (this.state === 'declare') {
        this.declareT--;
        this.x = G.lerp(this.x, this.tx, 0.05);
        this.y = G.lerp(this.y, this.ty, 0.05);
        if (this.declareT <= 0) {
          this.state = 'fight';
          this.attackFrame = 0;
        }
        return;
      }

      if (this.state === 'fight') {
        this.attackFrame++;
        this.timeLeft--;
        if (this.phase.move) this.phase.move(this, this.attackFrame);
        this.x = G.lerp(this.x, this.tx, 0.06);
        this.y = G.lerp(this.y, this.ty, 0.06);
        // keep on screen
        this.x = G.clamp(this.x, PF.x + 36, PF.x + PF.w - 36);
        this.y = G.clamp(this.y, PF.y + 50, PF.y + 170);
        if (this.phase.attack) this.phase.attack(this, this.attackFrame);
        if (this.phase.type === 'spell' && this.spellBonus > 0) {
          this.spellBonus = Math.max(0, this.spellBonus - this.spellBonusMax / this.maxTime);
        }
        if (this.hp <= 0) {
          this.endPhase(false);
        } else if (this.timeLeft <= 0) {
          this.endPhase(true);
        }
        return;
      }

      if (this.state === 'end') {
        this.endT--;
        this.x = G.lerp(this.x, this.tx, 0.04);
        this.y = G.lerp(this.y, this.ty, 0.04);
        if (this.endT <= 0) {
          if (this.dead) {
            this.finished = true;
            this.game.onBossDefeated(this);
          } else {
            this.startPhase(this.phaseIndex + 1);
          }
        }
        return;
      }

      if (this.state === 'dying') {
        this.spawnT++;
        if (this.spawnT > 90) this.finished = true;
      }
    }

    endPhase(timeout) {
      if (this.state !== 'fight') return;
      this.state = 'end';
      this.endT = 76;
      this.timeout = timeout;
      if (timeout) this.phasePerfect = false;
      this.captured = !timeout && this.phasePerfect && this.phase.type === 'spell';
      const captureBonus = this.captured ? Math.round(this.spellBonus) : 0;
      if (this.captured) {
        this.game.addScore(captureBonus);
        this.game.spellsCaptured++;
        this.game.onCapture(this.phase, captureBonus);
      }
      if (timeout) this.game.onTimeout(this.phase);
      this.game.onPhaseEnd(this.phase, {
        timeout, captured: this.captured, bonus: captureBonus
      });
      this.game.clearBullets(true);
      this.game.spawnBossItems(this.x, this.y, this.lastPhase ? 18 : 10);
      if (this.lastPhase) {
        this.dead = true;
        this.game.onBossDying(this);
      }
      this.game.shake(6, 16);
    }

    damage(amount) {
      if (this.state !== 'fight') return;
      this.hp -= amount;
      this.totalDamage += amount;
      this.flash = 3;
      if (this.hitSfxCd <= 0) {
        this.hitSfxCd = 5;
        this.game.sparkAt(this.x + G.rand(-12, 12), this.y + G.rand(-10, 10), '#ffd9a0', 1);
      }
    }

    draw(ctx, t) {
      if (this.finished) return;
      const isSpell = this.phase && this.phase.type === 'spell';
      // spell circle
      if (isSpell && this.state !== 'end') {
        drawSpellCircle(ctx, this.x, this.y, t, this.circleRot, this.phase.color);
      }
      if (this.state === 'declare' && isSpell) {
        const k = 1 - this.declareT / 96;
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.2);
        ctx.strokeStyle = 'rgba(255,80,90,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30 + k * 18, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      G.Art.drawBossAura(ctx, this.x, this.y, t, this.phase ? this.phase.color : 0);
      G.Art.drawBoss(ctx, this.x, this.y, t, this.which, { aura: isSpell ? 1 : 0.5 });
      if (this.flash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.30;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 8, 27, 33, 0, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = '#ffdcc8';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 8, 27, 33, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawSpellCircle(ctx, x, y, t, rot, ci) {
    const col = G.COLORS[ci % G.COLORS.length];
    ctx.save();
    ctx.translate(x, y - 4);
    ctx.globalCompositeOperation = 'lighter';
    ctx.scale(1, 0.62);
    ctx.rotate(rot);
    for (let i = 0; i < 3; i++) {
      const r = 34 + i * 9;
      ctx.strokeStyle = `rgba(${G.hexToRgb(col.mid).join(',')},${0.22 - i * 0.05})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    }
    // runes / ticks
    ctx.strokeStyle = `rgba(${G.hexToRgb(col.mid).join(',')},0.30)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r0 = 46, r1 = i % 3 === 0 ? 54 : 50;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.rotate(-rot * 2.2);
    ctx.strokeStyle = `rgba(${G.hexToRgb(col.mid).join(',')},0.20)`;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * TAU;
      const px = Math.cos(a) * 40, py = Math.sin(a) * 40;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  const CONFIG = {
    remilia: {
      name: '睦子米魔人',
      title: '碧之魔人',
      which: 'remilia',
      phases: remiliaPhases,
      isMid: false
    },
    cirno: {
      name: '霜见',
      title: '碧湖的霜精',
      which: 'cirno',
      phases: cirnoPhases,
      isMid: true
    }
  };

  CONFIG.mutsumi = CONFIG.remilia;
  G.Boss = Boss;
  G.BOSS_CONFIG = CONFIG;
  G.BOSS_COLORS = C;
})();
