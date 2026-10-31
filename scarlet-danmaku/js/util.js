/* 睦子米魔人 — utility helpers */
(function () {
  'use strict';

  const G = (window.G = window.G || {});

  const TAU = Math.PI * 2;
  G.TAU = TAU;
  G.PF = { x: 32, y: 16, w: 384, h: 448 };
  G.W = 640;
  G.H = 480;

  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  G.smooth = (t) => t * t * (3 - 2 * t);
  G.easeOut = (t) => 1 - (1 - t) * (1 - t);
  G.easeIn = (t) => t * t;
  G.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  G.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  G.choice = (arr) => arr[(Math.random() * arr.length) | 0];
  G.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  G.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  G.angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  G.wrapAngle = (a) => {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };
  G.approachAngle = (cur, target, step) => {
    let d = G.wrapAngle(target - cur);
    if (d > step) d = step;
    if (d < -step) d = -step;
    return cur + d;
  };
  G.pointSegDist = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = G.clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };

  G.fmt = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  G.pad = (n, w = 2) => String(n).padStart(w, '0');

  G.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  G.hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

  /* Deterministic random for background decoration */
  G.RNG = function (seed) {
    let s = seed >>> 0 || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  /* Simple object pool */
  G.Pool = class Pool {
    constructor(factory, size) {
      this.items = new Array(size);
      this.free = new Array(size);
      for (let i = 0; i < size; i++) {
        this.items[i] = factory();
        this.free[i] = size - 1 - i;
      }
      this.factory = factory;
    }
    get() {
      if (this.free.length) return this.items[this.free.pop()];
      return null;
    }
    put(obj) {
      this.free.push(this.items.indexOf(obj));
    }
  };

  G.loadJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  };
  G.saveJSON = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  };

  G.now = () => performance.now();

  /* Color palettes for bullets — index used by patterns */
  G.COLORS = [
    { name: 'jade',    core: '#f0fff8', mid: '#3fe6a2', glow: 'rgba(50,235,160,0.95)',  hue: 155 },
    { name: 'mint',    core: '#f4fff9', mid: '#9dffd0', glow: 'rgba(150,255,210,0.95)', hue: 145 },
    { name: 'teal',    core: '#eefffb', mid: '#2fd6c8', glow: 'rgba(45,220,205,0.95)',  hue: 172 },
    { name: 'aqua',    core: '#eefcff', mid: '#7fe8ff', glow: 'rgba(120,235,255,0.95)', hue: 192 },
    { name: 'emerald', core: '#eefff5', mid: '#1fbf7a', glow: 'rgba(30,200,125,0.95)',  hue: 150 },
    { name: 'seafoam', core: '#f2fff8', mid: '#a8ffe0', glow: 'rgba(165,255,225,0.95)', hue: 160 },
    { name: 'lime',    core: '#f8ffe8', mid: '#c8ff6a', glow: 'rgba(200,255,105,0.95)', hue: 82 },
    { name: 'palegreen', core: '#f6fff0', mid: '#dfffe8', glow: 'rgba(220,255,235,0.95)', hue: 135 },
    { name: 'deep',    core: '#eafff4', mid: '#148f5e', glow: 'rgba(20,150,95,0.95)',   hue: 152 },
    { name: 'white',   core: '#ffffff', mid: '#f4fff8', glow: 'rgba(240,255,248,0.95)', hue: 150 },
    { name: 'bright',  core: '#f0fff8', mid: '#5cf0b8', glow: 'rgba(90,240,185,0.95)',  hue: 158 },
    { name: 'ice',     core: '#f4ffff', mid: '#b8ffe0', glow: 'rgba(185,255,225,0.95)', hue: 165 }
  ];

  G.hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  /* requestAnimationFrame-safe shim for headless */
  G.raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (cb) => setTimeout(() => cb(performance.now()), 16);
})();


/* Canvas roundRect fallback for older browsers */
if (window.CanvasRenderingContext2D && !window.CanvasRenderingContext2D.prototype.roundRect) {
  window.CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rr = typeof r === 'number' ? [r, r, r, r] : (r || [0, 0, 0, 0]);
    const tl = rr[0] || 0, tr = rr[1] || 0, br = rr[2] || 0, bl = rr[3] || 0;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}
