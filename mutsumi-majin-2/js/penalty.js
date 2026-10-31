/* 睦子米魔人 II — 中弹惩罚 midboss：睦子米魔人（加班中） */
(function () {
  'use strict';
  const G = window.G;
  const PF = G.PF;
  const TAU = G.TAU;

  class PenaltyBoss {
    constructor(game, slot) {
      this.game = game;
      this.slot = slot || 0;
      this.maxHp = 430 + game.diffIndex * 90;
      this.hp = this.maxHp;
      this.phase = G.rand(0, TAU);
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.baseX = PF.x + 94 + (this.slot % 3) * 98;
      this.baseY = PF.y + 194 + (this.slot % 2) * 14;
      this.x = this.baseX;
      this.y = this.baseY;
      this.t = 0;
      this.spawnT = 44;
      this.flash = 0;
      this.dead = false;
      this.bubble = 170;
      this.label = '睦子米魔人 · 加班中';
    }

    update() {
      this.t++;
      if (this.bubble > 0) this.bubble--;
      if (this.flash > 0) this.flash--;
      this.x = this.baseX + Math.sin(this.t * 0.015 + this.phase) * 22;
      this.y = this.baseY + Math.sin(this.t * 0.033 + this.phase) * 5;
      if (this.spawnT > 0) {
        this.spawnT--;
        return;
      }
      const g = this.game;
      if (!g || g.state !== 'play') return;
      if (this.t % 76 === 0) {
        g.bullets.aimedFan(this.x, this.y + 20, g.player, 3, 0.38, 2.05, {
          kind: 'orb', color: 8, r: 4.0, tex: 1, life: 620
        });
      }
      if (this.t % 164 === 42) {
        g.bullets.ring(this.x, this.y + 8, 14, this.t * 0.028, 1.55, {
          kind: 'rice', color: 9, r: 3.8, tex: 1, life: 700
        });
      }
      if (this.t % 236 === 120) {
        g.bullets.aimedFan(this.x, this.y + 22, g.player, 5, 0.55, 1.25, {
          kind: 'bubble', color: 8, r: 5.4, tex: 1, life: 760
        });
      }
    }

    damage(n) {
      if (this.dead || this.spawnT > 0) return;
      this.hp -= n;
      this.flash = 4;
      if (this.hp <= 0) this.die();
    }

    die() {
      if (this.dead) return;
      this.dead = true;
      const g = this.game;
      g.addScore(30000);
      g.effects.burst(this.x, this.y, '#e6d7b6', 28, 3.2);
      g.effects.ring(this.x, this.y, 'rgba(129,197,246,0.9)', 5, 90, 2, 26);
      g.effects.text(this.x, this.y - 18, '下班！', '#f8e4b7', 12);
      for (let i = 0; i < 4; i++) {
        g.items.push(new G.Item(g, this.x + G.rand(-18, 18), this.y + G.rand(-8, 8), 'point'));
      }
      G.Audio.sfx('enemy');
    }

    draw(ctx, t) {
      const img = G.Art.getImage('mutsumi');
      const ready = G.Art.imageReady('mutsumi');
      const r = 23;
      const spawn = this.spawnT > 0 ? 1 - this.spawnT / 44 : 1;
      ctx.save();
      ctx.globalAlpha = G.clamp(spawn, 0, 1);
      // aura
      ctx.globalCompositeOperation = 'lighter';
      const ag = ctx.createRadialGradient(this.x, this.y, 8, this.x, this.y, 56);
      ag.addColorStop(0, 'rgba(243,223,181,0.34)');
      ag.addColorStop(0.55, 'rgba(120,190,245,0.14)');
      ag.addColorStop(1, 'rgba(20,67,100,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(this.x, this.y, 56, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // rotating triangle warning ring
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(t * 0.01);
      ctx.strokeStyle = 'rgba(129,197,246,0.35)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const a0 = -Math.PI / 2 + k * TAU / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a0) * (r + 8), Math.sin(a0) * (r + 8));
        ctx.lineTo(Math.cos(a0 + TAU / 3) * (r + 8), Math.sin(a0 + TAU / 3) * (r + 8));
        ctx.stroke();
      }
      ctx.restore();

      // avatar medallion
      ctx.save();
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.clip();
      ctx.fillStyle = '#0a1924';
      ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
      if (ready && img) {
        const iw = img.width, ih = img.height;
        const ss = Math.min(iw * 0.78, ih * 0.62);
        ctx.drawImage(img, (iw - ss) / 2, Math.max(0, ih * 0.12), ss, ss, this.x - r, this.y - r, r * 2, r * 2);
        ctx.fillStyle = 'rgba(20,60,100,0.18)';
        ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
      } else {
        ctx.fillStyle = '#2f83bf';
        ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.7, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = this.flash > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(92,178,240,0.85)';
      ctx.lineWidth = this.flash > 0 ? 2.4 : 1.4;
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(243,237,222,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(this.x, this.y, r + 4, 0, TAU); ctx.stroke();

      // label + hp
      G.Art.text(ctx, this.label, this.x, this.y - r - 17, 8, 'rgba(255,246,226,0.94)', 'center', G.Art.SANS, '700');
      const bw = 58, bh = 4, bx = this.x - bw / 2, by = this.y + r + 6;
      ctx.fillStyle = 'rgba(3,17,27,0.8)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(243,223,181,0.95)';
      ctx.fillRect(bx, by, bw * G.clamp(this.hp / this.maxHp, 0, 1), bh);
      ctx.strokeStyle = 'rgba(233,221,192,0.35)';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);

      // speech bubble when it appears
      if (this.bubble > 0) {
        const a = G.clamp(Math.min(this.bubble / 30, (170 - this.bubble) / 14), 0, 1);
        ctx.globalAlpha = a;
        const text = '加班费结一下。';
        ctx.font = '600 8px ' + G.Art.SANS;
        const tw = ctx.measureText(text).width + 12;
        const bx2 = this.x + 18, by2 = this.y - 28;
        ctx.beginPath(); ctx.roundRect(bx2, by2, tw, 16, 8);
        ctx.fillStyle = 'rgba(3,17,28,0.88)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(243,223,181,0.45)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        G.Art.text(ctx, text, bx2 + tw / 2, by2 + 8.5, 8, 'rgba(246,241,229,0.92)', 'center', G.Art.SANS, '600');
      }
      ctx.restore();
    }
  }

  G.PenaltyBoss = PenaltyBoss;
})();
