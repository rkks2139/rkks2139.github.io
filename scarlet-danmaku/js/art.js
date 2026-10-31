/* 睦子米魔人 — all visuals are procedurally drawn. No external assets. */
(function () {
  'use strict';
  const G = window.G;
  const TAU = G.TAU;

  const Art = (G.Art = {});
  const bulletCache = new Map();
  const shotCache = new Map();
  let bgCanvas = null, bgBoss = null;
  let portraitCache = {};
  let bulletImg = null;
  let imgReady = false;

  /* ------------------------------------------------------------------ */
  /*  helpers                                                            */
  /* ------------------------------------------------------------------ */
  function radial(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (const [p, c] of stops) g.addColorStop(p, c);
    return g;
  }
  function rgbStr(hex, a) {
    const [r, g, b] = G.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  function ell(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  }
  Art.ell = ell;
  Art.radial = radial;

  /* ------------------------------------------------------------------ */
  /*  bullets                                                            */
  /* ------------------------------------------------------------------ */
  const BASE = 128;
  const CORE = 20;

  function makeBullet(kind, ci) {
    const c = G.canvas(BASE, BASE);
    const x = c.getContext('2d');
    const col = G.COLORS[ci % G.COLORS.length];
    const mid = col.mid;
    x.translate(BASE / 2, BASE / 2);
    x.globalCompositeOperation = 'lighter';

    if (kind === 'rice' || kind === 'knife' || kind === 'star' || kind === 'bubble' || kind === 'ring' || kind === 'big') {
      // outer glow
      const glow = x.createRadialGradient(0, 0, 2, 0, 0, 60);
      glow.addColorStop(0, rgbStr(mid, 0.38));
      glow.addColorStop(0.4, rgbStr(mid, 0.17));
      glow.addColorStop(1, rgbStr(mid, 0));
      x.fillStyle = glow;
      if (kind === 'rice') { ell(x, 0, 0, 34, 52); x.fill(); }
      else if (kind === 'knife') { ell(x, 0, 0, 26, 58); x.fill(); }
      else if (kind === 'bubble') { ell(x, 0, 0, 56, 56); x.fill(); }
      else if (kind === 'big') { ell(x, 0, 0, 60, 60); x.fill(); }
      else { ell(x, 0, 0, 44, 44); x.fill(); }
    }

    if (kind === 'orb' || kind === 'big') {
      const R = kind === 'big' ? 26 : 20;
      const glow = x.createRadialGradient(0, 0, 2, 0, 0, 58);
      glow.addColorStop(0, rgbStr(mid, 0.34));
      glow.addColorStop(0.45, rgbStr(mid, 0.14));
      glow.addColorStop(1, rgbStr(mid, 0));
      x.fillStyle = glow;
      ell(x, 0, 0, 58, 58); x.fill();

      const body = x.createRadialGradient(-R * 0.25, -R * 0.3, 1, 0, 0, R);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.28, col.core);
      body.addColorStop(0.62, mid);
      body.addColorStop(1, rgbStr(mid, 0.82));
      x.fillStyle = body;
      ell(x, 0, 0, R, R); x.fill();

      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineWidth = 1.6;
      ell(x, 0, 0, R - 1, R - 1); x.stroke();

      x.fillStyle = 'rgba(255,255,255,0.95)';
      ell(x, -R * 0.32, -R * 0.34, R * 0.3, R * 0.24, -0.6); x.fill();
    } else if (kind === 'rice') {
      const body = x.createRadialGradient(-3, -4, 1, 0, 0, 26);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.35, col.core);
      body.addColorStop(0.75, mid);
      body.addColorStop(1, rgbStr(mid, 0.9));
      x.save(); x.scale(0.58, 1);
      x.fillStyle = body;
      x.beginPath(); x.arc(0, 0, 23, 0, TAU); x.fill();
      x.restore();
      x.strokeStyle = 'rgba(255,255,255,0.85)';
      x.lineWidth = 1.4;
      x.save(); x.scale(0.58, 1);
      x.beginPath(); x.arc(0, 0, 22, 0, TAU); x.stroke();
      x.restore();
      x.fillStyle = 'rgba(255,255,255,0.95)';
      ell(x, -3, -10, 4, 7); x.fill();
    } else if (kind === 'knife') {
      x.beginPath();
      x.moveTo(0, -42);
      x.quadraticCurveTo(8, -12, 7, 8);
      x.lineTo(0, 30);
      x.lineTo(-7, 8);
      x.quadraticCurveTo(-8, -12, 0, -42);
      const g = x.createLinearGradient(0, -42, 0, 30);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.3, col.core);
      g.addColorStop(0.62, mid);
      g.addColorStop(1, rgbStr(mid, 0.75));
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.7)';
      x.lineWidth = 1.2;
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.8)';
      x.beginPath(); x.moveTo(0, -34); x.lineTo(2, 0); x.lineTo(-2, 0); x.closePath(); x.fill();
    } else if (kind === 'star') {
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 30 : 12;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
      const g = x.createRadialGradient(0, 0, 2, 0, 0, 30);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, col.core);
      g.addColorStop(0.8, mid);
      g.addColorStop(1, rgbStr(mid, 0.7));
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.8)';
      x.lineWidth = 1.4;
      x.stroke();
    } else if (kind === 'bubble') {
      const R = 34;
      const fill = x.createRadialGradient(-R * 0.3, -R * 0.3, 2, 0, 0, R);
      fill.addColorStop(0, 'rgba(255,255,255,0.22)');
      fill.addColorStop(0.75, rgbStr(mid, 0.20));
      fill.addColorStop(1, rgbStr(mid, 0.5));
      x.fillStyle = fill;
      ell(x, 0, 0, R, R); x.fill();
      x.strokeStyle = rgbStr(mid, 0.95);
      x.lineWidth = 5;
      ell(x, 0, 0, R, R); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.95)';
      x.lineWidth = 1.6;
      ell(x, 0, 0, R - 3.5, R - 3.5); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.6)';
      x.lineWidth = 2;
      x.beginPath(); x.arc(0, 0, R - 10, Math.PI * 1.08, Math.PI * 1.55); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.35)';
      ell(x, -R * 0.35, -R * 0.38, 6, 4, -0.7); x.fill();
    } else if (kind === 'ring') {
      x.strokeStyle = rgbStr(mid, 0.9);
      x.lineWidth = 6;
      ell(x, 0, 0, 32, 32); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineWidth = 1.6;
      ell(x, 0, 0, 30, 30); x.stroke();
    }

    x.globalCompositeOperation = 'source-over';
    return c;
  }

  function shapePath(x, kind, k) {
    k = k || 1;
    x.beginPath();
    if (kind === 'rice') {
      x.ellipse(0, 0, 13 * k, 27 * k, 0, 0, TAU);
    } else if (kind === 'knife') {
      x.moveTo(0, -40 * k);
      x.quadraticCurveTo(9 * k, -12 * k, 6 * k, 10 * k);
      x.lineTo(0, 30 * k);
      x.lineTo(-6 * k, 10 * k);
      x.quadraticCurveTo(-9 * k, -12 * k, 0, -40 * k);
      x.closePath();
    } else if (kind === 'star') {
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0 ? 29 : 12) * k;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
    } else if (kind === 'big') {
      x.arc(0, 0, 27 * k, 0, TAU);
    } else if (kind === 'bubble') {
      x.arc(0, 0, 30 * k, 0, TAU);
    } else if (kind === 'ring') {
      x.arc(0, 0, 30 * k, 0, TAU);
    } else {
      x.arc(0, 0, 21 * k, 0, TAU);
    }
  }

  function makeImageBullet(kind, ci) {
    const c = G.canvas(BASE, BASE);
    const x = c.getContext('2d');
    const col = G.COLORS[ci % G.COLORS.length];
    const mid = col.mid;
    x.translate(BASE / 2, BASE / 2);

    // halo
    x.globalCompositeOperation = 'lighter';
    const glow = x.createRadialGradient(0, 0, 4, 0, 0, 60);
    glow.addColorStop(0, rgbStr(mid, 0.34));
    glow.addColorStop(0.45, rgbStr(mid, 0.15));
    glow.addColorStop(1, rgbStr(mid, 0));
    x.fillStyle = glow;
    x.beginPath(); x.arc(0, 0, 60, 0, TAU); x.fill();
    x.globalCompositeOperation = 'source-over';

    // image clipped into the bullet shape
    x.save();
    shapePath(x, kind, 1);
    x.clip();
    x.globalAlpha = 0.88;
    x.drawImage(bulletImg, 0, 0, bulletImg.width, bulletImg.height, -31, -37, 62, 74);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = rgbStr(mid, kind === 'knife' || kind === 'rice' ? 0.34 : 0.30);
    x.fillRect(-64, -64, 128, 128);
    x.fillStyle = 'rgba(0,20,12,0.16)';
    x.fillRect(-64, 18, 128, 46);
    x.restore();

    // rim
    x.strokeStyle = rgbStr(mid, 0.95);
    x.lineWidth = kind === 'knife' ? 1.6 : 2.2;
    shapePath(x, kind, 1);
    x.stroke();
    x.strokeStyle = 'rgba(235,255,245,0.75)';
    x.lineWidth = 0.9;
    shapePath(x, kind, 0.94);
    x.stroke();

    if (kind === 'bubble') {
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgbStr(mid, 0.55);
      x.lineWidth = 5;
      shapePath(x, 'bubble', 1.12);
      x.stroke();
      x.globalCompositeOperation = 'source-over';
    }
    if (kind === 'big') {
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgbStr(mid, 0.4);
      x.lineWidth = 1.5;
      x.beginPath(); x.arc(0, 0, 34, 0, TAU); x.stroke();
      x.globalCompositeOperation = 'source-over';
    }
    return c;
  }

  function makeImagePortrait(img) {
    const c = G.canvas(300, 360);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#0b2a1c');
    g.addColorStop(1, '#04120c');
    x.fillStyle = g;
    x.fillRect(0, 0, 300, 360);
    x.drawImage(img, 0, 0, img.width, img.height, 0, -8, 300, 376);
    const tint = x.createLinearGradient(0, 0, 0, 360);
    tint.addColorStop(0, 'rgba(20,120,80,0.04)');
    tint.addColorStop(0.7, 'rgba(4,30,20,0.18)');
    tint.addColorStop(1, 'rgba(3,18,12,0.88)');
    x.fillStyle = tint;
    x.fillRect(0, 0, 300, 360);
    x.globalAlpha = 0.12;
    x.fillStyle = '#7dffd0';
    for (let y = 0; y < 360; y += 4) x.fillRect(0, y, 300, 1);
    x.globalAlpha = 1;
    return c;
  }

  Art.bullet = function (kind, ci) {
    const key = (imgReady ? 'img_' : '') + kind + '_' + ci;
    let c = bulletCache.get(key);
    if (!c) {
      c = imgReady ? makeImageBullet(kind, ci) : makeBullet(kind, ci);
      bulletCache.set(key, c);
    }
    return c;
  };

  Art.BULLET_BASE = BASE;
  Art.BULLET_CORE = CORE;

  Art.drawBullet = function (ctx, b) {
    const spr = Art.bullet(b.kind, b.color);
    const visMul = b.kind === 'bubble' ? 1.12 : (b.kind === 'big' ? 1.18 : 1.38);
    const scale = (b.r / CORE) * visMul;
    const s = BASE * scale;
    if (b.kind === 'orb' || b.kind === 'bubble' || b.kind === 'big') {
      ctx.drawImage(spr, b.x - s / 2, b.y - s / 2, s, s);
    } else {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(spr, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  };

  /* ------------------------------------------------------------------ */
  /*  player shots                                                       */
  /* ------------------------------------------------------------------ */
  function makeShot(kind) {
    const c = G.canvas(64, 64);
    const x = c.getContext('2d');
    x.translate(32, 32);
    x.globalCompositeOperation = 'lighter';
    if (kind === 'needle') {
      const g = x.createLinearGradient(0, 28, 0, -30);
      g.addColorStop(0, 'rgba(120,255,190,0)');
      g.addColorStop(0.4, 'rgba(150,255,200,0.65)');
      g.addColorStop(1, 'rgba(255,255,255,0.95)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, -30); x.lineTo(4, 10); x.lineTo(0, 28); x.lineTo(-4, 10);
      x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.fillRect(-1, -26, 2, 26);
    } else {
      // ofuda amulet
      x.shadowColor = 'rgba(70,240,170,0.9)';
      x.shadowBlur = 10;
      x.fillStyle = '#f8f2e6';
      x.fillRect(-6, -12, 12, 24);
      x.fillStyle = '#2ee6a0';
      x.fillRect(-6, -12, 12, 3);
      x.fillRect(-6, 9, 12, 3);
      x.fillStyle = 'rgba(30,200,140,0.8)';
      x.fillRect(-1.5, -6, 3, 12);
      x.fillStyle = 'rgba(255,255,255,0.85)';
      x.fillRect(-2, -7, 1.2, 14);
    }
    x.globalCompositeOperation = 'source-over';
    return c;
  }
  function makeImageShot(kind) {
    const c = G.canvas(64, 64);
    const x = c.getContext('2d');
    x.translate(32, 32);
    const col = G.COLORS[kind === 'needle' ? 10 : 1];
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(0, 0, 2, 0, 0, 26);
    g.addColorStop(0, rgbStr(col.mid, 0.4));
    g.addColorStop(1, rgbStr(col.mid, 0));
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, 26, 0, TAU); x.fill();
    x.globalCompositeOperation = 'source-over';

    x.save();
    x.beginPath();
    if (kind === 'needle') {
      x.moveTo(0, -28); x.lineTo(4, 4); x.lineTo(0, 26); x.lineTo(-4, 4);
      x.closePath();
    } else {
      x.roundRect(-7, -15, 14, 30, 3);
    }
    x.clip();
    x.drawImage(bulletImg, 0, 0, bulletImg.width, bulletImg.height, -13, -30, 26, 60);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = rgbStr(col.mid, 0.16);
    x.fillRect(-32, -32, 64, 64);
    x.restore();

    x.strokeStyle = rgbStr(col.mid, 0.9);
    x.lineWidth = 1.2;
    x.beginPath();
    if (kind === 'needle') {
      x.moveTo(0, -28); x.lineTo(4, 4); x.lineTo(0, 26); x.lineTo(-4, 4);
      x.closePath();
    } else {
      x.roundRect(-7, -15, 14, 30, 3);
    }
    x.stroke();
    return c;
  }

  Art.shot = function (kind) {
    const key = (imgReady ? 'img_' : '') + kind;
    let c = shotCache.get(key);
    if (!c) { c = imgReady ? makeImageShot(kind) : makeShot(kind); shotCache.set(key, c); }
    return c;
  };

  /* ------------------------------------------------------------------ */
  /*  background                                                         */
  /* ------------------------------------------------------------------ */
  function buildBackground(boss) {
    const W = G.PF.w, H = G.PF.h;
    const c = G.canvas(W * 2, H * 2);
    const x = c.getContext('2d');
    x.scale(2, 2);

    // sky
    const sky = x.createLinearGradient(0, 0, 0, H);
    if (boss) {
      sky.addColorStop(0, '#04120c');
      sky.addColorStop(0.45, '#061a12');
      sky.addColorStop(0.75, '#0a2418');
      sky.addColorStop(1, '#03100a');
    } else {
      sky.addColorStop(0, '#03100b');
      sky.addColorStop(0.4, '#071c13');
      sky.addColorStop(0.72, '#0a271a');
      sky.addColorStop(1, '#03120c');
    }
    x.fillStyle = sky;
    x.fillRect(0, 0, W, H);

    const rnd = G.RNG(0x5ca1ab1e);
    // stars
    for (let i = 0; i < 150; i++) {
      const sx = rnd() * W, sy = rnd() * H * 0.7;
      const a = 0.15 + rnd() * 0.65;
      x.fillStyle = `rgba(220,255,240,${a})`;
      const r = rnd() < 0.9 ? 0.6 : 1.3;
      x.fillRect(sx, sy, r, r);
    }

    // moon
    const mx = boss ? 300 : 292, my = 104, mr = boss ? 58 : 52;
    const halo = x.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.2);
    if (boss) {
      halo.addColorStop(0, 'rgba(90,250,180,0.42)');
      halo.addColorStop(0.4, 'rgba(40,200,140,0.16)');
      halo.addColorStop(1, 'rgba(20,100,70,0)');
    } else {
      halo.addColorStop(0, 'rgba(200,255,230,0.30)');
      halo.addColorStop(0.4, 'rgba(120,220,180,0.10)');
      halo.addColorStop(1, 'rgba(60,160,120,0)');
    }
    x.fillStyle = halo;
    x.fillRect(mx - mr * 3.4, my - mr * 3.4, mr * 6.8, mr * 6.8);

    const moonGrad = x.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    if (boss) {
      moonGrad.addColorStop(0, '#c8f5da');
      moonGrad.addColorStop(0.55, '#8fd8b0');
      moonGrad.addColorStop(1, '#2c6b4a');
    } else {
      moonGrad.addColorStop(0, '#d4ffe6');
      moonGrad.addColorStop(0.6, '#8fd8b0');
      moonGrad.addColorStop(1, '#3f7f5f');
    }
    x.fillStyle = moonGrad;
    x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill();

    // craters
    x.fillStyle = boss ? 'rgba(30,120,80,0.20)' : 'rgba(60,120,90,0.16)';
    const craters = [[-0.35, -0.2, 0.19], [0.3, 0.1, 0.13], [0.02, 0.42, 0.1], [-0.15, 0.62, 0.07], [0.45, -0.4, 0.08]];
    for (const [cx, cy, cr] of craters) {
      x.beginPath(); x.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU); x.fill();
    }

    // thin clouds
    x.save();
    x.globalAlpha = 0.35;
    for (let i = 0; i < 7; i++) {
      const cy = 150 + i * 26 + rnd() * 12;
      const cw = 140 + rnd() * 220;
      const cx = rnd() * W - 40;
      const g = x.createLinearGradient(cx, cy - 8, cx, cy + 10);
      g.addColorStop(0, 'rgba(50,140,100,0)');
      g.addColorStop(0.5, 'rgba(50,140,100,0.35)');
      g.addColorStop(1, 'rgba(50,140,100,0)');
      x.fillStyle = g;
      ell(x, cx, cy, cw / 2, 7 + rnd() * 6); x.fill();
    }
    x.restore();

    // distant mansion silhouette
    function roof(x0, y0, w, h) {
      x.beginPath();
      x.moveTo(x0 - w * 0.62, y0);
      x.quadraticCurveTo(x0, y0 - h * 0.35, x0 + w * 0.62, y0);
      x.lineTo(x0 + w * 0.5, y0);
      x.lineTo(x0 + w * 0.42, y0 + 4);
      x.lineTo(x0 - w * 0.42, y0 + 4);
      x.lineTo(x0 - w * 0.5, y0);
      x.closePath();
      x.fill();
    }

    const wallY = 300;
    x.fillStyle = boss ? '#04100a' : '#06140d';
    // main body
    x.fillRect(20, wallY, W - 40, 70);
    x.fillRect(70, wallY - 26, 64, 40);
    x.fillRect(250, wallY - 34, 54, 46);
    x.fillRect(150, wallY - 48, 84, 54);

    // roofs
    roof(x, 182, 96, 34);
    roof(x, 102, 70, 24);
    roof(x, 277, 60, 26);
    roof(x, 40, 40, 18);
    roof(x, 348, 44, 20);

    // tower
    x.fillRect(300, 230, 26, 76);
    roof(x, 313, 232, 34, 32);
    x.fillStyle = boss ? '#071a11' : '#0a1f15';
    x.fillRect(306, 208, 14, 24);
    roof(x, 313, 210, 20, 20);

    // windows
    const winColor = boss ? 'rgba(120,255,190,' : 'rgba(150,255,200,';
    for (let i = 0; i < 16; i++) {
      const wx = 34 + (i % 8) * 44 + rnd() * 8;
      const wy = wallY + 12 + Math.floor(i / 8) * 28 + rnd() * 4;
      x.fillStyle = winColor + (0.25 + rnd() * 0.55) + ')';
      x.fillRect(wx, wy, 5, 9);
    }
    // big arch window center
    x.fillStyle = winColor + '0.55)';
    x.beginPath();
    x.moveTo(182, wallY - 6); x.lineTo(182, wallY - 30);
    x.quadraticCurveTo(202, wallY - 46, 222, wallY - 30);
    x.lineTo(222, wallY - 6); x.closePath(); x.fill();
    x.fillStyle = 'rgba(190,255,220,0.20)';
    x.fillRect(200, wallY - 34, 2, 26);

    // lake
    const water = x.createLinearGradient(0, 340, 0, H);
    water.addColorStop(0, boss ? '#06180f' : '#04130d');
    water.addColorStop(0.5, boss ? '#04120b' : '#030d09');
    water.addColorStop(1, '#020a06');
    x.fillStyle = water;
    x.fillRect(0, 340, W, H - 340);

    // moon reflection
    x.save();
    x.globalAlpha = 0.28;
    const refl = x.createLinearGradient(0, 340, 0, H);
    refl.addColorStop(0, boss ? 'rgba(120,255,190,0.8)' : 'rgba(200,255,230,0.7)');
    refl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = refl;
    x.beginPath();
    x.moveTo(mx - 22, 340); x.lineTo(mx + 22, 340);
    x.lineTo(mx + 46, H); x.lineTo(mx - 46, H);
    x.closePath(); x.fill();
    x.restore();

    // shimmer
    for (let i = 0; i < 40; i++) {
      const sy = 344 + rnd() * 100;
      const sz = 2 + rnd() * 20;
      const sx = rnd() * W;
      x.fillStyle = boss ? `rgba(110,255,190,${0.03 + rnd() * 0.08})` : `rgba(150,230,190,${0.02 + rnd() * 0.07})`;
      x.fillRect(sx, sy, sz, 0.8);
    }

    // side trees / foreground
    x.fillStyle = '#020a06';
    x.beginPath();
    x.moveTo(0, 250);
    x.quadraticCurveTo(30, 300, 12, 360);
    x.lineTo(0, 380); x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(W, 260);
    x.quadraticCurveTo(W - 34, 316, W - 16, 372);
    x.lineTo(W, 392); x.closePath(); x.fill();

    // rose vines bottom corners
    x.strokeStyle = 'rgba(20,80,50,0.5)';
    x.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.moveTo(-4, H - i * 14);
      x.bezierCurveTo(24, H - 40 - i * 10, 12, H - 70 - i * 6, 38, H - 84 - i * 5);
      x.stroke();
    }
    x.fillStyle = 'rgba(60,200,130,0.55)';
    for (let i = 0; i < 7; i++) {
      x.beginPath();
      x.arc(10 + rnd() * 34, H - 20 - rnd() * 56, 2.2 + rnd() * 2, 0, TAU);
      x.fill();
    }

    // vignette
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg;
    x.fillRect(0, 0, W, H);

    return c;
  }

  Art.init = function () {
    bgCanvas = buildBackground(false);
    bgBoss = buildBackground(true);
    portraitCache.reimu = makeBust('reimu');
    portraitCache.midori = portraitCache.reimu;
    portraitCache.remilia = makeBust('remilia');
    portraitCache.cirno = makeBust('cirno');
    portraitCache.mutsumi = portraitCache.remilia;
    bulletImg = new Image();
    bulletImg.onload = () => {
      imgReady = true;
      bulletCache.clear();
      shotCache.clear();
      portraitCache.mutsumi = makeImagePortrait(bulletImg);
    };
    bulletImg.onerror = () => { imgReady = false; };
    bulletImg.src = 'assets/mutsumi.webp?v=9';
  };

  Art.getImage = () => bulletImg;
  Art.isImageReady = () => imgReady;

  Art.drawBackground = function (ctx, t, bossPhase, mode) {
    const bg = bossPhase ? bgBoss : bgCanvas;
    ctx.drawImage(bg, G.PF.x, G.PF.y, G.PF.w, G.PF.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(G.PF.x, G.PF.y, G.PF.w, G.PF.h);
    ctx.clip();

    // drifting mist bands
    const colors = bossPhase ? ['rgba(60,240,170,', 'rgba(30,160,110,'] : ['rgba(60,180,140,', 'rgba(40,140,100,'];
    for (let i = 0; i < 5; i++) {
      const y = G.PF.y + 120 + i * 62 + Math.sin(t * 0.006 + i) * 14;
      const off = ((t * (0.12 + i * 0.045) + i * 140) % (G.PF.w + 300)) - 150;
      const g = ctx.createLinearGradient(G.PF.x + off - 150, y, G.PF.x + off + 150, y);
      g.addColorStop(0, colors[i % 2] + '0)');
      g.addColorStop(0.5, colors[i % 2] + (bossPhase ? 0.10 : 0.065) + ')');
      g.addColorStop(1, colors[i % 2] + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(G.PF.x + off, y, 170, 22 + i * 3, 0, 0, TAU);
      ctx.fill();
    }

    // drifting embers
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const seed = i * 137.5;
      const px = G.PF.x + ((seed * 3.1 + t * (0.15 + (i % 5) * 0.05)) % G.PF.w);
      const py = G.PF.y + G.PF.h - ((t * (0.25 + (i % 7) * 0.06) + seed * 2.3) % G.PF.h);
      const a = 0.18 + 0.22 * Math.sin(t * 0.02 + i);
      const r = 1 + (i % 3) * 0.6;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 5);
      g.addColorStop(0, bossPhase ? `rgba(120,255,190,${a})` : `rgba(200,180,255,${a * 0.8})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - r * 5, py - r * 5, r * 10, r * 10);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (bossPhase) {
      const pulse = 0.08 + 0.05 * Math.sin(t * 0.04);
      const rg = ctx.createRadialGradient(G.PF.x + G.PF.w / 2, G.PF.y + 150, 20, G.PF.x + G.PF.w / 2, G.PF.y + 150, 300);
      rg.addColorStop(0, `rgba(10,100,60,${pulse})`);
      rg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = rg;
      ctx.fillRect(G.PF.x, G.PF.y, G.PF.w, G.PF.h);
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /*  characters                                                         */
  /* ------------------------------------------------------------------ */
  Art.drawPlayer = function (ctx, x, y, t, opt) {
    opt = opt || {};
    const focus = !!opt.focus;
    const bob = Math.sin(t * 0.06) * 1.2;
    const tilt = opt.tilt || 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(tilt * 0.035);

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ell(ctx, 0, 8, 11, 3.6); ctx.fill();
    ctx.restore();

    // gohei (behind)
    ctx.save();
    ctx.translate(9, -6);
    ctx.rotate(0.22 + Math.sin(t * 0.03) * 0.04);
    ctx.strokeStyle = '#c9a06a';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(1, -20); ctx.stroke();
    ctx.fillStyle = '#f5f0e2';
    ctx.beginPath();
    ctx.moveTo(1, -20);
    ctx.quadraticCurveTo(7, -26, 3, -33);
    ctx.lineTo(-4, -30);
    ctx.quadraticCurveTo(-6, -24, 1, -20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,180,150,0.8)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();

    // skirt
    const skirt = ctx.createLinearGradient(0, -2, 0, 15);
    skirt.addColorStop(0, '#35c98a');
    skirt.addColorStop(1, '#0b6b45');
    ctx.fillStyle = skirt;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(-12, 4, -11, 12);
    ctx.quadraticCurveTo(0, 15, 11, 12);
    ctx.quadraticCurveTo(12, 4, 6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,255,242,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-11, 12); ctx.quadraticCurveTo(0, 15, 11, 12);
    ctx.stroke();
    // skirt pattern
    ctx.strokeStyle = 'rgba(210,255,230,0.35)';
    ctx.lineWidth = 0.8;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4, 1); ctx.quadraticCurveTo(i * 6, 7, i * 7, 12);
      ctx.stroke();
    }

    // shoes
    ctx.fillStyle = '#0a2418';
    ell(ctx, -4, 13, 2.4, 1.6); ctx.fill();
    ell(ctx, 4, 13, 2.4, 1.6); ctx.fill();

    // blouse / torso
    const blouse = ctx.createLinearGradient(0, -12, 0, 2);
    blouse.addColorStop(0, '#fffaf2');
    blouse.addColorStop(1, '#d7ebe0');
    ctx.fillStyle = blouse;
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.quadraticCurveTo(0, -14, 6, -11);
    ctx.lineTo(7, 0);
    ctx.quadraticCurveTo(0, 3, -7, 0);
    ctx.closePath();
    ctx.fill();
    // red tie
    ctx.fillStyle = '#2ee6a0';
    ctx.beginPath();
    ctx.moveTo(-2, -10); ctx.lineTo(2, -10); ctx.lineTo(2.6, -1); ctx.lineTo(0, 1); ctx.lineTo(-2.6, -1);
    ctx.closePath(); ctx.fill();

    // sleeves
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(s * 8, -7, 1, s * 8, -6, 8);
      g.addColorStop(0, '#fffaf2');
      g.addColorStop(1, '#cfe7da');
      ctx.fillStyle = g;
      ell(ctx, s * 8, -6, 5.4, 6.4, s * 0.2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,200,140,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s * 8, -6, 5.2, s > 0 ? -1.2 : Math.PI - 0.4, s > 0 ? 1.9 : Math.PI + 1.2);
      ctx.stroke();
    }

    // hair back
    const hair = ctx.createLinearGradient(0, -26, 0, -2);
    hair.addColorStop(0, '#14261c');
    hair.addColorStop(1, '#08120c');
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-6, -22);
    ctx.quadraticCurveTo(-12, -16, -10, -4);
    ctx.quadraticCurveTo(-7, -2, -5, -6);
    ctx.lineTo(-5, -16);
    ctx.lineTo(5, -16);
    ctx.lineTo(5, -6);
    ctx.quadraticCurveTo(7, -2, 10, -4);
    ctx.quadraticCurveTo(12, -16, 6, -22);
    ctx.closePath();
    ctx.fill();

    // head
    ctx.fillStyle = '#ffdcc6';
    ell(ctx, 0, -17, 5.2, 5.4); ctx.fill();
    // hair top
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(0, -18.5, 5.8, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(5, -15, 3.5, -14.2);
    ctx.quadraticCurveTo(0, -16.5, -3.5, -14.2);
    ctx.quadraticCurveTo(-5, -15, -5.7, -17);
    ctx.fill();
    // side locks
    ctx.fillStyle = '#0e1c15';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 5.3, -18);
      ctx.quadraticCurveTo(s * 8, -12, s * 5.6, -7.5);
      ctx.quadraticCurveTo(s * 4.2, -10, s * 4.3, -15);
      ctx.closePath(); ctx.fill();
    }
    // hair shine
    ctx.strokeStyle = 'rgba(90,170,140,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -18.6, 4.3, Math.PI * 1.15, Math.PI * 1.6);
    ctx.stroke();

    // ribbon bow
    ctx.fillStyle = '#2ee6a0';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.quadraticCurveTo(-8, -30, -8, -24.5);
    ctx.quadraticCurveTo(-7, -20, 0, -22.6);
    ctx.quadraticCurveTo(7, -20, 8, -24.5);
    ctx.quadraticCurveTo(8, -30, 0, -24);
    ctx.fill();
    ctx.fillStyle = '#a8ffe0';
    ell(ctx, 0, -24, 1.8, 1.6); ctx.fill();

    // hitbox (only when focused)
    if (focus) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 0.12);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
      g.addColorStop(0, 'rgba(210,255,120,0.85)');
      g.addColorStop(0.4, 'rgba(180,255,120,0.35)');
      g.addColorStop(1, 'rgba(150,255,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(220,255,230,${pulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,250,170,0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(0, 0, 5.5, t * 0.05, t * 0.05 + Math.PI * 1.4); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  };

  Art.drawOption = function (ctx, x, y, t, focused) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(120,255,190,0.6)');
    g.addColorStop(1, 'rgba(150,255,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2ee';
    ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(180,255,210,0.9)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  };

  Art.drawBoss = function (ctx, x, y, t, which, opt) {
    opt = opt || {};
    if (which === 'cirno') return drawCirno(ctx, x, y, t, opt);
    return drawRemilia(ctx, x, y, t, opt);
  };

  function drawRemilia(ctx, x, y, t, opt) {
    const bob = Math.sin(t * 0.045) * 2.4;
    const breathe = 1 + Math.sin(t * 0.05) * 0.008;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(breathe, breathe);

    // aura
    if (opt.aura) {
      const ar = 34 + Math.sin(t * 0.08) * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ag = ctx.createRadialGradient(0, 0, ar * 0.4, 0, 0, ar * 1.9);
      ag.addColorStop(0, `rgba(40,240,170,${0.18 * opt.aura})`);
      ag.addColorStop(0.6, `rgba(40,200,140,${0.09 * opt.aura})`);
      ag.addColorStop(1, 'rgba(20,100,60,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(0, 0, ar * 1.9, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ell(ctx, 0, 6, 20, 5); ctx.fill();
    ctx.restore();

    // wings
    const flap = Math.sin(t * 0.09) * 0.14;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 17, -8);
      ctx.rotate(s * (0.25 + flap));
      const wg = ctx.createLinearGradient(0, -20, 0, 18);
      wg.addColorStop(0, '#0a2418');
      wg.addColorStop(0.55, '#124a30');
      wg.addColorStop(1, '#04140c');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(s * 24, -34, s * 34, -18);
      ctx.quadraticCurveTo(s * 30, -10, s * 36, -2);
      ctx.quadraticCurveTo(s * 26, 2, s * 30, 12);
      ctx.quadraticCurveTo(s * 18, 10, s * 14, 20);
      ctx.quadraticCurveTo(s * 8, 6, 0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,160,110,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // bones
      ctx.strokeStyle = 'rgba(4,16,10,0.9)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(s * (12 + i * 5), -10 + i * 6, s * (26 + i * 3), -14 + i * 12);
        ctx.stroke();
      }
      ctx.restore();
    }

    // spear (Gungnir) at right
    ctx.save();
    ctx.translate(21, -2);
    ctx.rotate(-0.16 + Math.sin(t * 0.03) * 0.03);
    ctx.strokeStyle = '#14653f';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 26); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,255,220,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-1, -28); ctx.lineTo(-1, 24); ctx.stroke();
    // blade
    const bg = ctx.createLinearGradient(0, -50, 0, -26);
    bg.addColorStop(0, '#fff2d0');
    bg.addColorStop(0.6, '#a8ffd0');
    bg.addColorStop(1, '#2fbf8f');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(5, -36); ctx.lineTo(2, -26); ctx.lineTo(0, -22);
    ctx.lineTo(-2, -26); ctx.lineTo(-5, -36);
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(80,255,190,0.35)';
    ctx.beginPath(); ctx.ellipse(0, -38, 10, 18, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // legs
    ctx.fillStyle = '#f3d7ce';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 4, 8); ctx.lineTo(s * 8, 15); ctx.lineTo(s * 5, 16); ctx.lineTo(s * 2, 9);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#0a1f14';
    ell(ctx, -5.5, 16, 3.4, 2); ctx.fill();
    ell(ctx, 5.5, 16, 3.4, 2); ctx.fill();

    // dress skirt
    const dg = ctx.createLinearGradient(0, -2, 0, 17);
    dg.addColorStop(0, '#1fb878');
    dg.addColorStop(0.6, '#0f7a4d');
    dg.addColorStop(1, '#05301f');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.quadraticCurveTo(-18, 6, -15, 15);
    ctx.quadraticCurveTo(0, 19, 15, 15);
    ctx.quadraticCurveTo(18, 6, 8, -2);
    ctx.closePath(); ctx.fill();
    // white frills
    ctx.strokeStyle = 'rgba(245,235,245,0.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-15, 14);
    for (let i = -14; i <= 14; i += 3.5) {
      ctx.quadraticCurveTo(i + 1.75, 17.5, i + 3.5, 14.6);
    }
    ctx.stroke();

    // bodice
    const bg2 = ctx.createLinearGradient(0, -12, 0, 1);
    bg2.addColorStop(0, '#2fd695');
    bg2.addColorStop(1, '#0e6b46');
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.moveTo(-7, -12);
    ctx.quadraticCurveTo(0, -15, 7, -12);
    ctx.lineTo(8, 1);
    ctx.quadraticCurveTo(0, 4, -8, 1);
    ctx.closePath(); ctx.fill();
    // white collar
    ctx.fillStyle = '#f6eef4';
    ctx.beginPath();
    ctx.moveTo(-5, -12); ctx.lineTo(0, -9); ctx.lineTo(5, -12);
    ctx.lineTo(3.5, -15); ctx.lineTo(-3.5, -15);
    ctx.closePath(); ctx.fill();
    // ribbon
    ctx.fillStyle = '#c8ffe4';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(-3, -6); ctx.lineTo(0, -4.6); ctx.lineTo(3, -6);
    ctx.closePath(); ctx.fill();
    // buttons
    ctx.fillStyle = '#a8ffd0';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, -6 + i * 3, 0.7, 0, TAU); ctx.fill(); }

    // arms
    ctx.strokeStyle = '#ffdccd';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -9); ctx.quadraticCurveTo(-13, -4, -11, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -9); ctx.quadraticCurveTo(12, -4, 14, -6); ctx.stroke();
    // hand
    ctx.fillStyle = '#ffdccd';
    ctx.beginPath(); ctx.arc(14, -6, 1.8, 0, TAU); ctx.fill();

    // head
    const skin = ctx.createRadialGradient(-2, -20, 1, 0, -18, 8);
    skin.addColorStop(0, '#fff3ea');
    skin.addColorStop(1, '#f2cfc6');
    ctx.fillStyle = skin;
    ell(ctx, 0, -18, 6.6, 7); ctx.fill();

    // hair (light blue)
    const hairG = ctx.createLinearGradient(0, -30, 0, -8);
    hairG.addColorStop(0, '#dcffe9');
    hairG.addColorStop(1, '#8fd8b0');
    ctx.fillStyle = hairG;
    ctx.beginPath();
    ctx.arc(0, -19, 7.4, Math.PI * 0.95, Math.PI * 2.05);
    ctx.quadraticCurveTo(8.5, -12, 6.2, -7.5);
    ctx.quadraticCurveTo(5.4, -12, 5.5, -15);
    ctx.quadraticCurveTo(0, -13.5, -5.5, -15);
    ctx.quadraticCurveTo(-5.4, -12, -6.2, -7.5);
    ctx.quadraticCurveTo(-8.5, -12, -7.4, -19);
    ctx.fill();
    // side locks
    ctx.beginPath();
    ctx.moveTo(-7.2, -19); ctx.quadraticCurveTo(-10, -12, -7, -6); ctx.quadraticCurveTo(-5.6, -11, -5.8, -17); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7.2, -19); ctx.quadraticCurveTo(10, -12, 7, -6); ctx.quadraticCurveTo(5.6, -11, 5.8, -17); ctx.fill();

    // hair ribbon (no cap — this is Mutsumi, not a vampire)
    ctx.fillStyle = '#2fd695';
    ctx.beginPath();
    ctx.moveTo(0, -29);
    ctx.quadraticCurveTo(-10, -36, -9, -28);
    ctx.quadraticCurveTo(-8, -23, 0, -26);
    ctx.quadraticCurveTo(8, -23, 9, -28);
    ctx.quadraticCurveTo(10, -36, 0, -29);
    ctx.fill();
    ctx.fillStyle = '#b9ffdd';
    ell(ctx, 0, -29, 1.7, 1.3); ctx.fill();
    // leaf ornament
    ctx.fillStyle = 'rgba(160,255,210,0.8)';
    ctx.beginPath();
    ctx.ellipse(11, -30, 3.4, 1.5, -0.6, 0, TAU);
    ctx.fill();

    // eyes
    ctx.fillStyle = '#0f9e62';
    ell(ctx, -2.5, -18.5, 1.35, 1.9); ctx.fill();
    ell(ctx, 2.5, -18.5, 1.35, 1.9); ctx.fill();
    ctx.fillStyle = '#b9ffdd';
    ell(ctx, -2.9, -19.2, 0.5, 0.65); ctx.fill();
    ell(ctx, 2.1, -19.2, 0.5, 0.65); ctx.fill();
    // brows & mouth
    ctx.strokeStyle = 'rgba(30,90,65,0.65)';
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-3.8, -21.2); ctx.lineTo(-1.6, -21.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3.8, -21.2); ctx.lineTo(1.6, -21.6); ctx.stroke();
    ctx.fillStyle = '#2c7a58';
    ctx.beginPath(); ctx.ellipse(0, -14.6, 1.3, 0.7, 0, 0, Math.PI); ctx.fill();

    ctx.restore();
  }

  function drawCirno(ctx, x, y, t, opt) {
    const bob = Math.sin(t * 0.055) * 2.2;
    ctx.save();
    ctx.translate(x, y + bob);

    // ice wings
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const a = s * (0.5 + i * 0.38) + Math.sin(t * 0.06 + i) * 0.06;
        ctx.save();
        ctx.rotate(a);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, 0, s * 34, 0);
        g.addColorStop(0, 'rgba(150,235,255,0.75)');
        g.addColorStop(1, 'rgba(90,180,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(s * 32, -5); ctx.lineTo(s * 26, 1); ctx.lineTo(s * 30, 7);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(230,255,255,0.7)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
    }

    // shadow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ell(ctx, 0, 5, 15, 4); ctx.fill(); ctx.restore();

    // legs
    ctx.strokeStyle = '#ffe6dc'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-4.5, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(4.5, 13); ctx.stroke();
    ctx.fillStyle = '#0d3a27';
    ell(ctx, -4.5, 14, 2.4, 1.4); ctx.fill();
    ell(ctx, 4.5, 14, 2.4, 1.4); ctx.fill();

    // dress
    const dg = ctx.createLinearGradient(0, -4, 0, 12);
    dg.addColorStop(0, '#2fb88f');
    dg.addColorStop(1, '#0f5e46');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(-14, 4, -11, 11);
    ctx.quadraticCurveTo(0, 14, 11, 11);
    ctx.quadraticCurveTo(14, 4, 6, -4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(240,250,255,0.9)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-11, 10); ctx.quadraticCurveTo(0, 13, 11, 10); ctx.stroke();
    // white apron
    ctx.fillStyle = 'rgba(245,250,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(-3, -2); ctx.lineTo(3, -2); ctx.lineTo(4, 9); ctx.lineTo(-4, 9);
    ctx.closePath(); ctx.fill();

    // torso
    ctx.fillStyle = '#eef8ff';
    ctx.beginPath();
    ctx.moveTo(-5, -10); ctx.quadraticCurveTo(0, -12, 5, -10);
    ctx.lineTo(6, -2); ctx.quadraticCurveTo(0, 1, -6, -2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f9e70';
    ctx.fillRect(-3, -9, 6, 1.6);

    // arms
    ctx.strokeStyle = '#ffe6dc'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.quadraticCurveTo(-10, -2, -9, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -7); ctx.quadraticCurveTo(10, -2, 9, 2); ctx.stroke();

    // head
    ctx.fillStyle = '#fff0e6';
    ell(ctx, 0, -16, 6, 6.3); ctx.fill();
    // hair
    const hg = ctx.createLinearGradient(0, -25, 0, -8);
    hg.addColorStop(0, '#b8ffe0');
    hg.addColorStop(1, '#5fc98f');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, -17, 7, Math.PI * 0.96, Math.PI * 2.04);
    ctx.quadraticCurveTo(8, -10, 6, -6);
    ctx.quadraticCurveTo(4.4, -11, 4.8, -14);
    ctx.quadraticCurveTo(0, -12.6, -4.8, -14);
    ctx.quadraticCurveTo(-4.4, -11, -6, -6);
    ctx.quadraticCurveTo(-8, -10, -7, -17);
    ctx.fill();
    // green bow
    ctx.fillStyle = '#3fbf6a';
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.quadraticCurveTo(-7, -29, -6, -23.5);
    ctx.quadraticCurveTo(-5, -20, 0, -21.8);
    ctx.quadraticCurveTo(5, -20, 6, -23.5);
    ctx.quadraticCurveTo(7, -29, 0, -23);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#147a50';
    ell(ctx, -2.3, -16.5, 1.3, 1.8); ctx.fill();
    ell(ctx, 2.3, -16.5, 1.3, 1.8); ctx.fill();
    ctx.fillStyle = '#fff';
    ell(ctx, -2.6, -17.2, 0.45, 0.6); ctx.fill();
    ell(ctx, 2.0, -17.2, 0.45, 0.6); ctx.fill();
    ctx.fillStyle = '#c96a74';
    ctx.beginPath(); ctx.ellipse(0, -12.8, 1.2, 0.6, 0, 0, Math.PI); ctx.fill();
    // little ahoge
    ctx.strokeStyle = '#b8ffe0'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(2, -28, 5, -27); ctx.stroke();

    ctx.restore();
  }

  Art.drawFairy = function (ctx, x, y, t, color, size) {
    size = size || 1;
    const col = G.COLORS[color % G.COLORS.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    const bob = Math.sin(t * 0.1 + x) * 0.6;

    // wings
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const flap = Math.sin(t * 0.35 + x * 0.1) * 0.18;
      ctx.save();
      ctx.rotate(s * (0.65 + flap));
      ctx.fillStyle = 'rgba(210,235,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(s * 8, 0, 7, 3, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,0.45)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // body
    ctx.translate(0, bob);
    ctx.fillStyle = col.mid;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(4.5, -1, 3.5, 6);
    ctx.quadraticCurveTo(0, 8, -3.5, 6);
    ctx.quadraticCurveTo(-4.5, -1, 0, -5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(0, -7, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(40,20,40,0.85)';
    ctx.beginPath(); ctx.arc(-0.9, -7.4, 0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0.9, -7.4, 0.5, 0, TAU); ctx.fill();

    ctx.restore();
  };

  Art.drawBossAura = function (ctx, x, y, t, ci) {
    const col = G.COLORS[ci % G.COLORS.length];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const r = 26 + i * 9 + Math.sin(t * 0.05 + i) * 3;
      ctx.strokeStyle = rgbStr(col.mid, 0.22 - i * 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, t * 0.01 * (i % 2 ? -1 : 1), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  Art.drawLaser = function (ctx, b, t) {
    const col = G.COLORS[b.color % G.COLORS.length];
    const a = b.ang;
    const len = b.len;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(a);
    ctx.globalCompositeOperation = 'lighter';
    if (b.warn > 0) {
      ctx.strokeStyle = rgbStr(col.mid, 0.35 + 0.3 * Math.sin(t * 0.4));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.fillStyle = rgbStr(col.mid, 0.9);
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    } else {
      const w = b.width;
      if (imgReady && bulletImg) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.56;
        ctx.drawImage(bulletImg, 0, 0, bulletImg.width, bulletImg.height, 6, -w * 1.25, len - 12, w * 2.5);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.beginPath(); ctx.rect(6, -w * 1.25, len - 12, w * 2.5); ctx.clip();
        ctx.fillStyle = 'rgba(8, 96, 60, 0.38)';
        ctx.fillRect(6, -w * 1.25, len - 12, w * 2.5);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
      }
      const g = ctx.createLinearGradient(0, -w, 0, w);
      g.addColorStop(0, rgbStr(col.mid, 0));
      g.addColorStop(0.35, rgbStr(col.mid, 0.45));
      g.addColorStop(0.5, 'rgba(230,255,245,0.85)');
      g.addColorStop(0.65, rgbStr(col.mid, 0.45));
      g.addColorStop(1, rgbStr(col.mid, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, -w, len, w * 2);
      ctx.fillStyle = 'rgba(245,255,250,0.9)';
      ctx.fillRect(0, -1, len, 2);
      // moving pulses
      for (let i = 0; i < 6; i++) {
        const px = ((t * 6 + i * len / 6) % len);
        ctx.fillStyle = 'rgba(210,255,235,0.34)';
        ctx.fillRect(px, -w * 0.6, 14, w * 1.2);
      }
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /*  portraits                                                          */
  /* ------------------------------------------------------------------ */
  function makeBust(who) {
    const c = G.canvas(300, 360);
    const x = c.getContext('2d');
    x.translate(150, 190);
    x.scale(1.55, 1.55);

    if (who === 'reimu') {
      // back hair
      x.fillStyle = '#1d1119';
      x.beginPath();
      x.moveTo(-26, -38);
      x.quadraticCurveTo(-46, 20, -34, 78);
      x.lineTo(34, 78);
      x.quadraticCurveTo(46, 20, 26, -38);
      x.closePath(); x.fill();
      // shoulders / sleeves
      for (const s of [-1, 1]) {
        const g = x.createLinearGradient(s * 20, 10, s * 44, 80);
        g.addColorStop(0, '#fbf5ec');
        g.addColorStop(1, '#d9c9bb');
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(s * 18, 8);
        x.quadraticCurveTo(s * 50, 16, s * 55, 54);
        x.quadraticCurveTo(s * 38, 78, s * 14, 62);
        x.closePath(); x.fill();
        x.strokeStyle = '#2fbf8f'; x.lineWidth = 3;
        x.beginPath();
        x.moveTo(s * 30, 44); x.quadraticCurveTo(s * 44, 52, s * 47, 68); x.stroke();
      }
      // torso
      const tg = x.createLinearGradient(0, -4, 0, 70);
      tg.addColorStop(0, '#fffaf2');
      tg.addColorStop(1, '#e4d3c2');
      x.fillStyle = tg;
      x.beginPath();
      x.moveTo(-24, 4); x.quadraticCurveTo(0, -8, 24, 4);
      x.lineTo(30, 72); x.lineTo(-30, 72); x.closePath(); x.fill();
      // red tie
      x.fillStyle = '#2ee6a0';
      x.beginPath();
      x.moveTo(0, 2); x.lineTo(-6, 8); x.lineTo(-3, 38); x.lineTo(0, 43); x.lineTo(3, 38); x.lineTo(6, 8);
      x.closePath(); x.fill();
      // neck
      x.fillStyle = '#f6d3bd';
      x.fillRect(-7, -22, 14, 16);
      // face
      const fg = x.createRadialGradient(-6, -50, 4, 0, -42, 34);
      fg.addColorStop(0, '#ffe9d9');
      fg.addColorStop(1, '#f6cfb9');
      x.fillStyle = fg;
      x.beginPath();
      x.moveTo(-25, -48);
      x.quadraticCurveTo(-25, -18, 0, -12);
      x.quadraticCurveTo(25, -18, 25, -48);
      x.quadraticCurveTo(25, -74, 0, -76);
      x.quadraticCurveTo(-25, -74, -25, -48);
      x.fill();
      // hair front
      x.fillStyle = '#231520';
      x.beginPath();
      x.moveTo(-27, -46);
      x.quadraticCurveTo(-33, -76, 0, -82);
      x.quadraticCurveTo(33, -76, 27, -46);
      x.quadraticCurveTo(23, -68, 8, -62);
      x.quadraticCurveTo(2, -54, -2, -60);
      x.quadraticCurveTo(-12, -70, -20, -58);
      x.quadraticCurveTo(-23, -52, -27, -46);
      x.fill();
      // side locks
      x.fillStyle = '#1d1119';
      for (const s of [-1, 1]) {
        x.beginPath();
        x.moveTo(s * 25, -52);
        x.quadraticCurveTo(s * 35, -24, s * 27, 6);
        x.quadraticCurveTo(s * 18, -10, s * 18, -40);
        x.closePath(); x.fill();
      }
      // eyes
      x.fillStyle = '#fff';
      x.beginPath(); x.ellipse(-10, -43, 5.6, 6.6, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(10, -43, 5.6, 6.6, 0, 0, TAU); x.fill();
      x.fillStyle = '#147a50';
      x.beginPath(); x.ellipse(-10, -42, 3.4, 5.4, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(10, -42, 3.4, 5.4, 0, 0, TAU); x.fill();
      x.fillStyle = '#2a0a10';
      x.beginPath(); x.arc(-10, -42, 1.5, 0, TAU); x.fill();
      x.beginPath(); x.arc(10, -42, 1.5, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.beginPath(); x.arc(-11.6, -44.4, 1.2, 0, TAU); x.fill();
      x.beginPath(); x.arc(8.4, -44.4, 1.2, 0, TAU); x.fill();
      // lashes
      x.strokeStyle = '#2a0a10'; x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(-15, -47); x.quadraticCurveTo(-10, -50, -5, -47); x.stroke();
      x.beginPath(); x.moveTo(15, -47); x.quadraticCurveTo(10, -50, 5, -47); x.stroke();
      // blush & mouth
      x.fillStyle = 'rgba(240,130,140,0.32)';
      x.beginPath(); x.ellipse(-16, -33, 5, 2.4, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(16, -33, 5, 2.4, 0, 0, TAU); x.fill();
      x.strokeStyle = '#2c7a58'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(-2.5, -29); x.quadraticCurveTo(0, -27.2, 2.5, -29); x.stroke();
      // ribbon
      x.fillStyle = '#2ee6a0';
      x.beginPath();
      x.moveTo(0, -76);
      x.quadraticCurveTo(-22, -92, -20, -73);
      x.quadraticCurveTo(-18, -62, 0, -69);
      x.quadraticCurveTo(18, -62, 20, -73);
      x.quadraticCurveTo(22, -92, 0, -76);
      x.fill();
      x.fillStyle = '#a8ffe0';
      x.beginPath(); x.arc(0, -76, 3.4, 0, TAU); x.fill();
      // hair shine
      x.strokeStyle = 'rgba(100,180,150,0.55)'; x.lineWidth = 2;
      x.beginPath(); x.arc(0, -62, 20, Math.PI * 1.15, Math.PI * 1.55); x.stroke();
    } else if (who === 'remilia') {
      // wings
      for (const s of [-1, 1]) {
        x.save();
        x.translate(s * 30, 6);
        x.rotate(s * 0.22);
        const wg = x.createLinearGradient(0, -30, 0, 40);
        wg.addColorStop(0, '#0a2418');
        wg.addColorStop(0.5, '#124a30');
        wg.addColorStop(1, '#04140c');
        x.fillStyle = wg;
        x.beginPath();
        x.moveTo(0, 0);
        x.quadraticCurveTo(s * 36, -52, s * 58, -26);
        x.quadraticCurveTo(s * 48, -12, s * 60, 2);
        x.quadraticCurveTo(s * 42, 10, s * 48, 30);
        x.quadraticCurveTo(s * 28, 24, s * 20, 44);
        x.quadraticCurveTo(s * 10, 18, 0, 22);
        x.closePath(); x.fill();
        x.strokeStyle = 'rgba(50,180,120,0.5)'; x.lineWidth = 1.6; x.stroke();
        x.restore();
      }
      // back hair
      x.fillStyle = '#b8ffe0';
      x.beginPath();
      x.moveTo(-22, -38);
      x.quadraticCurveTo(-36, 10, -28, 62);
      x.lineTo(28, 62);
      x.quadraticCurveTo(36, 10, 22, -38);
      x.closePath(); x.fill();
      // torso / dress
      const dg = x.createLinearGradient(0, 0, 0, 78);
      dg.addColorStop(0, '#2fbf8f');
      dg.addColorStop(0.6, '#8d0d2a');
      dg.addColorStop(1, '#4c0616');
      x.fillStyle = dg;
      x.beginPath();
      x.moveTo(-20, 8); x.quadraticCurveTo(0, -4, 20, 8);
      x.lineTo(38, 80); x.lineTo(-38, 80); x.closePath(); x.fill();
      // collar
      x.fillStyle = '#f2eaf3';
      x.beginPath();
      x.moveTo(-16, 4); x.lineTo(0, 16); x.lineTo(16, 4);
      x.lineTo(12, -2); x.lineTo(-12, -2); x.closePath(); x.fill();
      // neck
      x.fillStyle = '#f7d9cf';
      x.fillRect(-6, -20, 12, 14);
      // face
      const fg = x.createRadialGradient(-6, -46, 4, 0, -40, 32);
      fg.addColorStop(0, '#fff4ee');
      fg.addColorStop(1, '#f0cec6');
      x.fillStyle = fg;
      x.beginPath();
      x.moveTo(-22, -44);
      x.quadraticCurveTo(-22, -16, 0, -10);
      x.quadraticCurveTo(22, -16, 22, -44);
      x.quadraticCurveTo(22, -68, 0, -70);
      x.quadraticCurveTo(-22, -68, -22, -44);
      x.fill();
      // hair
      const hg = x.createLinearGradient(0, -74, 0, -20);
      hg.addColorStop(0, '#dcffe9');
      hg.addColorStop(1, '#8fd8b0');
      x.fillStyle = hg;
      x.beginPath();
      x.moveTo(-24, -44);
      x.quadraticCurveTo(-30, -72, 0, -76);
      x.quadraticCurveTo(30, -72, 24, -44);
      x.quadraticCurveTo(20, -60, 10, -56);
      x.quadraticCurveTo(4, -48, -2, -55);
      x.quadraticCurveTo(-12, -62, -19, -52);
      x.closePath(); x.fill();
      // side locks
      for (const s of [-1, 1]) {
        x.beginPath();
        x.moveTo(s * 22, -48);
        x.quadraticCurveTo(s * 32, -20, s * 23, 4);
        x.quadraticCurveTo(s * 14, -12, s * 15, -38);
        x.closePath(); x.fill();
      }
      // eyes
      x.fillStyle = '#fff';
      x.beginPath(); x.ellipse(-9, -39, 5.4, 6.4, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(9, -39, 5.4, 6.4, 0, 0, TAU); x.fill();
      x.fillStyle = '#0f9e62';
      x.beginPath(); x.ellipse(-9, -38, 3.3, 5.2, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(9, -38, 3.3, 5.2, 0, 0, TAU); x.fill();
      x.fillStyle = '#2a060c';
      x.beginPath(); x.arc(-9, -38, 1.4, 0, TAU); x.fill();
      x.beginPath(); x.arc(9, -38, 1.4, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.beginPath(); x.arc(-10.4, -40.2, 1.1, 0, TAU); x.fill();
      x.beginPath(); x.arc(7.6, -40.2, 1.1, 0, TAU); x.fill();
      // fangs
      x.fillStyle = '#fff';
      x.beginPath(); x.moveTo(-4, -25); x.lineTo(-2, -22); x.lineTo(0, -25); x.fill();
      x.beginPath(); x.moveTo(4, -25); x.lineTo(2, -22); x.lineTo(0, -25); x.fill();
      // mouth
      x.strokeStyle = '#a34752'; x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(-3, -26); x.quadraticCurveTo(0, -24.4, 3, -26); x.stroke();
      x.fillStyle = 'rgba(240,120,130,0.25)';
      x.beginPath(); x.ellipse(-15, -30, 4.6, 2.2, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(15, -30, 4.6, 2.2, 0, 0, TAU); x.fill();
      // mob cap
      x.fillStyle = '#f2fff8';
      x.beginPath(); x.ellipse(0, -71, 27, 12, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(190,160,185,0.6)'; x.lineWidth = 1.2;
      for (let i = -4; i <= 4; i++) {
        x.beginPath(); x.arc(i * 5.4, -68, 3.6, Math.PI, 0); x.stroke();
      }
      x.fillStyle = '#2fbf8f';
      x.beginPath();
      x.moveTo(0, -80);
      x.quadraticCurveTo(-20, -96, -18, -77);
      x.quadraticCurveTo(-16, -66, 0, -72);
      x.quadraticCurveTo(16, -66, 18, -77);
      x.quadraticCurveTo(20, -96, 0, -80);
      x.fill();
      x.fillStyle = '#b9ffdd';
      x.beginPath(); x.arc(0, -80, 2.8, 0, TAU); x.fill();
    } else {
      // cirno — ice fairy
      // crystal wings
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          x.save();
          x.translate(s * 24, 12);
          x.rotate(s * (0.32 + i * 0.38));
          const wg = x.createLinearGradient(0, 0, s * 62, 0);
          wg.addColorStop(0, 'rgba(220,250,255,0.92)');
          wg.addColorStop(0.55, 'rgba(120,210,245,0.68)');
          wg.addColorStop(1, 'rgba(80,170,255,0.04)');
          x.fillStyle = wg;
          x.strokeStyle = 'rgba(235,255,255,0.6)';
          x.lineWidth = 1.2;
          x.beginPath();
          x.moveTo(0, 0); x.lineTo(s * 58, -8); x.lineTo(s * 49, 2); x.lineTo(s * 57, 11);
          x.closePath(); x.fill(); x.stroke();
          x.restore();
        }
      }
      // back hair
      const bh = x.createLinearGradient(0, -40, 0, 78);
      bh.addColorStop(0, '#b8ffe0');
      bh.addColorStop(1, '#5aa8d8');
      x.fillStyle = bh;
      x.beginPath();
      x.moveTo(-26, -30);
      x.quadraticCurveTo(-48, 20, -34, 74);
      x.lineTo(34, 74);
      x.quadraticCurveTo(48, 20, 26, -30);
      x.closePath(); x.fill();

      // arms / sleeves
      for (const s of [-1, 1]) {
        const ag = x.createLinearGradient(s * 20, 8, s * 44, 52);
        ag.addColorStop(0, '#f8fdff');
        ag.addColorStop(1, '#cfe8f7');
        x.fillStyle = ag;
        x.beginPath();
        x.moveTo(s * 16, 6);
        x.quadraticCurveTo(s * 38, 12, s * 41, 40);
        x.quadraticCurveTo(s * 33, 51, s * 21, 40);
        x.closePath(); x.fill();
        x.strokeStyle = '#1f9e70';
        x.lineWidth = 2.2;
        x.beginPath();
        x.moveTo(s * 30, 33); x.quadraticCurveTo(s * 37, 37, s * 39, 44); x.stroke();
        x.fillStyle = '#ffe8dc';
        x.beginPath(); x.arc(s * 36, 49, 5.2, 0, TAU); x.fill();
      }

      // dress
      const dg = x.createLinearGradient(0, 0, 0, 80);
      dg.addColorStop(0, '#eefaff');
      dg.addColorStop(1, '#a6d8ee');
      x.fillStyle = dg;
      x.beginPath();
      x.moveTo(-22, 4); x.quadraticCurveTo(0, -8, 22, 4);
      x.lineTo(38, 80); x.lineTo(-38, 80); x.closePath(); x.fill();
      const bg = x.createLinearGradient(0, 10, 0, 80);
      bg.addColorStop(0, '#5aa9e0');
      bg.addColorStop(1, '#2c6ba8');
      x.fillStyle = bg;
      x.beginPath();
      x.moveTo(-16, 12); x.quadraticCurveTo(0, 4, 16, 12);
      x.lineTo(28, 80); x.lineTo(-28, 80); x.closePath(); x.fill();
      // white apron
      x.fillStyle = '#f7fdff';
      x.beginPath();
      x.moveTo(-13, 18); x.lineTo(13, 18); x.lineTo(18, 80); x.lineTo(-18, 80); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(120,180,210,0.45)';
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(-18, 62); x.lineTo(18, 62); x.stroke();

      // collar & bow
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(-16, 4); x.lineTo(0, 14); x.lineTo(16, 4);
      x.lineTo(12, -2); x.lineTo(-12, -2); x.closePath(); x.fill();
      x.fillStyle = '#3fbf6a';
      x.beginPath();
      x.moveTo(0, 10); x.lineTo(-5, 15); x.lineTo(0, 20); x.lineTo(5, 15); x.closePath(); x.fill();

      // neck
      x.fillStyle = '#f7e0d4';
      x.fillRect(-6, -14, 12, 14);

      // face
      x.fillStyle = '#ffe8dc';
      x.beginPath();
      x.moveTo(-22, -46);
      x.quadraticCurveTo(-22, -16, 0, -10);
      x.quadraticCurveTo(22, -16, 22, -46);
      x.quadraticCurveTo(22, -72, 0, -74);
      x.quadraticCurveTo(-22, -72, -22, -46);
      x.fill();

      // hair front
      const hg = x.createLinearGradient(0, -82, 0, -30);
      hg.addColorStop(0, '#b8ffe0');
      hg.addColorStop(1, '#6ab8e6');
      x.fillStyle = hg;
      x.beginPath();
      x.moveTo(-25, -46);
      x.quadraticCurveTo(-32, -76, 0, -80);
      x.quadraticCurveTo(32, -76, 25, -46);
      x.quadraticCurveTo(20, -64, 8, -60);
      x.quadraticCurveTo(2, -52, -4, -58);
      x.quadraticCurveTo(-14, -66, -20, -54);
      x.closePath(); x.fill();
      for (const s of [-1, 1]) {
        x.beginPath();
        x.moveTo(s * 24, -52);
        x.quadraticCurveTo(s * 32, -22, s * 22, 4);
        x.quadraticCurveTo(s * 15, -14, s * 16, -40);
        x.closePath(); x.fill();
      }
      // hair shine
      x.strokeStyle = 'rgba(235,255,255,0.55)';
      x.lineWidth = 2;
      x.beginPath(); x.arc(0, -60, 17, Math.PI * 1.12, Math.PI * 1.55); x.stroke();

      // eyes
      x.fillStyle = '#fff';
      x.beginPath(); x.ellipse(-9, -41, 5.2, 6.2, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(9, -41, 5.2, 6.2, 0, 0, TAU); x.fill();
      x.fillStyle = '#147a50';
      x.beginPath(); x.ellipse(-9, -40, 3.2, 5, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(9, -40, 3.2, 5, 0, 0, TAU); x.fill();
      x.fillStyle = '#081a2c';
      x.beginPath(); x.arc(-9, -40, 1.4, 0, TAU); x.fill();
      x.beginPath(); x.arc(9, -40, 1.4, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.beginPath(); x.arc(-10.4, -42, 1.1, 0, TAU); x.fill();
      x.beginPath(); x.arc(7.6, -42, 1.1, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(30,70,110,0.55)';
      x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(-14, -46); x.quadraticCurveTo(-9, -49, -4, -46); x.stroke();
      x.beginPath(); x.moveTo(14, -46); x.quadraticCurveTo(9, -49, 4, -46); x.stroke();
      x.fillStyle = 'rgba(240,130,145,0.3)';
      x.beginPath(); x.ellipse(-15, -33, 4.4, 2.2, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(15, -33, 4.4, 2.2, 0, 0, TAU); x.fill();
      x.strokeStyle = '#a34752';
      x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(-2.5, -29); x.quadraticCurveTo(0, -27, 2.5, -29); x.stroke();

      // green bow
      x.fillStyle = '#3fbf6a';
      x.beginPath();
      x.moveTo(0, -76);
      x.quadraticCurveTo(-20, -92, -18, -74);
      x.quadraticCurveTo(-16, -64, 0, -70);
      x.quadraticCurveTo(16, -64, 18, -74);
      x.quadraticCurveTo(20, -92, 0, -76);
      x.fill();
      x.fillStyle = '#9ff0b8';
      x.beginPath(); x.arc(0, -76, 2.6, 0, TAU); x.fill();
      // ahoge
      x.strokeStyle = '#b8ffe0';
      x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(0, -80); x.quadraticCurveTo(3, -90, 9, -88); x.stroke();
    }
    return c;
  }

  Art.drawPortrait = function (ctx, who, x, y, scale, flip) {
    const img = portraitCache[who];
    if (!img) return;
    const w = img.width * scale, h = img.height * scale;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /*  UI                                                                 */
  /* ------------------------------------------------------------------ */
  Art.FONT = '"Hiragino Mincho ProN","Yu Mincho","MS Mincho","Songti SC","SimSun","Noto Serif SC",serif';
  Art.SANS = '"Avenir Next","Helvetica Neue",Arial,"Hiragino Sans GB",sans-serif';

  Art.text = function (ctx, str, x, y, size, color, align = 'left', font = Art.FONT, style = '') {
    ctx.save();
    ctx.font = `${style} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  Art.glowText = function (ctx, str, x, y, size, color, glow, align = 'center', font = Art.FONT) {
    ctx.save();
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.45;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.shadowBlur = size * 0.16;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  Art.panelFrame = function (ctx) {
    const x = 426, y = 16, w = 200, h = 448, r = 16;
    // glass card
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(10,36,25,0.88)');
    g.addColorStop(0.55, 'rgba(5,22,15,0.9)');
    g.addColorStop(1, 'rgba(12,40,28,0.88)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(92,240,184,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // top accent
    const tg = ctx.createLinearGradient(x + 20, 0, x + w - 20, 0);
    tg.addColorStop(0, 'rgba(92,240,184,0)');
    tg.addColorStop(0.5, 'rgba(92,240,184,0.75)');
    tg.addColorStop(1, 'rgba(92,240,184,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(x + 20, y + 11, w - 40, 1.4);

    // playfield frame — thin jade line + technical corner brackets
    const px = G.PF.x, py = G.PF.y, pw = G.PF.w, ph = G.PF.h;
    ctx.strokeStyle = 'rgba(92,240,184,0.20)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 3.5, py - 3.5, pw + 7, ph + 7);
    ctx.strokeStyle = 'rgba(92,240,184,0.55)';
    ctx.lineWidth = 1.4;
    const cl = 18;
    for (const [cx, cy, sx, sy] of [
      [px - 3, py - 3, 1, 1], [px + pw + 3, py - 3, -1, 1],
      [px - 3, py + ph + 3, 1, -1], [px + pw + 3, py + ph + 3, -1, -1]
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * cl, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * cl);
      ctx.stroke();
    }
    // side ticks
    ctx.fillStyle = 'rgba(92,240,184,0.35)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px - 8, py + 18 + i * 6, 2, 2);
      ctx.fillRect(px + pw + 6, py + 18 + i * 6, 2, 2);
    }
  };

  Art.lifeIcon = function (ctx, x, y, filled, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, 3.6);
    ctx.bezierCurveTo(-5.4, -0.4, -4.4, -5.2, -1.8, -5.2);
    ctx.bezierCurveTo(-0.6, -5.2, 0, -4.2, 0, -4.2);
    ctx.bezierCurveTo(0, -4.2, 0.6, -5.2, 1.8, -5.2);
    ctx.bezierCurveTo(4.4, -5.2, 5.4, -0.4, 0, 3.6);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = '#2ee6a0';
      ctx.shadowColor = 'rgba(180,255,120,0.9)';
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.fillStyle = 'rgba(200,255,220,0.6)';
      ctx.beginPath(); ctx.arc(-1.6, -2.8, 0.8, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(120,190,160,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  };

  Art.bombIcon = function (ctx, x, y, filled, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(Math.PI / 4);
    if (filled) {
      ctx.fillStyle = '#8fffcf';
      ctx.shadowColor = 'rgba(120,220,255,0.9)';
      ctx.shadowBlur = 6;
      ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-1.6, -1.6, 3.2, 3.2);
    } else {
      ctx.strokeStyle = 'rgba(90,170,140,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-3.2, -3.2, 6.4, 6.4);
    }
    ctx.restore();
  };

  Art.powerBar = function (ctx, x, y, w, power, max) {
    const segs = 4;
    const gap = 2;
    const sw = (w - gap * (segs - 1)) / segs;
    for (let i = 0; i < segs; i++) {
      const sx = x + i * (sw + gap);
      const fill = G.clamp(power - i, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(sx, y, sw, 7);
      if (fill > 0) {
        const g = ctx.createLinearGradient(sx, y, sx, y + 7);
        g.addColorStop(0, '#c8ffe4');
        g.addColorStop(0.5, '#5cf0b8');
        g.addColorStop(1, '#0b6b45');
        ctx.fillStyle = g;
        ctx.fillRect(sx, y, sw * fill, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(sx, y, sw * fill, 1.5);
      }
    }
    ctx.strokeStyle = 'rgba(92,240,184,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 8);
  };

  Art.drawCutIn = function (ctx, t, prog, name, sub) {
    const slide = prog < 0.12 ? G.easeOut(prog / 0.12) : prog > 0.86 ? 1 - G.easeIn((prog - 0.86) / 0.14) : 1;
    const x = G.PF.x + 7, y = 108, w = G.PF.w - 14, h = 92, r = 13;
    ctx.save();
    ctx.globalAlpha = G.clamp(slide, 0, 1);
    ctx.translate((1 - slide) * 120, 0);

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(7,34,23,0.94)');
    g.addColorStop(0.55, 'rgba(4,20,13,0.95)');
    g.addColorStop(1, 'rgba(8,42,28,0.94)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(92,240,184,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // left accent + scanlines
    ctx.fillStyle = 'rgba(92,240,184,0.85)';
    ctx.fillRect(x + 1, y + 16, 2.4, h - 32);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    ctx.globalAlpha *= 0.12;
    ctx.fillStyle = '#5cf0b8';
    for (let yy = y + 3; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);
    ctx.globalAlpha = G.clamp(slide, 0, 1);
    ctx.globalAlpha *= 0.18;
    for (let i = 0; i < 10; i++) {
      const gx = x + ((i * 53 + t * 0.5) % w);
      ctx.fillStyle = '#5cf0b8';
      ctx.fillRect(gx, y + 8, 14, 1);
    }
    ctx.restore();
    ctx.globalAlpha = G.clamp(slide, 0, 1);

    // portrait medallion
    const cx = x + w - 48, cy = y + h / 2, cr = 31;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.clip();
    if (sub === 'cirno') {
      Art.drawPortrait(ctx, 'cirno', cx, cy + 6, 0.26, false);
    } else if (imgReady && bulletImg) {
      ctx.drawImage(bulletImg, 0, 0, bulletImg.width, bulletImg.height, cx - cr, cy - cr, cr * 2, cr * 2);
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#3ad99b';
      ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(8, 70, 46, 0.14)';
      ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    } else {
      Art.drawPortrait(ctx, 'mutsumi', cx, cy + 6, 0.26, false);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(92,240,184,0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(210,255,235,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, cr + 4, 0, TAU); ctx.stroke();

    const tx = x + 22;
    Art.text(ctx, 'BARRAGE', tx, y + 23, 8, 'rgba(120,240,190,0.7)', 'left', Art.SANS, '700');
    ctx.save();
    ctx.font = '21px ' + Art.SANS;
    const maxW = w - 130;
    const tw = ctx.measureText(name).width;
    ctx.restore();
    const fs = tw > maxW ? (21 * maxW) / tw : 21;
    Art.text(ctx, name, tx, y + 47, fs, '#eafff2', 'left', Art.SANS, '800');
    Art.text(ctx, sub === 'cirno' ? '霜见' : '睦子米魔人', tx, y + 68, 9.5, 'rgba(170,220,195,0.7)', 'left', Art.SANS, '600');
    ctx.restore();
  };

  Art.drawDialogBox = function (ctx, opts) {
    const x = 18, y = 326, w = 604, h = 140, r = 16;
    ctx.save();
    ctx.fillStyle = 'rgba(1,10,6,0.4)';
    ctx.fillRect(0, 0, G.W, G.H);

    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(8,34,23,0.96)');
    g.addColorStop(1, 'rgba(3,16,10,0.97)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(92,240,184,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const left = opts.side === 'left';
    // portrait card
    const cardW = 116, cardH = 124;
    const cx0 = left ? x + 12 : x + w - 12 - cardW;
    const cy0 = y + 8;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(cx0, cy0, cardW, cardH, 12); ctx.clip();
    const pg = ctx.createLinearGradient(cx0, cy0, cx0, cy0 + cardH);
    pg.addColorStop(0, 'rgba(20,80,55,0.6)');
    pg.addColorStop(1, 'rgba(4,20,13,0.9)');
    ctx.fillStyle = pg;
    ctx.fillRect(cx0, cy0, cardW, cardH);
    if (opts.portrait === 'mutsumi' && imgReady && bulletImg) {
      ctx.drawImage(bulletImg, 0, 0, bulletImg.width, bulletImg.height, cx0 - 2, cy0 - 6, cardW + 4, cardH + 10);
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#3ad99b';
      ctx.fillRect(cx0, cy0, cardW, cardH);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(8, 70, 46, 0.12)';
      ctx.fillRect(cx0, cy0, cardW, cardH);
    } else {
      Art.drawPortrait(ctx, opts.portrait, cx0 + cardW / 2, cy0 + cardH / 2 + 4, 0.36, !left);
    }
    const shade = ctx.createLinearGradient(0, cy0, 0, cy0 + cardH);
    shade.addColorStop(0, 'rgba(8,50,34,0.12)');
    shade.addColorStop(1, 'rgba(2,16,10,0.6)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx0, cy0, cardW, cardH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(92,240,184,0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx0, cy0, cardW, cardH, 12); ctx.stroke();

    // name pill
    const nx = left ? cx0 + cardW + 16 : x + 24;
    ctx.save();
    ctx.font = '700 12px ' + Art.SANS;
    const nw = ctx.measureText(opts.name).width;
    ctx.restore();
    const nameW = Math.max(110, Math.min(230, nw + 34));
    ctx.fillStyle = 'rgba(92,240,184,0.14)';
    ctx.beginPath(); ctx.roundRect(nx, y - 13, nameW, 26, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(92,240,184,0.45)';
    ctx.stroke();
    Art.text(ctx, opts.name, nx + nameW / 2, y, 12, '#d9ffec', 'center', Art.SANS, '700');

    // text
    const tx = left ? cx0 + cardW + 18 : x + 24;
    const ty = y + 42;
    const maxW = left ? (x + w - 24) - tx : (x + w - 24 - cardW - 20) - tx;
    ctx.save();
    ctx.font = '14px ' + Art.SANS;
    ctx.fillStyle = '#dcf8ea';
    const lines = wrapText(ctx, opts.text, maxW);
    lines.forEach((ln, i) => {
      if (i < 4) ctx.fillText(ln, tx, ty + i * 24);
    });
    ctx.restore();

    // continue arrow
    if (opts.done) {
      const ax = left ? x + w - 30 : x + w - cardW - 42;
      const a = 0.45 + 0.4 * Math.sin(performance.now() * 0.006);
      ctx.fillStyle = `rgba(120,255,200,${a})`;
      ctx.beginPath();
      ctx.moveTo(ax + 13, y + h - 26);
      ctx.lineTo(ax + 26, y + h - 26);
      ctx.lineTo(ax + 19.5, y + h - 17);
      ctx.closePath(); ctx.fill();
      Art.text(ctx, 'Z', ax + 3, y + h - 24, 9, 'rgba(150,220,190,0.55)', 'right', Art.SANS);
    }
    ctx.restore();
  };

  function wrapText(ctx, text, maxW) {
    const out = [];
    let line = '';
    for (const ch of text) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = ch;
      } else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  Art.wrapText = wrapText;

  Art.drawTouchControls = function (ctx, t, opts) {
    // bomb button
    const bx = G.PF.x + G.PF.w - 52, by = G.PF.y + G.PF.h - 56;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(160,220,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, 21, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(20,60,80,0.35)';
    ctx.beginPath(); ctx.arc(bx, by, 20, 0, TAU); ctx.fill();
    Art.text(ctx, '祓符', bx, by, 11, 'rgba(200,240,255,0.9)', 'center', Art.SANS);
    ctx.restore();
  };
})();
