/* ============================================================
   花粉防线 · Pollen Frontier
   一个关于呼吸的塔防游戏
   ============================================================ */
(function () {
  'use strict';

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  const W = 1280;
  const H = 760;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };
  const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInCubic = t => t * t * t;
  const easeOutBack = t => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const fmt = n => Math.round(n).toLocaleString('en-US');

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(20240607);

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, TAU);
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function withAlpha(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ------------------------------------------------------------
  // Data
  // ------------------------------------------------------------
  const HERO_DEFS = {
    dash: {
      key: 'dash',
      name: '阿闪',
      role: '风影游侠',
      skill: '闪身步',
      skillGlyph: '闪',
      skillKey: 'Q',
      color: '#62e2c2',
      colorSoft: '#a7f5df',
      cost: 50,
      range: 178,
      damage: 9,
      rate: .43,
      projectile: 'blade',
      skillCd: 9.5,
      skillRange: 9999,
      skillDesc: '瞬身连斩最前方花粉，留下 4 秒破绽',
      blurb: '脚底抹油的守林人。',
      quote: '快，是唯一的防过敏方式。'
    },
    shiver: {
      key: 'shiver',
      name: '小哆',
      role: '发抖系召唤师',
      skill: '狗熊哆嗦猫',
      skillGlyph: '哆',
      skillKey: 'W',
      color: '#c5a9ff',
      colorSoft: '#e4d8ff',
      cost: 55,
      range: 205,
      damage: 7,
      rate: .92,
      projectile: 'acorn',
      skillCd: 16,
      skillRange: 430,
      skillDesc: '召唤巨猫熊砸地，震得全场花粉发抖',
      blurb: '本体是猫，紧急情况会召唤狗熊。',
      quote: '我、我才没有在发抖！'
    },
    blast: {
      key: 'blast',
      name: '崩崩',
      role: '火药味工程师',
      skill: '我要把你崩飞',
      skillGlyph: '崩',
      skillKey: 'E',
      color: '#ffad64',
      colorSoft: '#ffd6ab',
      cost: 65,
      range: 222,
      damage: 21,
      rate: 1.5,
      projectile: 'shell',
      skillCd: 18,
      skillRange: 390,
      skillDesc: '一炮把花粉原路送回，附带短暂眩晕',
      blurb: '脾气和火药一样冲。',
      quote: '讲道理可以，先让我开一炮。'
    },
    wall: {
      key: 'wall',
      name: '墙墙',
      role: '一人成墙',
      skill: '人墙',
      skillGlyph: '墙',
      skillKey: 'R',
      color: '#8fbaff',
      colorSoft: '#d3e5ff',
      cost: 45,
      range: 152,
      damage: 6,
      rate: 1.08,
      projectile: 'palm',
      skillCd: 23,
      skillRange: 520,
      skillDesc: '在风道上立起一排不愿透露姓名的墙',
      blurb: '一个人，也能站成一支队伍。',
      quote: '想过去？先问过我们五个。'
    }
  };

  const HERO_ORDER = ['dash', 'shiver', 'blast', 'wall'];

  const UPGRADE_COSTS = [60, 95];

  const ENEMY_DEFS = {
    fluff: {
      name: '飘絮',
      hp: 48,
      speed: 58,
      radius: 13,
      reward: 6,
      coreDamage: 1,
      color: '#f3dfa0'
    },
    puff: {
      name: '绒球',
      hp: 215,
      speed: 38,
      radius: 21,
      reward: 13,
      coreDamage: 2,
      armor: .9,
      color: '#e8a66c'
    },
    dart: {
      name: '疾刺',
      hp: 72,
      speed: 92,
      radius: 11,
      reward: 8,
      coreDamage: 1,
      color: '#ffcf7c'
    },
    bee: {
      name: '蜂媒',
      hp: 125,
      speed: 70,
      radius: 15,
      reward: 10,
      coreDamage: 2,
      flying: true,
      color: '#f4c45e'
    },
    elite: {
      name: '蕊卫',
      hp: 980,
      speed: 40,
      radius: 29,
      reward: 45,
      coreDamage: 3,
      armor: .88,
      color: '#d98863'
    },
    boss: {
      name: '山木 · 万蕊母株',
      hp: 4700,
      speed: 29,
      radius: 46,
      reward: 140,
      coreDamage: 7,
      armor: .86,
      boss: true,
      color: '#e8795c'
    }
  };

  const WAVES = [
    {
      title: '风起，飘絮先到',
      sub: '轻飘飘的，但它真的会让人打喷嚏',
      groups: [{ type: 'fluff', count: 6, gap: .9, at: .4 }]
    },
    {
      title: '一团毛茸茸',
      sub: '绒球走得慢，皮倒是很厚',
      groups: [
        { type: 'fluff', count: 8, gap: .72, at: .4 },
        { type: 'puff', count: 2, gap: 3.2, at: 3.5 }
      ]
    },
    {
      title: '逆风疾行',
      sub: '疾刺贴着地面窜过来了',
      groups: [
        { type: 'fluff', count: 8, gap: .65, at: .3 },
        { type: 'dart', count: 5, gap: 1.1, at: 3.1 }
      ]
    },
    {
      title: '蜂媒引路',
      sub: '会飞的花粉，一样得守',
      groups: [
        { type: 'puff', count: 4, gap: 2.4, at: .4 },
        { type: 'bee', count: 3, gap: 2.2, at: 4.4 },
        { type: 'fluff', count: 8, gap: .62, at: 7.5 }
      ]
    },
    {
      title: '过敏季高峰',
      sub: '口罩不够用了，靠人吧',
      groups: [
        { type: 'fluff', count: 12, gap: .48, at: .3 },
        { type: 'puff', count: 5, gap: 2, at: 4.4 },
        { type: 'dart', count: 4, gap: 1, at: 8.2 }
      ]
    },
    {
      title: '嗡嗡嗡',
      sub: '蜂媒成群，注意后排',
      groups: [
        { type: 'bee', count: 6, gap: 1.25, at: .4 },
        { type: 'puff', count: 5, gap: 2.1, at: 3.4 },
        { type: 'fluff', count: 8, gap: .55, at: 7.2 }
      ]
    },
    {
      title: '风道拥堵',
      sub: '数量取胜？那就守得更紧一点',
      groups: [
        { type: 'dart', count: 11, gap: .52, at: .3 },
        { type: 'puff', count: 7, gap: 1.5, at: 3.8 }
      ]
    },
    {
      title: '蕊卫巡视',
      sub: '母株派来了它的近卫',
      groups: [
        { type: 'elite', count: 1, gap: 1, at: .5 },
        { type: 'fluff', count: 9, gap: .58, at: 1.8 },
        { type: 'puff', count: 4, gap: 2.2, at: 5.2 }
      ]
    },
    {
      title: '漫天飞絮',
      sub: '最后一轮试探，别松手',
      groups: [
        { type: 'bee', count: 8, gap: .82, at: .3 },
        { type: 'dart', count: 9, gap: .62, at: 3.2 },
        { type: 'puff', count: 7, gap: 1.5, at: 6.5 }
      ]
    },
    {
      title: '万蕊母株',
      sub: '山木花粉的本体，来了',
      groups: [
        { type: 'boss', count: 1, gap: 1, at: .6 },
        { type: 'fluff', count: 12, gap: .45, at: 2.2 },
        { type: 'bee', count: 6, gap: 1.1, at: 5 },
        { type: 'puff', count: 5, gap: 1.7, at: 8.5 }
      ]
    }
  ];

  const PADS = [
    { x: 90, y: 372 },
    { x: 330, y: 350 },
    { x: 600, y: 345 },
    { x: 618, y: 560 },
    { x: 888, y: 390 },
    { x: 1092, y: 465 }
  ];

  const PAD_RADIUS = 43;

  // ------------------------------------------------------------
  // Path
  // ------------------------------------------------------------
  const RAW_PATH = [
    [-80, 240], [185, 240], [185, 460], [465, 460], [465, 235],
    [765, 235], [765, 525], [1005, 525], [1005, 355], [1175, 355]
  ];

  function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
      x: .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
      y: .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
    };
  }

  const PATH = [];
  for (let i = 0; i < RAW_PATH.length - 1; i++) {
    const p0 = RAW_PATH[i - 1] || RAW_PATH[i];
    const p1 = RAW_PATH[i];
    const p2 = RAW_PATH[i + 1];
    const p3 = RAW_PATH[i + 2] || RAW_PATH[i + 1];
    const steps = 26;
    for (let j = 0; j < steps; j++) {
      if (i > 0 && j === 0) continue;
      PATH.push(catmullRom(p0, p1, p2, p3, j / steps));
    }
  }
  PATH.push({ x: RAW_PATH[RAW_PATH.length - 1][0], y: RAW_PATH[RAW_PATH.length - 1][1] });

  const PATH_SEGMENTS = [];
  let PATH_LEN = 0;
  for (let i = 1; i < PATH.length; i++) {
    const a = PATH[i - 1], b = PATH[i];
    const len = dist(a.x, a.y, b.x, b.y);
    PATH_SEGMENTS.push({ a, b, len, start: PATH_LEN });
    PATH_LEN += len;
  }

  const pointCache = { x: 0, y: 0, tx: 1, ty: 0 };

  function pathAt(d, out) {
    const target = out || { x: 0, y: 0, tx: 1, ty: 0 };
    const dd = clamp(d, 0, PATH_LEN);
    let lo = 0, hi = PATH_SEGMENTS.length - 1, seg = PATH_SEGMENTS[hi];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = PATH_SEGMENTS[mid];
      if (dd < s.start + s.len) { seg = s; hi = mid - 1; }
      else { lo = mid + 1; }
    }
    const t = seg.len ? clamp((dd - seg.start) / seg.len, 0, 1) : 0;
    target.x = lerp(seg.a.x, seg.b.x, t);
    target.y = lerp(seg.a.y, seg.b.y, t);
    const dx = seg.b.x - seg.a.x, dy = seg.b.y - seg.a.y;
    const l = Math.hypot(dx, dy) || 1;
    target.tx = dx / l;
    target.ty = dy / l;
    return target;
  }

  function pathPoint(d) {
    const p = pathAt(d, {});
    return { x: p.x, y: p.y };
  }

  // ------------------------------------------------------------
  // DOM
  // ------------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const el = {
    app: $('#app'),
    canvas: $('#game'),
    waveNum: $('#waveNum'),
    waveDots: $('#waveDots'),
    coreFill: $('#coreFill'),
    coreText: $('#coreText'),
    coreBlock: $('.core-block'),
    dewVal: $('#dewVal'),
    callWave: $('#callWave'),
    callBonus: $('#callBonus'),
    btnSpeed: $('#btnSpeed'),
    btnPause: $('#btnPause'),
    btnSound: $('#btnSound'),
    controls: $('.controls'),
    waveBanner: $('#waveBanner'),
    bannerKicker: $('#bannerKicker'),
    bannerTitle: $('#bannerTitle'),
    bannerSub: $('#bannerSub'),
    bannerCall: $('#bannerCall'),
    hint: $('#hint'),
    toast: $('#toast'),
    callout: $('#callout'),
    bossBar: $('#bossBar'),
    bossHp: $('#bossHp'),
    bossFill: $('#bossFill'),
    heroRoster: $('#heroRoster'),
    skillDock: $('#skillDock'),
    startScreen: $('#startScreen'),
    startBtn: $('#startBtn'),
    startLineup: $('#startLineup'),
    resultScreen: $('#resultScreen'),
    resultKicker: $('#resultKicker'),
    resultTitle: $('#resultTitle'),
    resultSub: $('#resultSub'),
    resultStats: $('#resultStats'),
    restartBtn: $('#restartBtn')
  };

  const ctx = el.canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1, cover: true };
  let staticBg = null;

  // ------------------------------------------------------------
  // Audio
  // ------------------------------------------------------------
  const AudioSys = {
    ac: null,
    master: null,
    musicGain: null,
    enabled: true,
    started: false,
    musicTimer: null,
    noteTimer: null,
    chordTimer: null,
    mutedByUser: false,

    init() {
      if (this.ac) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = .55;
      this.master.connect(this.ac.destination);
      this.musicGain = this.ac.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.master);
    },

    unlock() {
      this.init();
      if (!this.ac) return;
      if (this.ac.state === 'suspended') this.ac.resume();
    },

    tone(freq, dur, type, vol, slide, destination) {
      if (!this.enabled || !this.ac) return;
      const t = this.ac.currentTime;
      const osc = this.ac.createOscillator();
      const g = this.ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(25, slide), t + dur);
      g.gain.setValueAtTime(.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.connect(g);
      g.connect(destination || this.master);
      osc.start(t);
      osc.stop(t + dur + .03);
    },

    noise(dur, vol, freq, q) {
      if (!this.enabled || !this.ac) return;
      const t = this.ac.currentTime;
      const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
      const buffer = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      const src = this.ac.createBufferSource();
      src.buffer = buffer;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq || 1100;
      filter.Q.value = q || .8;
      const g = this.ac.createGain();
      g.gain.value = vol;
      src.connect(filter); filter.connect(g); g.connect(this.master);
      src.start(t);
      src.stop(t + dur + .02);
    },

    sfx(name) {
      if (!this.enabled) return;
      this.unlock();
      switch (name) {
        case 'select':
          this.tone(620, .08, 'triangle', .035, 760);
          break;
        case 'deploy':
          this.tone(330, .16, 'triangle', .055, 440);
          setTimeout(() => this.tone(495, .22, 'sine', .045, 660), 70);
          this.noise(.18, .018, 1700, 1.4);
          break;
        case 'upgrade':
          [392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, .18, 'triangle', .045, f * 1.02), i * 72));
          break;
        case 'shoot':
          this.tone(280, .045, 'square', .012, 160);
          break;
        case 'hit':
          this.noise(.06, .019, 2100, 1.2);
          break;
        case 'kill':
          this.tone(740, .07, 'sine', .02, 1080);
          break;
        case 'dash':
          this.noise(.24, .06, 2800, .7);
          this.tone(900, .18, 'sawtooth', .026, 1500);
          break;
        case 'shiver':
          this.tone(92, .45, 'sine', .11, 46);
          this.noise(.34, .055, 260, .7);
          setTimeout(() => this.tone(660, .3, 'triangle', .045, 880), 180);
          break;
        case 'blast':
          this.noise(.58, .12, 220, .5);
          this.tone(76, .55, 'sawtooth', .1, 31);
          this.tone(180, .38, 'square', .035, 58);
          break;
        case 'wall':
          [196, 294, 392].forEach((f, i) => setTimeout(() => this.tone(f, .45, 'triangle', .038, f), i * 55));
          this.noise(.18, .03, 700, .8);
          break;
        case 'wave':
          this.tone(196, .34, 'triangle', .055, 196);
          setTimeout(() => this.tone(294, .4, 'triangle', .05, 294), 180);
          setTimeout(() => this.tone(392, .55, 'sine', .04, 440), 360);
          break;
        case 'core':
          this.tone(140, .35, 'sawtooth', .06, 70);
          this.noise(.3, .05, 420, .6);
          break;
        case 'early':
          [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, .12, 'sine', .035, f), i * 55));
          break;
        case 'win':
          [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, .65, 'sine', .055, f * 1.005), i * 140));
          break;
        case 'lose':
          [330, 294, 247, 196].forEach((f, i) => setTimeout(() => this.tone(f, .58, 'triangle', .055, f * .96), i * 170));
          break;
        case 'error':
          this.tone(160, .1, 'square', .025, 120);
          break;
        case 'wallBreak':
          this.noise(.4, .07, 900, .5);
          this.tone(220, .25, 'square', .03, 80);
          break;
      }
    },

    startMusic() {
      this.init();
      if (!this.ac || this.musicStarted) return;
      this.unlock();
      this.musicStarted = true;
      this.musicGain.gain.cancelScheduledValues(this.ac.currentTime);
      this.musicGain.gain.setTargetAtTime(.55, this.ac.currentTime, 1.4);

      // Warm drone
      const oscA = this.ac.createOscillator();
      const oscB = this.ac.createOscillator();
      const filter = this.ac.createBiquadFilter();
      const droneGain = this.ac.createGain();
      oscA.type = 'sine'; oscA.frequency.value = 98;
      oscB.type = 'triangle'; oscB.frequency.value = 147.2;
      filter.type = 'lowpass'; filter.frequency.value = 320; filter.Q.value = .4;
      droneGain.gain.value = .035;
      oscA.connect(filter); oscB.connect(filter); filter.connect(droneGain); droneGain.connect(this.musicGain);
      oscA.start(); oscB.start();

      let chordIndex = 0;
      const chords = [
        [146.83, 174.61, 220.00, 293.66],
        [130.81, 164.81, 196.00, 261.63],
        [110.00, 146.83, 174.61, 220.00],
        [123.47, 155.56, 196.00, 246.94]
      ];
      const playChord = () => {
        if (!this.ac || !this.enabled) return;
        const c = chords[chordIndex % chords.length];
        chordIndex++;
        c.forEach((f, i) => {
          this.tone(f, 7.5, i === 0 ? 'sine' : 'triangle', .012 / (i * .3 + 1), f, this.musicGain);
        });
      };
      playChord();
      this.chordTimer = setInterval(playChord, 7600);

      const notes = [293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
      const pluck = () => {
        if (!this.ac || !this.enabled) return;
        const f = pick(notes);
        this.tone(f, 1.2, 'triangle', .012, f * .998, this.musicGain);
        if (Math.random() > .55) {
          setTimeout(() => this.tone(f * 1.5, 1.5, 'sine', .007, f * 1.5, this.musicGain), 320);
        }
      };
      this.noteTimer = setInterval(pluck, 2450);
    },

    setMuted(muted) {
      this.mutedByUser = muted;
      this.enabled = !muted;
      if (this.master && this.ac) {
        this.master.gain.setTargetAtTime(muted ? 0 : .55, this.ac.currentTime, .08);
      }
    }
  };

  // ------------------------------------------------------------
  // Game state
  // ------------------------------------------------------------
  const game = {
    screen: 'menu', // menu | playing | over
    phase: 'prep', // prep | wave | clear
    paused: false,
    speed: 1,
    time: 0,
    realTime: 0,
    wave: 0,
    core: 20,
    maxCore: 20,
    dew: 230,
    kills: 0,
    totalWaves: WAVES.length,
    prep: 13,
    prepMax: 13,
    bannerTimer: 0,
    clearTimer: 0,
    waveTime: 0,
    queue: [],
    enemies: [],
    heroes: new Map(),
    projectiles: [],
    particles: [],
    rings: [],
    slashes: [],
    texts: [],
    ghosts: [],
    beams: [],
    summons: [],
    walls: [],
    timers: [],
    motes: [],
    fireflies: [],
    selectedHero: null,
    hoverPad: -1,
    hoverHero: null,
    mouse: { x: -999, y: -999 },
    shake: 0,
    flash: 0,
    coreFlash: 0,
    boss: null,
    uiDirty: true,
    lastCountdown: -1,
    result: null,
    introBanner: 0,
    combo: 0,
    comboTimer: 0,
    castCount: 0,
    wallBreaks: 0,
    sfxShotCounter: 0
  };

  const cardEls = {};
  const skillEls = {};
  const skillCdCache = {};
  const bossRef = { active: false };

  function createMotes() {
    game.motes = [];
    for (let i = 0; i < 68; i++) {
      game.motes.push({
        x: rand() * W,
        y: rand() * H,
        z: .3 + rand() * 1.5,
        r: .7 + rand() * 2.2,
        phase: rand() * TAU,
        speed: 5 + rand() * 13,
        drift: 3 + rand() * 9,
        warm: rand() > .7
      });
    }
    game.fireflies = [];
    for (let i = 0; i < 13; i++) {
      game.fireflies.push({
        x: rand() * W,
        y: 130 + rand() * 560,
        phase: rand() * TAU,
        speed: .2 + rand() * .5,
        radius: 12 + rand() * 22
      });
    }
  }

  function resetGame() {
    game.screen = 'playing';
    el.app.classList.add('in-game');
    game.phase = 'prep';
    game.paused = false;
    game.speed = 1;
    if (el.btnSpeed) el.btnSpeed.textContent = '1×';
    if (el.controls) el.controls.classList.remove('paused');
    game.time = 0;
    game.wave = 0;
    game.core = game.maxCore;
    game.dew = 230;
    game.kills = 0;
    game.prep = 16;
    game.prepMax = 16;
    game.bannerTimer = 0;
    game.clearTimer = 0;
    game.waveTime = 0;
    game.spawnIndex = 0;
    game.queue = [];
    game.enemies.length = 0;
    game.heroes.clear();
    game.projectiles.length = 0;
    game.particles.length = 0;
    game.rings.length = 0;
    game.slashes.length = 0;
    game.texts.length = 0;
    game.ghosts.length = 0;
    game.beams.length = 0;
    game.summons.length = 0;
    game.walls.length = 0;
    game.timers.length = 0;
    game.selectedHero = null;
    game.hoverPad = -1;
    game.hoverHero = null;
    game.shake = 0;
    game.flash = 0;
    game.coreFlash = 0;
    game.boss = null;
    game.result = null;
    game.combo = 0;
    game.comboTimer = 0;
    game.comicText = null;
    game.lastBannerSecond = -1;
    game.castCount = 0;
    game.wallBreaks = 0;
    game.lastCountdown = -1;
    game.introBanner = 0;
    game.uiDirty = true;
    el.bossBar.classList.remove('show');
    el.btnPause.setAttribute('aria-label', '暂停游戏');
    for (const key of HERO_ORDER) {
      if (cardEls[key]) {
        cardEls[key].classList.remove('selected', 'poor');
      }
    }
    refreshCards();
    syncHud(true);
    showBanner('prep');
    el.resultScreen.classList.add('hidden');
    el.resultScreen.setAttribute('aria-hidden', 'true');
    el.startScreen.classList.add('hidden');
    el.startScreen.setAttribute('aria-hidden', 'true');
    setHint('先选一位守林人，再点击发光的花台布阵');
    AudioSys.startMusic();
  }

  // ------------------------------------------------------------
  // UI build
  // ------------------------------------------------------------
  function buildWaveDots() {
    el.waveDots.innerHTML = '';
    for (let i = 0; i < game.totalWaves; i++) {
      const d = document.createElement('i');
      d.dataset.wave = i + 1;
      el.waveDots.appendChild(d);
    }
  }

  function buildHeroCards() {
    el.heroRoster.innerHTML = '';
    for (const key of HERO_ORDER) {
      const def = HERO_DEFS[key];
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.dataset.hero = key;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${def.name}，${def.skill}，布阵消耗 ${def.cost} 露珠`);
      card.title = `${def.name} · ${def.skill}\n${def.skillDesc}\n${def.quote}`;
      card.style.setProperty('--hc', def.color);
      card.innerHTML = `
        <div class="portrait-wrap">
          <canvas aria-hidden="true"></canvas>
          <span class="level-badge empty">待命</span>
        </div>
        <div class="hero-copy">
          <div class="hero-name-row"><b>${def.name}</b><span class="hero-role">${def.role}</span></div>
          <span class="hero-skill-name"><i></i>${def.skill}</span>
          <div class="hero-bottom">
            <span class="price"><i></i><b>${def.cost}</b></span>
            <button class="mini-action" type="button">布阵</button>
          </div>
        </div>`;
      el.heroRoster.appendChild(card);
      cardEls[key] = card;

      const canvas = card.querySelector('canvas');
      requestAnimationFrame(() => drawPortrait(key, canvas));

      card.addEventListener('click', e => {
        if (e.target.closest('.mini-action')) return;
        onHeroCard(key);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onHeroCard(key);
        }
      });
      bindHintHover(card, `<strong>${def.name}</strong> · ${def.skillDesc}`);
      const action = card.querySelector('.mini-action');
      action.addEventListener('click', e => {
        e.stopPropagation();
        const h = game.heroes.get(key);
        if (h) tryUpgrade(key);
        else {
          selectHero(key);
          showToast(`选好花台，让${def.name}就位`);
        }
      });
    }
  }

  function buildSkillCards() {
    el.skillDock.innerHTML = '';
    for (const key of HERO_ORDER) {
      const def = HERO_DEFS[key];
      const b = document.createElement('button');
      b.className = 'skill-card locked';
      b.type = 'button';
      b.dataset.skill = key;
      b.style.setProperty('--hc', def.color);
      b.setAttribute('aria-label', `${def.skill}，${def.skillDesc}`);
      b.title = `${def.skill}：${def.skillDesc}（冷却 ${def.skillCd} 秒）`;
      b.innerHTML = `
        <span class="skill-glyph">${def.skillGlyph}</span>
        <span class="skill-copy"><b>${def.skill}</b><small>未布阵</small></span>
        <span class="skill-key">${def.skillKey}</span>
        <span class="cd-veil"></span>
        <span class="cd-num"></span>`;
      bindHintHover(b, `<strong>${def.skill}</strong> · ${def.skillDesc} · 冷却 ${def.skillCd} 秒`);
      b.addEventListener('click', () => castSkill(key));
      el.skillDock.appendChild(b);
      skillEls[key] = b;
      skillCdCache[key] = 0;
    }
  }

  function buildStartLineup() {
    el.startLineup.innerHTML = '';
    for (const key of HERO_ORDER) {
      const def = HERO_DEFS[key];
      const item = document.createElement('div');
      item.className = 'lineup-item';
      item.style.setProperty('--hc', def.color);
      item.innerHTML = `
        <div class="lineup-portrait"><canvas aria-hidden="true"></canvas></div>
        <div class="lineup-copy"><b>${def.name}</b><small>${def.skill}</small></div>`;
      el.startLineup.appendChild(item);
      const canvas = item.querySelector('canvas');
      requestAnimationFrame(() => drawPortrait(key, canvas, 1.02));
    }
  }

  function drawPortrait(key, canvas, scale) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 60;
    const h = canvas.clientHeight || 80;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h * .93);
    const s = (scale || 1) * Math.min(w / 62, h / 78);
    drawHero(c, key, 0, 0, {
      scale: s,
      t: 1.2,
      facing: 1,
      attack: 0,
      portrait: true,
      level: 1
    });
    c.restore();
  }

  function setHint(html) {
    if (!html) {
      el.hint.innerHTML = '';
      return;
    }
    el.hint.innerHTML = html;
  }

  let hintBeforeHover = '';
  function bindHintHover(node, html) {
    if (!node) return;
    node.addEventListener('pointerenter', () => {
      hintBeforeHover = el.hint.innerHTML;
      el.hint.innerHTML = html;
    });
    node.addEventListener('pointerleave', () => {
      if (hintBeforeHover) el.hint.innerHTML = hintBeforeHover;
    });
  }

  let toastTimer = null;
  function showToast(text, tone) {
    el.toast.textContent = text;
    el.toast.className = 'toast show' + (tone ? ' ' + tone : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.className = 'toast' + (tone ? ' ' + tone : '');
    }, 1900);
  }

  let calloutTimer = null;
  function showCallout(text, tone) {
    el.callout.textContent = text;
    el.callout.className = 'callout';
    void el.callout.offsetWidth;
    el.callout.className = 'callout show' + (tone ? ' ' + tone : '');
    clearTimeout(calloutTimer);
    calloutTimer = setTimeout(() => {
      el.callout.className = 'callout';
    }, 1080);
  }

  function syncHud(force) {
    const waveLabel = String(game.wave).padStart(2, '0');
    if (force || el.waveNum.dataset.value !== waveLabel) {
      el.waveNum.innerHTML = `${waveLabel} <span>/ ${game.totalWaves}</span>`;
      el.waveNum.dataset.value = waveLabel;
    }

    for (const d of el.waveDots.children) {
      const w = Number(d.dataset.wave);
      d.classList.toggle('done', w < game.wave || (w === game.wave && game.phase !== 'wave'));
      d.classList.toggle('now', w === game.wave && game.phase === 'wave');
    }

    const pct = clamp(game.core / game.maxCore * 100, 0, 100);
    el.coreFill.style.width = pct + '%';
    el.coreText.textContent = game.core;
    el.coreBlock.classList.toggle('low', game.core <= 7);
    el.dewVal.textContent = fmt(game.dew);

    const callActive = game.phase === 'prep';
    const bonus = Math.ceil(game.prep) * 2 + 2;
    el.callBonus.textContent = bonus;
    el.callWave.classList.toggle('is-hidden', !callActive);
    el.bannerCall.classList.toggle('is-hidden', !callActive);
    el.bannerCall.innerHTML = `提前迎战 <b>+${bonus} 露</b>`;
    el.bannerCall.disabled = !callActive;

    refreshCards();
    updateSkillCards();
  }

  function refreshCards() {
    for (const key of HERO_ORDER) {
      const card = cardEls[key];
      if (!card) continue;
      const def = HERO_DEFS[key];
      const h = game.heroes.get(key);
      const badge = card.querySelector('.level-badge');
      const price = card.querySelector('.price b');
      bindHintHover(card, `<strong>${def.name}</strong> · ${def.skillDesc}`);
      const action = card.querySelector('.mini-action');
      let cost = def.cost;
      if (h) {
        cost = h.level < 3 ? UPGRADE_COSTS[h.level - 1] : 0;
        badge.textContent = 'Lv.' + h.level;
        badge.classList.remove('empty');
        price.textContent = h.level < 3 ? cost : 'MAX';
        action.textContent = h.level < 3 ? '升级' : '满级';
        action.disabled = h.level >= 3 || game.dew < cost;
        action.classList.toggle('max', h.level >= 3);
      } else {
        badge.textContent = '待命';
        badge.classList.add('empty');
        price.textContent = def.cost;
        action.textContent = '布阵';
        action.disabled = false;
        action.classList.remove('max');
      }
      card.classList.toggle('poor', game.dew < (h ? (h.level < 3 ? cost : 0) : cost));
      card.classList.toggle('selected', game.selectedHero === key);
    }
  }

  function updateSkillCards() {
    for (const key of HERO_ORDER) {
      const b = skillEls[key];
      const h = game.heroes.get(key);
      const def = HERO_DEFS[key];
      const small = b.querySelector('.skill-copy small');
      if (!h) {
        b.classList.add('locked');
        b.classList.remove('ready');
        small.textContent = '未布阵';
      } else {
        b.classList.remove('locked');
        if (h.skillCd > 0) {
          small.textContent = '冷却中';
          b.classList.remove('ready');
        } else {
          small.textContent = `就绪 · Lv.${h.level}`;
          b.classList.add('ready');
        }
      }
      b.disabled = false;
    }
  }

  function updateCooldownUi() {
    for (const key of HERO_ORDER) {
      const b = skillEls[key];
      const h = game.heroes.get(key);
      if (!b) continue;
      const cd = h ? h.skillCd : 0;
      const max = h ? h.skillCdMax : 1;
      const frac = h ? clamp(cd / max, 0, 1) : 0;
      b.style.setProperty('--cd', frac.toFixed(3));
      const num = b.querySelector('.cd-num');
      if (cd > 0 && h) {
        b.classList.add('on-cd');
        num.textContent = cd >= 10 ? Math.ceil(cd) : Math.ceil(cd * 10) / 10;
      } else {
        b.classList.remove('on-cd');
        num.textContent = '';
      }
    }
  }

  // ------------------------------------------------------------
  // Banner and phase
  // ------------------------------------------------------------
  function showBanner(mode) {
    if (mode === 'prep') {
      game.bannerTimer = 0;
      const next = Math.min(game.wave + 1, game.totalWaves);
      el.bannerKicker.textContent = '布阵阶段';
      el.bannerKicker.classList.remove('warn');
      el.bannerTitle.textContent = `第 ${next} 波还有 ${Math.ceil(game.prep)} 秒`;
      el.bannerSub.textContent = game.wave === 0 ? '把守林人放上花台，花粉马上就到' : '喘口气，补个阵，升级一下';
      el.waveBanner.classList.remove('is-hidden');
    } else if (mode === 'wave') {
      const w = WAVES[game.wave - 1];
      game.bannerTimer = 0;
      game.introBanner = 3.2;
      el.bannerKicker.textContent = `WAVE ${String(game.wave).padStart(2, '0')}`;
      el.bannerKicker.classList.remove('warn');
      el.bannerTitle.textContent = w ? w.title : '花粉来袭';
      el.bannerSub.textContent = w ? w.sub : '';
      el.bannerCall.classList.add('is-hidden');
      el.waveBanner.classList.remove('is-hidden');
      setTimeout(() => {
        if (game.phase === 'wave') el.waveBanner.classList.add('is-hidden');
      }, 3200);
    } else if (mode === 'clear') {
      el.bannerKicker.textContent = 'WAVE CLEAR';
      el.bannerKicker.classList.remove('warn');
      el.bannerTitle.textContent = `第 ${game.wave} 波 · 清空`;
      el.bannerSub.textContent = '呼吸核心回了一点气，露珠也到手了';
      el.bannerCall.classList.add('is-hidden');
      el.waveBanner.classList.remove('is-hidden');
    } else if (mode === 'boss') {
      el.bannerKicker.textContent = 'BOSS';
      el.bannerKicker.classList.add('warn');
      el.bannerTitle.textContent = '山木 · 万蕊母株';
      el.bannerSub.textContent = '它正在把整座山的花粉都吹过来';
      el.waveBanner.classList.remove('is-hidden');
      setTimeout(() => el.waveBanner.classList.add('is-hidden'), 4600);
    }
  }

  function startGame() {
    AudioSys.unlock();
    resetGame();
    buildWaveDots();
    syncHud(true);
    showBanner('prep');
    game.lastBannerSecond = -1;
  }

  function startWave(early) {
    if (game.phase !== 'prep' || game.screen !== 'playing') return;
    if (game.wave >= game.totalWaves) return;
    if (early) {
      const bonus = Math.ceil(game.prep) * 2 + 2;
      game.dew += bonus;
      showToast(`提前迎战，获得 ${bonus} 露珠`, 'good');
      AudioSys.sfx('early');
      spawnDewBurst(1190, 330, bonus);
    }
    game.wave++;
    game.phase = 'wave';
    game.prep = 0;
    game.waveTime = 0;
    game.spawnIndex = 0;
    game.queue = buildWaveQueue(game.wave);
    game.introBanner = 3.2;
    showBanner('wave');
    AudioSys.sfx('wave');
    setHint(`第 ${game.wave} 波 · <strong>${WAVES[game.wave - 1].title}</strong>`);
    game.uiDirty = true;
  }

  function buildWaveQueue(waveIndex) {
    const wave = WAVES[waveIndex - 1];
    if (!wave) return [];
    const q = [];
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        q.push({ type: g.type, time: (g.at || .4) + i * g.gap });
      }
    }
    q.sort((a, b) => a.time - b.time);
    return q;
  }

  function finishWave() {
    if (game.phase !== 'wave' || game.screen !== 'playing') return;
    game.phase = 'clear';
    game.clearTimer = 3.2;
    const bonus = 30 + game.wave * 6;
    game.dew += bonus;
    const heal = game.wave % 3 === 0 ? 2 : 0;
    if (heal) game.core = Math.min(game.maxCore, game.core + heal);
    showBanner('clear');
    showToast(`第 ${game.wave} 波清空 · 露珠 +${bonus}${heal ? ` · 核心 +${heal}` : ''}`, 'good');
    AudioSys.sfx('upgrade');
    game.uiDirty = true;
    if (game.wave >= game.totalWaves) {
      game.phase = 'final';
      setTimeout(() => winGame(), 1800);
    }
  }

  function beginPrep() {
    if (game.screen !== 'playing') return;
    game.phase = 'prep';
    game.prep = 12;
    game.prepMax = 12;
    showBanner('prep');
    setHint('下一波之前，可以升级守林人，或者提前迎战拿露珠');
    game.uiDirty = true;
  }

  // ------------------------------------------------------------
  // Input
  // ------------------------------------------------------------
  function screenToWorld(clientX, clientY) {
    const r = el.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - view.ox) / view.scale,
      y: (clientY - r.top - view.oy) / view.scale
    };
  }

  function findPadAt(x, y) {
    let best = -1, bd = PAD_RADIUS * PAD_RADIUS;
    for (let i = 0; i < PADS.length; i++) {
      const p = PADS[i];
      const d = dist2(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function findHeroAt(x, y) {
    let best = null, bd = 52 * 52;
    for (const [key, h] of game.heroes) {
      const d = dist2(x, y, h.x, h.y - 26);
      if (d < bd) { bd = d; best = key; }
    }
    return best;
  }

  function onHeroCard(key) {
    if (game.screen !== 'playing') return;
    selectHero(key);
  }

  function selectHero(key) {
    if (game.screen !== 'playing') return;
    const def = HERO_DEFS[key];
    if (!def) return;
    if (game.selectedHero === key) {
      game.selectedHero = null;
      setHint('已取消选择');
    } else {
      game.selectedHero = key;
      const h = game.heroes.get(key);
      if (h) {
        setHint(`已选中 <strong>${def.name}</strong> · 技能「${def.skill}」已就绪 · 点击升级`);
      } else {
        setHint(`已选中 <strong>${def.name}</strong> · 点击发光花台布阵 · 消耗 ${def.cost} 露`);
      }
      AudioSys.sfx('select');
    }
    hintBeforeHover = '';
    game.uiDirty = true;
    refreshCards();
  }

  function tryDeploy(padIndex) {
    const key = game.selectedHero;
    if (!key) return;
    const def = HERO_DEFS[key];
    if (padIndex < 0 || padIndex >= PADS.length) return;
    for (const [, h] of game.heroes) {
      if (h.pad === padIndex) {
        showToast('这个花台已经有守林人了', 'bad');
        return;
      }
    }
    if (game.heroes.has(key)) {
      showToast(`${def.name}已经在场上了`, 'bad');
      return;
    }
    if (game.dew < def.cost) {
      showToast(`露珠不够，还差 ${def.cost - game.dew}`, 'bad');
      AudioSys.sfx('error');
      return;
    }
    game.dew -= def.cost;
    const p = PADS[padIndex];
    const h = {
      key,
      pad: padIndex,
      x: p.x,
      y: p.y,
      level: 1,
      attackCd: .3,
      attackAnim: 0,
      skillCd: 0,
      skillCdMax: def.skillCd,
      facing: p.x < 640 ? 1 : -1,
      target: null,
      combo: 0,
      glow: 0,
      deployAnim: 1
    };
    game.heroes.set(key, h);
    game.selectedHero = null;
    game.uiDirty = true;
    AudioSys.sfx('deploy');
    spawnBurst(p.x, p.y - 28, def.color, 22, { speed: 110, size: 3, life: .8, gravity: -20 });
    addRing(p.x, p.y - 22, 20, 82, .55, def.color, 3);
    addText(p.x, p.y - 76, '就位！', def.colorSoft, 17, 1.1);
    showToast(`${def.name}：“${def.quote}”`, 'good');
    setHint(`按 <strong>${def.skillKey}</strong> 释放「${def.skill}」 · 再次点击卡片可查看射程`);
    syncHud(true);
  }

  function tryUpgrade(key) {
    const h = game.heroes.get(key);
    if (!h) return;
    const def = HERO_DEFS[key];
    if (h.level >= 3) {
      showToast(`${def.name}已经满级了`, 'good');
      return;
    }
    const cost = UPGRADE_COSTS[h.level - 1];
    if (game.dew < cost) {
      showToast(`升级还差 ${cost - game.dew} 露珠`, 'bad');
      AudioSys.sfx('error');
      return;
    }
    game.dew -= cost;
    h.level++;
    h.skillCdMax = def.skillCd * (1 - .08 * (h.level - 1));
    h.skillCd = Math.min(h.skillCd, h.skillCdMax);
    AudioSys.sfx('upgrade');
    spawnBurst(h.x, h.y - 30, def.color, 27, { speed: 130, size: 3.2, life: .9, gravity: -30 });
    addRing(h.x, h.y - 26, 18, 92, .6, def.colorSoft, 3.5);
    addText(h.x, h.y - 86, 'Lv.' + h.level, def.colorSoft, 18, 1.2);
    showToast(`${def.name}升到 Lv.${h.level}，攻击与绝技都更强了`, 'good');
    game.uiDirty = true;
    syncHud(true);
  }

  function castSkill(key) {
    if (game.screen !== 'playing' || game.paused) return;
    const h = game.heroes.get(key);
    const def = HERO_DEFS[key];
    if (!h) {
      showToast(`先让${def.name}站上花台`, 'bad');
      AudioSys.sfx('error');
      selectHero(key);
      return;
    }
    if (h.skillCd > 0) {
      showToast(`「${def.skill}」冷却中，还需 ${Math.ceil(h.skillCd)} 秒`, 'bad');
      AudioSys.sfx('error');
      return;
    }
    if (game.enemies.length === 0) {
      showToast('风道上还没有花粉，先省着点', 'bad');
      AudioSys.sfx('error');
      return;
    }

    let target = null;
    if (key === 'dash') {
      target = mostAdvancedEnemy();
    } else if (key === 'wall') {
      target = mostAdvancedEnemyWithin(h, def.skillRange);
    } else {
      target = densestEnemyNear(h, def.skillRange, 96);
    }

    if (!target) {
      showToast(`「${def.skill}」范围内没有花粉`, 'bad');
      AudioSys.sfx('error');
      return;
    }

    h.skillCd = h.skillCdMax;
    h.glow = 1;
    game.castCount++;
    game.uiDirty = true;

    if (key === 'dash') castDash(h, def, target);
    else if (key === 'shiver') castShiver(h, def, target);
    else if (key === 'blast') castBlast(h, def, target);
    else if (key === 'wall') castWall(h, def, target);
  }

  // ------------------------------------------------------------
  // Target helpers
  // ------------------------------------------------------------
  function enemyPos(e) {
    return { x: e.x, y: e.y, baseY: e.baseY };
  }

  function mostAdvancedEnemy() {
    let best = null;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  function mostAdvancedEnemyWithin(h, range) {
    let best = null;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (dist(h.x, h.y, e.x, e.y) > range) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  function densestEnemyNear(h, maxRange, clusterRadius) {
    const candidates = game.enemies.filter(e => !e.dead && dist(h.x, h.y, e.x, e.y) <= maxRange);
    if (!candidates.length) return null;
    let best = null, bestScore = -1;
    for (const e of candidates) {
      let score = 0;
      for (const o of candidates) {
        const d = dist(e.x, e.y, o.x, o.y);
        if (d < clusterRadius) score += 1 + (o.hp / o.maxHp) * .65 + (o.boss ? 2.5 : 0);
      }
      score += e.dist / PATH_LEN * .4;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------
  // Skills
  // ------------------------------------------------------------
  function castDash(h, def, target) {
    const power = 1 + (h.level - 1) * .42;
    const p = { x: target.x, y: target.y };
    h.facing = target.x >= h.x ? 1 : -1;
    AudioSys.sfx('dash');
    showCallout('闪身步！', 'mint');
    game.flash = .18;
    addRing(h.x, h.y - 20, 12, 45, .25, def.colorSoft, 2);
    addBeam(h.x, h.y - 30, p.x, p.y - 20, .22, 4, def.color, .8);
    game.ghosts.push({ key: 'dash', x: h.x, y: h.y, life: .55, maxLife: .55, facing: h.facing, attack: .9 });
    game.ghosts.push({ key: 'dash', x: p.x + 16, y: p.y + 4, life: .5, maxLife: .5, facing: -h.facing, attack: 1 });
    for (let i = 0; i < 3; i++) {
      schedule(i * .1 + .06, () => {
        const pos = { x: target.x, y: target.y };
        addSlash(pos.x + (Math.random() - .5) * 32, pos.y - 26 + (Math.random() - .5) * 24, Math.random() * TAU, def.colorSoft, .22, 58);
        addRing(pos.x, pos.y - 18, 10, 74, .32, def.color, 2.4);
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (dist(e.x, e.y, pos.x, pos.y) < 122) {
            damageEnemy(e, (10 + h.level * 5) * power, { color: def.colorSoft, source: 'dash' });
            applyMark(e, 4.2, 1.3);
          }
        }
        spawnBurst(pos.x, pos.y - 20, def.color, 7, { speed: 80, size: 2, life: .35, gravity: 0 });
      });
    }
    schedule(.38, () => {
      for (const e of game.enemies) {
        if (!e.dead && dist(e.x, e.y, p.x, p.y) < 150) applyMark(e, 4.6, 1.3);
      }
    });
    h.attackAnim = 1;
  }

  function castShiver(h, def, target) {
    const power = 1 + (h.level - 1) * .38;
    const p = { x: target.x, y: target.y };
    addRing(p.x, p.y - 14, 22, 150, .7, def.color, 4);
    addBeam(h.x, h.y - 28, p.x, p.y - 40, .35, 3, def.color, .7);
    game.summons.push({
      kind: 'bearcat',
      x: p.x,
      y: p.y + 8,
      life: 1.25,
      maxLife: 1.25,
      t: 0,
      scale: .96 + h.level * .12
    });
    schedule(.46, () => {
      AudioSys.sfx('shiver');
      game.shake = 13;
      addRing(p.x, p.y - 6, 30, 190, .8, '#e6d8ff', 5);
      addRing(p.x, p.y - 4, 15, 110, .5, def.color, 3);
      spawnBurst(p.x, p.y - 10, def.color, 26, { speed: 160, size: 3, life: .8, gravity: 240 });
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (dist(e.x, e.y, p.x, p.y) < 128) {
          damageEnemy(e, (45 + h.level * 16) * power, { color: def.colorSoft, source: 'shiver' });
          applySlow(e, .48, 5.4);
          stunEnemy(e, e.boss ? .55 : 1.35);
          applyMark(e, 5.4, 1.32);
          addText(e.x, e.y - 38, '哆嗦', '#e8ddff', 12, .8);
        }
      }
      showCallout('狗熊哆嗦猫！', 'violet');
    });
    h.attackAnim = 1;
  }

  function castBlast(h, def, target) {
    const power = 1 + (h.level - 1) * .45;
    const p = { x: target.x, y: target.y };
    h.facing = target.x >= h.x ? 1 : -1;
    h.glow = 1;
    addRing(h.x, h.y - 28, 14, 60, .3, def.colorSoft, 3);
    addText(h.x, h.y - 80, '充能…', '#ffd9b1', 11, .45);
    AudioSys.sfx('shoot');
    schedule(.28, () => {
      AudioSys.sfx('blast');
      game.shake = 22;
      game.flash = .2;
      const predicted = { x: target.x, y: target.y };
      addBeam(h.x + h.facing * 20, h.y - 36, predicted.x, predicted.y - 22, .38, 18, def.color, .95);
      addBeam(h.x + h.facing * 20, h.y - 36, predicted.x, predicted.y - 22, .42, 5, '#fff0c9', .95);
      addRing(predicted.x, predicted.y - 8, 24, 230, .7, '#ffcf91', 7);
      addRing(predicted.x, predicted.y - 8, 12, 145, .55, '#ff8c55', 5);
      spawnBurst(predicted.x, predicted.y - 12, def.color, 40, { speed: 260, size: 4, life: 1, gravity: 320 });
      spawnBurst(predicted.x, predicted.y - 12, '#fff2ce', 20, { speed: 150, size: 2.5, life: .7, gravity: 100 });
      showCallout('我要把你崩飞！', '');
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (dist(e.x, e.y, predicted.x, predicted.y) < 176) {
          const amount = e.boss ? .28 : 1;
          e.dist = Math.max(0, e.dist - 150 * amount);
          e.hitFlash = .18;
          damageEnemy(e, (82 + h.level * 30) * power, { color: '#ffd7ae', source: 'blast' });
          stunEnemy(e, e.boss ? .35 : .8);
          applyMark(e, 3.2, 1.18);
          addText(e.x, e.y - 46, '崩！', '#ffe5c2', 15, .9);
        }
      }
      game.comicText = { text: 'BOOM!', x: predicted.x, y: predicted.y - 66, life: .8, maxLife: .8 };
    });
    h.attackAnim = 1;
  }

  function castWall(h, def, target) {
    const power = 1 + (h.level - 1) * .4;
    const ahead = Math.min(PATH_LEN - 44, target.dist + 52);
    const p = pathAt(ahead, {});
    const hp = (250 + h.level * 90) * power;
    const wall = {
      dist: ahead,
      x: p.x,
      y: p.y,
      tx: p.tx,
      ty: p.ty,
      hp,
      maxHp: hp,
      life: 8.6 + h.level * .5,
      maxLife: 8.6 + h.level * .5,
      flash: 0,
      spawn: 0,
      level: h.level
    };
    game.walls.push(wall);
    AudioSys.sfx('wall');
    showCallout('人墙！', 'blue');
    addRing(wall.x, wall.y, 24, 130, .7, def.colorSoft, 4);
    addBeam(h.x, h.y - 26, wall.x, wall.y - 20, .35, 4, def.color, .75);
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * 20;
      addSlash(wall.x + -wall.ty * off, wall.y + wall.tx * off, Math.PI / 2 + Math.atan2(wall.ty, wall.tx), def.colorSoft, .5, 36);
    }
    spawnBurst(wall.x, wall.y - 20, def.color, 18, { speed: 110, size: 3, life: .7, gravity: -20 });
    h.attackAnim = 1;
  }

  function schedule(delay, fn) {
    game.timers.push({ t: delay, fn });
  }

  // ------------------------------------------------------------
  // Status helpers
  // ------------------------------------------------------------
  function applySlow(e, factor, duration) {
    if (e.dead) return;
    if (duration > 0) {
      if (factor < e.slowFactor || game.time > e.slowUntil) {
        e.slowFactor = factor;
        e.slowUntil = game.time + duration;
      } else {
        e.slowUntil = Math.max(e.slowUntil, game.time + duration);
      }
    }
  }

  function stunEnemy(e, duration) {
    if (e.dead) return;
    e.stunUntil = Math.max(e.stunUntil, game.time + duration);
  }

  function applyMark(e, duration, mult) {
    if (e.dead) return;
    e.markUntil = Math.max(e.markUntil, game.time + duration);
    e.markMult = Math.max(e.markMult || 1, mult || 1.25);
  }

  function enemySpeed(e) {
    let speed = e.speed;
    if (game.time < e.slowUntil) speed *= e.slowFactor;
    // 墙墙的被动：身边的花粉莫名走得慢
    const wallHero = game.heroes.get('wall');
    if (wallHero && dist(e.x, e.y, wallHero.x, wallHero.y) < 155) speed *= .88;
    return speed;
  }

  function damageEnemy(e, amount, opts) {
    if (!e || e.dead) return 0;
    const mark = game.time < e.markUntil ? (e.markMult || 1.25) : 1;
    const dealt = Math.max(1, Math.round(amount * (e.armor || 1) * mark));
    e.hp -= dealt;
    e.hitFlash = .14;
    addText(e.x + (Math.random() - .5) * 12, e.y - e.radius - 14, dealt, opts && opts.color ? opts.color : '#fff3d0', e.boss ? 14 : 11, .55);
    if (Math.random() < .34) spawnBurst(e.x, e.y - e.radius * .6, e.boss ? '#f0906f' : '#f0dfa6', 2, { speed: 45, size: 1.8, life: .3, gravity: 70 });
    if (e.hp <= 0) killEnemy(e);
    return dealt;
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    game.kills++;
    game.dew += e.reward;
    game.combo++;
    game.comboTimer = 1.8;
    addText(e.x, e.y - e.radius - 20, `+${e.reward}`, '#ffd88a', e.boss ? 20 : 11, .9);
    spawnBurst(e.x, e.y - e.radius * .5, e.def.color, e.boss ? 65 : e.radius > 17 ? 22 : 10, {
      speed: e.boss ? 260 : 110,
      size: e.boss ? 5 : 2.6,
      life: e.boss ? 1.4 : .65,
      gravity: e.boss ? 160 : 40
    });
    if (e.boss) {
      game.shake = 25;
      game.flash = .25;
      addRing(e.x, e.y, 20, 300, 1.2, '#ffd3a3', 6);
      showCallout('万蕊散尽。', 'mint');
      game.boss = null;
    } else if (e.type === 'elite') {
      game.shake = 10;
      addRing(e.x, e.y, 15, 150, .7, '#ffcca2', 4);
    }
    AudioSys.sfx(e.boss ? 'win' : 'kill');
    game.uiDirty = true;
    if (Math.random() < .18) {
      addText(e.x, e.y - 54, pick(['阿嚏！', '好痒！', '呜…', '飞走了']), '#d6c9a4', 9, .7);
    }
    game.comboPulse = .2;
  }

  // ------------------------------------------------------------
  // Update
  // ------------------------------------------------------------
  function update(dt) {
    game.time += dt;
    game.realTime += dt;
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 46);
    if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 3.4);
    if (game.coreFlash > 0) game.coreFlash = Math.max(0, game.coreFlash - dt * 2.2);
    if (game.comboTimer > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) game.combo = 0;
    }
    if (game.comboPulse > 0) game.comboPulse -= dt;

    // timers (pausable, game-time based)
    for (let i = game.timers.length - 1; i >= 0; i--) {
      const t = game.timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        game.timers.splice(i, 1);
        t.fn();
      }
    }

    if (game.phase === 'prep') {
      game.prep -= dt;
      const sec = Math.max(0, Math.ceil(game.prep));
      if (sec !== game.lastBannerSecond || game.prep <= 0) {
        game.lastBannerSecond = sec;
        if (game.prep > 0) {
          const next = Math.min(game.wave + 1, game.totalWaves);
          el.bannerTitle.textContent = `第 ${next} 波还有 ${sec} 秒`;
          syncHud(false);
        }
      }
      if (game.prep <= 0) startWave(false);
    } else if (game.phase === 'clear') {
      game.clearTimer -= dt;
      if (game.clearTimer <= 0) beginPrep();
    } else if (game.phase === 'wave') {
      game.waveTime += dt;
      if (game.introBanner > 0) {
        game.introBanner -= dt;
        if (game.introBanner <= 0) el.waveBanner.classList.add('is-hidden');
      }
      while (game.spawnIndex < game.queue.length && game.queue[game.spawnIndex].time <= game.waveTime) {
        spawnEnemy(game.queue[game.spawnIndex].type);
        game.spawnIndex++;
      }
    }

    // heroes
    for (const [, h] of game.heroes) {
      if (h.deployAnim > 0) h.deployAnim = Math.max(0, h.deployAnim - dt * 2.8);
      if (h.attackAnim > 0) h.attackAnim = Math.max(0, h.attackAnim - dt * 4.6);
      if (h.glow > 0) h.glow = Math.max(0, h.glow - dt * 2.2);
      if (h.skillCd > 0) {
        h.skillCd = Math.max(0, h.skillCd - dt);
        if (h.skillCd === 0) {
          addRing(h.x, h.y - 22, 10, 40, .35, HERO_DEFS[h.key].colorSoft, 2);
          game.uiDirty = true;
        }
      }
      h.attackCd -= dt;
      if (game.phase === 'wave' || game.enemies.length) {
        updateHeroAttack(h, dt);
      } else {
        h.target = null;
      }
    }

    // enemies
    updateEnemies(dt);

    // projectiles
    updateProjectiles(dt);

    // walls
    for (let i = game.walls.length - 1; i >= 0; i--) {
      const w = game.walls[i];
      w.life -= dt;
      w.spawn = Math.min(1, w.spawn + dt * 5);
      if (w.flash > 0) w.flash -= dt;
      if (w.life <= 0 || w.hp <= 0) {
        breakWall(w, i);
      }
    }

    // particles / effects
    updateEffects(dt);

    // ambient
    updateMotes(dt);

    // boss bar
    updateBossUi();

    // wave completion
    if (game.phase === 'wave' && game.spawnIndex >= game.queue.length && game.enemies.length === 0) {
      finishWave();
    }

    if (game.uiDirty) {
      game.uiDirty = false;
      syncHud(false);
    }
    updateCooldownUi();

    // defeat check
    if (game.core <= 0 && game.screen === 'playing') {
      loseGame();
    }
  }

  function updateHeroAttack(h, dt) {
    const def = HERO_DEFS[h.key];
    const range = def.range + (h.level - 1) * 13;
    let target = null;
    let bestDist = -1;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist(h.x, h.y, e.x, e.y);
      if (d <= range && e.dist > bestDist) { bestDist = e.dist; target = e; }
    }
    h.target = target;
    if (target) h.facing = target.x >= h.x ? 1 : -1;
    if (!target) return;
    if (h.attackCd > 0) return;
    const mult = 1 + (h.level - 1) * .36;
    const rate = def.rate / (1 + (h.level - 1) * .08);
    h.attackCd = rate;
    h.attackAnim = 1;
    h.combo++;

    let damage = def.damage * mult;
    if (h.key === 'dash' && h.combo % 4 === 0) {
      damage *= 1.8;
      addText(h.x, h.y - 76, '会心', def.colorSoft, 11, .7);
    }

    const startX = h.x + h.facing * 20;
    const startY = h.y - 34;
    game.projectiles.push({
      type: def.projectile,
      x: startX,
      y: startY,
      target,
      tx: target.x,
      ty: target.y,
      speed: h.key === 'dash' ? 820 : h.key === 'shiver' ? 330 : h.key === 'blast' ? 430 : 520,
      damage,
      splash: h.key === 'shiver' ? 66 : h.key === 'blast' ? 76 : 0,
      color: def.color,
      colorSoft: def.colorSoft,
      key: h.key,
      life: 3.2,
      elapsed: 0,
      totalDist: dist(startX, startY, target.x, target.y),
      spin: Math.random() * TAU,
      arc: h.key === 'shiver' ? 45 : 0,
      sourceHero: h.key
    });
    game.sfxShotCounter++;
    if (game.sfxShotCounter % 2 === 0) AudioSys.sfx('shoot');
  }

  function updateEnemies(dt) {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      if (e.dead) { game.enemies.splice(i, 1); continue; }

      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.attackCd > 0) e.attackCd -= dt;
      if (e.spawnAnim < 1) e.spawnAnim = Math.min(1, e.spawnAnim + dt * 3.5);

      let blocked = null;
      if (game.walls.length) {
        for (const w of game.walls) {
          if (w.hp <= 0) continue;
          if (e.dist < w.dist && w.dist - e.dist < e.radius + 34) {
            blocked = w;
            e.dist = w.dist - e.radius - 30;
            break;
          }
        }
      }

      if (blocked) {
        e.blocked = true;
        if (e.attackCd <= 0) {
          e.attackCd = e.boss ? .75 : .85 + Math.random() * .3;
          blocked.hp -= e.boss ? 38 : e.type === 'elite' ? 17 : 8;
          blocked.flash = .16;
          addText(blocked.x + (Math.random() - .5) * 30, blocked.y - 58, e.boss ? 38 : 8, '#a9c8ff', 9, .4);
          spawnBurst(blocked.x + (Math.random() - .5) * 30, blocked.y - 28, '#8fbaff', 3, { speed: 40, size: 1.8, life: .3, gravity: 0 });
          if (blocked.hp <= 0) {
            const idx = game.walls.indexOf(blocked);
            if (idx >= 0) breakWall(blocked, idx);
          }
        }
      } else {
        e.blocked = false;
        const stunned = game.time < e.stunUntil;
        if (!stunned) {
          const spd = enemySpeed(e);
          e.dist += spd * dt;
        }
        if (e.type === 'bee') {
          e.hover = Math.sin(game.time * 5 + e.seed * 8) * 3;
        }
      }

      const pos = pathAt(e.dist, e);
      e.x = pos.x;
      e.y = pos.y;
      e.tx = pos.tx;
      e.ty = pos.ty;
      e.baseY = pos.y;
      e.wobble = Math.sin(game.time * 3.2 + e.seed * 10) * (e.type === 'dart' ? 1.6 : 2.2);

      if (e.type === 'boss') {
        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0 && e.dist < PATH_LEN - 120) {
          e.spawnTimer = 5.2;
          spawnEnemy('fluff', true, Math.max(0, e.dist - 16 - Math.random() * 28));
          addRing(e.x, e.y - 10, 15, 70, .5, '#f6c27c', 3);
        }
      }

      if (e.dist >= PATH_LEN) {
        violateCore(e);
        game.enemies.splice(i, 1);
        continue;
      }
    }
  }

  function updateProjectiles(dt) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const p = game.projectiles[i];
      p.life -= dt;
      p.elapsed += dt;
      if (p.life <= 0) {
        game.projectiles.splice(i, 1);
        continue;
      }
      if (p.target && !p.target.dead) {
        p.tx = p.target.x;
        p.ty = p.target.y - p.target.radius * .55;
      }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= Math.max(14, step + 5)) {
        p.x = p.tx; p.y = p.ty;
        impactProjectile(p);
        game.projectiles.splice(i, 1);
        continue;
      }
      p.x += dx / d * step;
      p.y += dy / d * step;
      p.spin += dt * (p.type === 'shell' ? 5 : p.type === 'acorn' ? 9 : 13);
      if (p.type === 'shell' && Math.random() < .55) {
        game.particles.push({
          x: p.x, y: p.y, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14,
          life: .3 + Math.random() * .2, maxLife: .5, size: 2 + Math.random() * 2,
          color: Math.random() > .5 ? 'rgba(255,190,120,.65)' : 'rgba(110,90,78,.45)',
          gravity: -12, kind: 'smoke'
        });
      }
    }
  }

  function impactProjectile(p) {
    const target = p.target && !p.target.dead ? p.target : null;
    if (p.splash > 0) {
      addRing(p.x, p.y, 4, p.splash * 1.5, .3, p.colorSoft, 2.5);
      spawnBurst(p.x, p.y, p.color, p.key === 'blast' ? 16 : 9, { speed: 100, size: 2.3, life: .5, gravity: 100 });
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (dist(e.x, e.y, p.x, p.y) <= p.splash) {
          damageEnemy(e, p.damage, { color: p.colorSoft, source: p.key });
          if (p.key === 'shiver') applySlow(e, .76, 1.6);
          else if (p.key === 'blast') {
            stunEnemy(e, .18);
            e.dist = Math.max(0, e.dist - (e.boss ? 4 : 14));
          }
        }
      }
      if (p.key === 'blast') game.shake = Math.max(game.shake, 4);
    } else if (target) {
      damageEnemy(target, p.damage, { color: p.colorSoft, source: p.key });
      spawnBurst(p.x, p.y, p.color, 5, { speed: 80, size: 2, life: .35, gravity: 0 });
      if (p.key === 'wall') {
        target.dist = Math.max(0, target.dist - (target.boss ? 1 : 10));
      }
    } else {
      spawnBurst(p.x, p.y, p.color, 3, { speed: 40, size: 1.5, life: .25, gravity: 0 });
    }
    if (p.key === 'blast') {
      addText(p.x, p.y - 20, '轰', '#ffd2a1', 16, .55);
    }
  }

  function breakWall(w, index) {
    if (!w || w.broken) return;
    w.broken = true;
    game.walls.splice(index, 1);
    game.wallBreaks++;
    AudioSys.sfx('wallBreak');
    game.shake = Math.max(game.shake, 7);
    addRing(w.x, w.y, 18, 100, .55, '#c8ddff', 4);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const r = Math.random() * 36;
      game.particles.push({
        x: w.x + Math.cos(a) * r, y: w.y - 28 + Math.sin(a) * 24,
        vx: Math.cos(a) * (50 + Math.random() * 90),
        vy: -40 - Math.random() * 90,
        life: .7 + Math.random() * .4, maxLife: 1.1,
        size: 2 + Math.random() * 2.5, color: 'rgba(168,201,255,.82)',
        gravity: 240, kind: 'spark'
      });
    }
    addText(w.x, w.y - 70, '墙，塌了', '#c8ddff', 12, .9);
  }

  function violateCore(e) {
    const dmg = e.def.coreDamage;
    game.core = Math.max(0, game.core - dmg);
    game.coreFlash = 1;
    game.shake = 14;
    AudioSys.sfx('core');
    addRing(1185, 355, 30, 160, .6, '#ff916e', 5);
    addText(1185, 300, `-${dmg} 呼吸`, '#ffb096', 16, 1);
    showToast(`呼吸核心受损！-${dmg}`, 'bad');
    game.uiDirty = true;
    if (e.boss) {
      game.boss = null;
      el.bossBar.classList.remove('show');
      showCallout('核心破裂！', '');
    }
    if (game.core <= 0) loseGame();
  }

  function spawnEnemy(type, fromBoss, atDist) {
    const base = ENEMY_DEFS[type];
    if (!base) return;
    const waveScale = 1 + (game.wave - 1) * .115;
    const hpScale = type === 'boss' ? 1 : waveScale;
    const speedScale = 1 + (game.wave - 1) * .01;
    const e = {
      id: Math.random().toString(36).slice(2),
      type,
      def: base,
      dist: typeof atDist === 'number' ? atDist : (fromBoss ? Math.max(0, PATH_LEN * .35) : -10 - Math.random() * 18),
      x: -60,
      y: 240,
      baseY: 240,
      tx: 1,
      ty: 0,
      hp: base.hp * hpScale,
      maxHp: base.hp * hpScale,
      speed: base.speed * speedScale,
      radius: base.radius,
      reward: base.reward,
      seed: Math.random(),
      spawnAnim: 0,
      hitFlash: 0,
      attackCd: .4 + Math.random() * .8,
      slowUntil: 0,
      slowFactor: 1,
      stunUntil: 0,
      markUntil: 0,
      markMult: 1,
      blocked: false,
      boss: !!base.boss,
      spawnTimer: 4.5,
      wobble: 0,
      hover: 0,
      dead: false
    };
    game.enemies.push(e);
    if (e.boss) {
      game.boss = e;
      game.shake = 12;
      el.waveBanner.classList.add('is-hidden');
      updateBossUi();
      showCallout('万蕊母株', '');
      addRing(-20, 240, 20, 140, .8, '#ffb592', 5);
    }
    if (!fromBoss) {
      spawnBurst(-12, 240, e.boss ? '#ffc09b' : '#f7df9e', e.boss ? 40 : 8, {
        speed: 90, size: e.boss ? 4 : 2, life: .7, gravity: 30
      });
    }
    game.uiDirty = true;
  }

  function updateBossUi() {
    const b = game.boss;
    if (!b || b.dead || game.screen !== 'playing') {
      el.bossBar.classList.remove('show');
      bossRef.active = false;
      return;
    }
    bossRef.active = true;
    el.bossBar.classList.add('show');
    const pct = clamp(b.hp / b.maxHp * 100, 0, 100);
    el.bossFill.style.width = pct + '%';
    el.bossHp.textContent = Math.ceil(pct) + '%';
  }

  function updateEffects(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.life -= dt;
      if (p.life <= 0) { game.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      p.vx *= (1 - 1.4 * dt);
      p.vy *= (1 - .25 * dt);
    }
    for (let i = game.rings.length - 1; i >= 0; i--) {
      const r = game.rings[i];
      r.life -= dt;
      if (r.life <= 0) { game.rings.splice(i, 1); continue; }
      const t = 1 - r.life / r.maxLife;
      r.r = lerp(r.r0, r.r1, easeOutCubic(t));
      r.alpha = Math.pow(1 - t, 1.5);
    }
    for (let i = game.slashes.length - 1; i >= 0; i--) {
      const s = game.slashes[i];
      s.life -= dt;
      if (s.life <= 0) game.slashes.splice(i, 1);
    }
    for (let i = game.texts.length - 1; i >= 0; i--) {
      const t = game.texts[i];
      t.life -= dt;
      t.y -= 27 * dt;
      if (t.life <= 0) game.texts.splice(i, 1);
    }
    for (let i = game.ghosts.length - 1; i >= 0; i--) {
      const g = game.ghosts[i];
      g.life -= dt;
      if (g.life <= 0) game.ghosts.splice(i, 1);
    }
    for (let i = game.beams.length - 1; i >= 0; i--) {
      const b = game.beams[i];
      b.life -= dt;
      if (b.life <= 0) game.beams.splice(i, 1);
    }
    for (let i = game.summons.length - 1; i >= 0; i--) {
      const s = game.summons[i];
      s.life -= dt;
      s.t += dt;
      if (s.life <= 0) game.summons.splice(i, 1);
    }
    if (game.comicText) {
      game.comicText.life -= dt;
      if (game.comicText.life <= 0) game.comicText = null;
    }
  }

  function updateMotes(dt) {
    for (const m of game.motes) {
      m.y += Math.sin(game.time * .55 + m.phase) * m.drift * dt;
      m.x += m.speed * dt;
      if (m.x > W + 20) { m.x = -20; m.y = rand() * H; }
      if (m.y < 20) m.y = H - 20;
      if (m.y > H - 20) m.y = 20;
    }
  }

  // ------------------------------------------------------------
  // Effects helpers
  // ------------------------------------------------------------
  function addRing(x, y, r0, r1, life, color, width) {
    game.rings.push({ x, y, r0, r1, r: r0, life, maxLife: life, color, width: width || 2, alpha: 1 });
  }

  function addSlash(x, y, angle, color, life, length) {
    game.slashes.push({ x, y, angle, color, life, maxLife: life, length: length || 50 });
  }

  function addText(x, y, text, color, size, life) {
    if (game.texts.length > 80) game.texts.shift();
    game.texts.push({ x, y, text: String(text), color, size: size || 11, life, maxLife: life, vy: 30 });
  }

  function addBeam(x1, y1, x2, y2, life, width, color, alpha) {
    game.beams.push({ x1, y1, x2, y2, life, maxLife: life, width, color, alpha: alpha || 1 });
  }

  function spawnBurst(x, y, color, count, opts) {
    const o = opts || {};
    if (game.particles.length > 620) game.particles.splice(0, game.particles.length - 620);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = (o.speed || 90) * (.25 + Math.random() * .9);
      game.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: (o.life || .6) * (.55 + Math.random() * .7),
        maxLife: o.life || .6,
        size: (o.size || 2) * (.6 + Math.random() * .9),
        color,
        gravity: o.gravity || 0,
        kind: Math.random() > .65 ? 'leaf' : 'spark',
        rot: Math.random() * TAU,
        spin: (Math.random() - .5) * 9
      });
    }
  }

  function spawnDewBurst(x, y, amount) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.7;
      game.particles.push({
        x, y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80,
        life: .7, maxLife: .7, size: 3, color: '#ffd88a', gravity: 280, kind: 'spark', rot: 0, spin: 0
      });
    }
    addText(x, y - 40, `+${amount} 露`, '#ffe0a0', 14, 1);
  }

  // ------------------------------------------------------------
  // Win / lose
  // ------------------------------------------------------------
  function winGame() {
    if (game.screen !== 'playing' && game.screen !== 'over') return;
    game.screen = 'over';
    game.paused = true;
    el.waveBanner.classList.add('is-hidden');
    el.bossBar.classList.remove('show');
    AudioSys.sfx('win');
    const total = Math.round(game.time);
    el.resultKicker.textContent = '十波尽退 · 守林成功';
    el.resultTitle.textContent = '呼吸，保住了。';
    el.resultSub.textContent = '山木花粉退回了风里。今天也没有人打喷嚏。';
    el.resultStats.innerHTML = `
      <div><b>${game.wave}</b><small>守住的波次</small></div>
      <div><b>${game.kills}</b><small>清除的花粉</small></div>
      <div><b>${game.core}</b><small>剩余呼吸</small></div>
      <div><b>${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}</b><small>守林用时</small></div>`;
    el.resultScreen.classList.remove('lost');
    el.resultScreen.classList.remove('hidden');
    el.resultScreen.setAttribute('aria-hidden', 'false');
    el.restartBtn.innerHTML = '<span>再守一次</span><svg viewBox="0 0 24 24" fill="none"><path d="M20 8a8 8 0 1 0 .6 7.5M20 4v4.5h-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function loseGame() {
    if (game.screen !== 'playing') return;
    game.core = 0;
    game.screen = 'over';
    game.paused = true;
    el.waveBanner.classList.add('is-hidden');
    el.bossBar.classList.remove('show');
    AudioSys.sfx('lose');
    el.resultKicker.textContent = `第 ${game.wave} 波 · 防线失守`;
    el.resultTitle.textContent = '这口气，没守住。';
    el.resultSub.textContent = '花粉灌进了呼吸核心。再摆一次阵，把它们吹回去。';
    el.resultStats.innerHTML = `
      <div><b>${game.wave}</b><small>抵达的波次</small></div>
      <div><b>${game.kills}</b><small>清除的花粉</small></div>
      <div><b>${game.heroes.size}</b><small>上阵守林人</small></div>
      <div><b>${game.castCount}</b><small>释放的绝技</small></div>`;
    el.resultScreen.classList.add('lost');
    el.resultScreen.classList.remove('hidden');
    el.resultScreen.setAttribute('aria-hidden', 'false');
    el.restartBtn.innerHTML = '<span>再守一次</span><svg viewBox="0 0 24 24" fill="none"><path d="M20 8a8 8 0 1 0 .6 7.5M20 4v4.5h-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    syncHud(true);
  }

  // ------------------------------------------------------------
  // Resize / viewport
  // ------------------------------------------------------------
  function resize() {
    const cw = el.canvas.clientWidth;
    const ch = el.canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = cw;
    view.h = ch;
    view.dpr = dpr;
    el.canvas.width = Math.max(1, Math.round(cw * dpr));
    el.canvas.height = Math.max(1, Math.round(ch * dpr));
    const ratio = cw / ch;
    view.cover = ratio >= 1.72;
    view.scale = view.cover ? Math.max(cw / W, ch / H) : Math.min(cw / W, ch / H);
    view.ox = (cw - W * view.scale) / 2;
    view.oy = (ch - H * view.scale) / 2;
    if (view.cover && ch < 540) view.oy -= 34;
    else if (view.cover && ch < 620) view.oy -= 14;
    // keep UI readable on very wide/short windows
    if (view.cover && view.scale * W < cw) view.ox = (cw - W * view.scale) / 2;
    for (const key of HERO_ORDER) {
      const card = cardEls[key];
      if (card) drawPortrait(key, card.querySelector('canvas'));
    }
    Array.from(el.startLineup.children).forEach((item, i) => {
      const canvas = item.querySelector('canvas');
      if (canvas) drawPortrait(HERO_ORDER[i] || 'dash', canvas, 1.02);
    });
  }

  function applyWorldTransform() {
    const d = view.dpr;
    const sh = game.shake;
    const sx = sh ? (Math.random() - .5) * sh : 0;
    const sy = sh ? (Math.random() - .5) * sh * .7 : 0;
    ctx.setTransform(d * view.scale, 0, 0, d * view.scale, d * (view.ox + sx * view.scale), d * (view.oy + sy * view.scale));
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  function render(now) {
    const d = view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.fillStyle = '#07140f';
    ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
    applyWorldTransform();

    if (staticBg) ctx.drawImage(staticBg, 0, 0, W, H);

    drawAmbientBack();
    drawPads();
    drawCore();
    drawSpawnGate();
    drawSelection();

    for (const [, h] of game.heroes) drawHeroOnField(h, now);
    drawGhosts();

    const sorted = game.enemies.slice().sort((a, b) => (a.baseY || a.y) - (b.baseY || b.y));
    for (const e of sorted) drawEnemy(e);

    drawWalls();
    drawProjectiles();
    drawBeams();
    drawSummons();
    drawEffects();
    drawAmbientFront();

    if (game.flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,247,220,${game.flash * .55})`;
      ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
    }

    // soft edge for letterboxed view
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(2,9,6,.24)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (game.paused && game.screen === 'playing') drawPaused();
    if (game.screen === 'menu') drawMenuWash();
  }

  function drawMenuWash() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, el.canvas.height);
    g.addColorStop(0, 'rgba(4,14,10,.2)');
    g.addColorStop(1, 'rgba(4,14,10,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.restore();
  }

  function drawPaused() {
    const d = view.dpr || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(2,9,6,.5)';
    ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(244,239,223,.92)';
    ctx.font = `800 ${34 * d}px "Songti SC", "STSong", serif`;
    ctx.fillText('暂停', el.canvas.width / 2, el.canvas.height / 2 - 3 * d);
    ctx.fillStyle = 'rgba(180,202,188,.72)';
    ctx.font = `600 ${11 * d}px "PingFang SC", sans-serif`;
    ctx.fillText('PAUSED · 按空格继续', el.canvas.width / 2, el.canvas.height / 2 + 25 * d);
    ctx.restore();
  }

  function drawAmbientBack() {
    // slow wind streaks
    const t = game.realTime;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = 160 + i * 160 + Math.sin(t * .13 + i) * 18;
      const x = ((t * 16 + i * 410) % (W + 360)) - 180;
      ctx.strokeStyle = `rgba(229,240,202,${.025 + i * .006})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 90, y - 14, x + 180, y + 8, x + 320, y - 8);
      ctx.stroke();
    }
    // motes behind objects
    for (const m of game.motes) {
      if (m.z > 1.2) continue;
      const tw = .55 + .45 * Math.sin(t * 1.2 + m.phase);
      ctx.fillStyle = m.warm ? `rgba(255,211,139,${.16 * tw})` : `rgba(227,244,190,${.13 * tw})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * m.z, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAmbientFront() {
    const t = game.realTime;
    ctx.save();
    for (const f of game.fireflies) {
      const x = f.x + Math.sin(t * f.speed + f.phase) * f.radius;
      const y = f.y + Math.cos(t * f.speed * .8 + f.phase) * f.radius * .55;
      const a = .3 + .3 * Math.sin(t * 2 + f.phase);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 13);
      grd.addColorStop(0, `rgba(225,255,175,${a})`);
      grd.addColorStop(.3, `rgba(201,245,150,${a * .3})`);
      grd.addColorStop(1, 'rgba(201,245,150,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, TAU);
      ctx.fill();
    }
    for (const m of game.motes) {
      if (m.z <= 1.2) continue;
      const tw = .55 + .45 * Math.sin(t * 1.6 + m.phase);
      ctx.fillStyle = m.warm ? `rgba(255,217,153,${.34 * tw})` : `rgba(230,247,194,${.27 * tw})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (m.z - .5), 0, TAU);
      ctx.fill();
      if (m.z > 1.45) {
        ctx.fillStyle = m.warm ? `rgba(255,225,175,${.1 * tw})` : `rgba(233,249,203,${.08 * tw})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 2.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPads() {
    const selected = game.selectedHero;
    const deployed = new Set(Array.from(game.heroes.values()).map(h => h.pad));
    for (let i = 0; i < PADS.length; i++) {
      const p = PADS[i];
      const occupied = deployed.has(i);
      const hover = game.hoverPad === i;
      const available = selected && !occupied && !game.heroes.has(selected);
      const pulse = .5 + .5 * Math.sin(game.realTime * 2.4 + i * .8);

      ctx.save();
      // ground shadow
      ctx.fillStyle = 'rgba(4,13,9,.28)';
      ellipse(ctx, p.x, p.y + 12, 47, 18);
      ctx.fill();

      // ring
      ctx.strokeStyle = occupied ? 'rgba(201,225,194,.16)' : available ? withAlpha(HERO_DEFS[selected].color, .4 + pulse * .25) : 'rgba(216,233,195,.2)';
      ctx.lineWidth = available ? 2.2 : 1.2;
      ctx.setLineDash(occupied ? [] : [4, 8]);
      ctx.beginPath();
      ctx.arc(p.x, p.y + 2, PAD_RADIUS - 4, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      // platform
      const g = ctx.createRadialGradient(p.x - 10, p.y - 8, 2, p.x, p.y + 2, 44);
      g.addColorStop(0, occupied ? 'rgba(69,104,81,.42)' : 'rgba(77,112,84,.38)');
      g.addColorStop(.7, 'rgba(23,51,39,.55)');
      g.addColorStop(1, 'rgba(9,27,20,.22)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 4, PAD_RADIUS - 8, 0, TAU);
      ctx.fill();

      // moss rim
      ctx.strokeStyle = occupied ? 'rgba(220,236,198,.14)' : 'rgba(203,225,187,.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 2, PAD_RADIUS - 9, .25, TAU - .32);
      ctx.stroke();

      // little leaves
      for (let k = 0; k < 3; k++) {
        const a = .6 + k * 2.1 + i;
        const lx = p.x + Math.cos(a) * (PAD_RADIUS - 5);
        const ly = p.y + 2 + Math.sin(a) * (PAD_RADIUS - 12);
        ctx.fillStyle = 'rgba(174,208,135,.2)';
        ellipse(ctx, lx, ly, 4.5, 2.1, a);
        ctx.fill();
      }

      if (!occupied) {
        const bob = Math.sin(game.realTime * 2 + i) * 2;
        // sprout
        ctx.strokeStyle = 'rgba(201,232,167,.38)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 7);
        ctx.quadraticCurveTo(p.x - 2, p.y - 5 + bob, p.x + 4, p.y - 13 + bob);
        ctx.stroke();
        ctx.fillStyle = 'rgba(201,232,167,.32)';
        ellipse(ctx, p.x - 2, p.y - 8 + bob, 6, 2.5, -.5);
        ctx.fill();
        ellipse(ctx, p.x + 7, p.y - 14 + bob, 5.5, 2.3, .55);
        ctx.fill();

        if (available) {
          const col = HERO_DEFS[selected].color;
          ctx.strokeStyle = withAlpha(col, .22 + pulse * .2);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y + 2, PAD_RADIUS - 12 + pulse * 3, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = withAlpha(col, .2);
          ctx.beginPath();
          ctx.arc(p.x, p.y - 1, 5 + pulse * 1.5, 0, TAU);
          ctx.fill();
          ctx.fillStyle = withAlpha(col, .55);
          ctx.font = '700 16px "PingFang SC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+', p.x, p.y + 6);
        }
      }

      if (hover && !occupied) {
        ctx.strokeStyle = 'rgba(241,249,213,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 2, PAD_RADIUS - 1, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // deployment ghost
    if (game.selectedHero && !game.heroes.has(game.selectedHero) && game.hoverPad >= 0 && !deployed.has(game.hoverPad)) {
      const def = HERO_DEFS[game.selectedHero];
      const p = PADS[game.hoverPad];
      const can = game.dew >= def.cost;
      drawRangeCircle(p.x, p.y, def.range, can ? def.color : '#ff8b6e', .13, [5, 7]);
      ctx.save();
      ctx.globalAlpha = .58;
      drawHero(ctx, game.selectedHero, p.x, p.y + 2, { scale: 1, t: game.realTime, facing: p.x < 640 ? 1 : -1, attack: 0 });
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 10px "PingFang SC", sans-serif';
      ctx.fillStyle = can ? 'rgba(233,247,210,.9)' : 'rgba(255,150,120,.95)';
      ctx.fillText(can ? `${def.name} · ${def.cost} 露` : `还差 ${def.cost - game.dew} 露`, p.x, p.y + 66);
      ctx.restore();
    }
  }

  function drawRangeCircle(x, y, radius, color, alpha, dash) {
    ctx.save();
    ctx.strokeStyle = withAlpha(color, alpha);
    ctx.fillStyle = withAlpha(color, alpha * .12);
    ctx.lineWidth = 1.4;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawSelection() {
    if (!game.selectedHero) return;
    const h = game.heroes.get(game.selectedHero);
    if (!h) return;
    const def = HERO_DEFS[h.key];
    drawRangeCircle(h.x, h.y, def.range + (h.level - 1) * 13, def.color, .12, [5, 8]);
    ctx.save();
    ctx.strokeStyle = withAlpha(def.color, .3 + .1 * Math.sin(game.realTime * 3));
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(h.x, h.y + 1, 42, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(7,21,16,.8)';
    rr(ctx, h.x - 32, h.y + 51, 64, 20, 10);
    ctx.fill();
    ctx.strokeStyle = withAlpha(def.color, .26);
    ctx.stroke();
    ctx.fillStyle = def.colorSoft;
    ctx.font = '700 9px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${h.level} · ${def.name}`, h.x, h.y + 64);
    ctx.restore();
  }

  function drawWalls() {
    for (const w of game.walls) {
      const t = game.time;
      const nx = -w.ty, ny = w.tx;
      const rise = easeOutBack(clamp(w.spawn, 0, 1));
      const half = 54;
      const bx1 = w.x - nx * half, by1 = w.y - ny * half;
      const bx2 = w.x + nx * half, by2 = w.y + ny * half;

      ctx.save();
      // ground shadow
      ctx.fillStyle = 'rgba(3,12,18,.34)';
      ellipse(ctx, w.x, w.y + 8, 58, 13, Math.atan2(w.ty, w.tx));
      ctx.fill();

      // translucent curtain
      const curtain = ctx.createLinearGradient(w.x, w.y - 70, w.x, w.y + 10);
      curtain.addColorStop(0, `rgba(167,208,255,${.03 + w.flash * .2})`);
      curtain.addColorStop(.55, `rgba(144,190,255,${.13 + w.flash * .25})`);
      curtain.addColorStop(1, `rgba(104,155,226,${.25 + w.flash * .25})`);
      ctx.fillStyle = curtain;
      ctx.beginPath();
      ctx.moveTo(bx1, by1 + 8);
      ctx.lineTo(bx2, by2 + 8);
      ctx.lineTo(bx2, by2 - (60 + Math.sin(t * 3) * 2) * rise);
      ctx.quadraticCurveTo(w.x, w.y - 88 * rise, bx1, by1 - (60 + Math.sin(t * 3 + 1.2) * 2) * rise);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(188,220,255,${.24 + w.flash * .3})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // curtain filaments
      ctx.strokeStyle = `rgba(209,233,255,${.13 + .03 * Math.sin(t * 4)})`;
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const k = i / 5;
        const fxp = lerp(bx1, bx2, k);
        const fyp = lerp(by1, by2, k);
        ctx.beginPath();
        ctx.moveTo(fxp, fyp + 4);
        ctx.lineTo(fxp + Math.sin(t * 2 + i) * 2, fyp - 55 * rise);
        ctx.stroke();
      }

      // five linked ghosts
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 22;
        const gx = w.x + nx * off;
        const gy = w.y + ny * off;
        const bob = Math.sin(t * 3 + i * 1.3) * 1.2;
        const a = clamp(w.spawn * 1.15, 0, 1) * (.64 + .13 * Math.sin(t * 3.4 + i));
        ctx.save();
        ctx.translate(gx, gy + 8 + bob);
        ctx.globalAlpha = a;
        // body
        ctx.fillStyle = 'rgba(171,209,255,.5)';
        rr(ctx, -8, -48, 16, 38, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(213,236,255,.52)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // head
        ctx.fillStyle = 'rgba(220,239,255,.66)';
        ctx.beginPath();
        ctx.arc(0, -57, 9, 0, TAU);
        ctx.fill();
        // helmet-ish cap
        ctx.fillStyle = 'rgba(133,180,247,.66)';
        ctx.beginPath();
        ctx.arc(0, -59, 9.2, Math.PI * .95, Math.PI * 2.05);
        ctx.fill();
        // linked arms
        if (i < 4) {
          ctx.strokeStyle = 'rgba(190,220,255,.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(7, -38);
          ctx.lineTo(18, -36);
          ctx.stroke();
        }
        if (i > 0) {
          ctx.strokeStyle = 'rgba(190,220,255,.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-7, -38);
          ctx.lineTo(-18, -36);
          ctx.stroke();
        }
        // shield glint
        ctx.fillStyle = 'rgba(227,243,255,.3)';
        ctx.beginPath();
        ctx.arc(-3, -36, 1.6, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // ghostly shield arcs
      ctx.strokeStyle = `rgba(177,212,255,${.28 + w.flash * .3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w.x, w.y - 27, 48, 34, Math.atan2(w.ty, w.tx), .15, Math.PI - .15);
      ctx.stroke();

      // hp bar
      const pct = clamp(w.hp / w.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(5,16,25,.8)';
      rr(ctx, w.x - 48, w.y - 99, 96, 10, 5);
      ctx.fill();
      ctx.fillStyle = pct > .35 ? 'rgba(151,193,255,.92)' : 'rgba(255,149,112,.95)';
      rr(ctx, w.x - 46, w.y - 97, 92 * pct, 6, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(215,235,255,.9)';
      ctx.font = '700 8px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('人 墙 · ' + Math.ceil(w.hp), w.x, w.y - 104);
      ctx.restore();
    }
  }

  function drawCore() {
    const x = 1188, y = 352;
    const t = game.realTime;
    const pct = clamp(game.core / game.maxCore, 0, 1);
    const pulse = 1 + Math.sin(t * 2.2) * .045;
    const col = game.coreFlash > 0 ? '#ff9b7c' : pct > .55 ? '#a6efb4' : pct > .25 ? '#ffd07a' : '#ff8c70';

    ctx.save();
    // glow
    const g = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 118);
    g.addColorStop(0, withAlpha(col, .2 + game.coreFlash * .15));
    g.addColorStop(.45, withAlpha(col, .06));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 20, 118, 0, TAU);
    ctx.fill();

    // dais
    ctx.fillStyle = 'rgba(4,15,10,.4)';
    ellipse(ctx, x, y + 30, 74, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(47,75,55,.75)';
    ellipse(ctx, x, y + 25, 62, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(183,213,159,.23)';
    ctx.lineWidth = 2;
    ellipse(ctx, x, y + 25, 54, 12.5);
    ctx.stroke();

    // roots / arcs
    ctx.strokeStyle = withAlpha(col, .2);
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * .95 + i * .38 + Math.sin(t * .3 + i) * .06;
      const r = 52 + Math.sin(t * .8 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 28, y + 4 + Math.sin(a) * 20);
      ctx.quadraticCurveTo(
        x + Math.cos(a) * r * .9, y - 20 + Math.sin(a) * 30,
        x + Math.cos(a) * r, y - 36 + Math.sin(a) * 18
      );
      ctx.stroke();
    }

    // floating rings
    ctx.strokeStyle = withAlpha(col, .19);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 42 * pulse, 14 * pulse, Math.sin(t * .3) * .2, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 58 * pulse, 18 * pulse, Math.sin(t * .3 + 1) * .2, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // crystalline heart
    ctx.translate(x, y - 34 + Math.sin(t * 1.6) * 2);
    const grd = ctx.createLinearGradient(0, -58, 0, 24);
    grd.addColorStop(0, '#f7f4c4');
    grd.addColorStop(.3, col);
    grd.addColorStop(.75, withAlpha(col, .9));
    grd.addColorStop(1, 'rgba(38,99,77,.9)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.bezierCurveTo(23, -45, 31, -18, 19, 8);
    ctx.bezierCurveTo(12, 23, 3, 27, 0, 26);
    ctx.bezierCurveTo(-3, 27, -12, 23, -19, 8);
    ctx.bezierCurveTo(-31, -18, -23, -45, 0, -58);
    ctx.fill();
    ctx.strokeStyle = 'rgba(248,255,221,.42)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // inner leaf
    ctx.fillStyle = 'rgba(255,255,230,.34)';
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.quadraticCurveTo(13, -24, 0, -3);
    ctx.quadraticCurveTo(-12, -23, 0, -44);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239,255,218,.36)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(0, -8);
    ctx.stroke();

    // orbiting leaves
    for (let i = 0; i < 4; i++) {
      const a = t * .42 + i * TAU / 4;
      const ox = Math.cos(a) * 54;
      const oy = Math.sin(a) * 16 - 20;
      ctx.fillStyle = withAlpha(col, .45);
      ellipse(ctx, ox, oy, 4, 1.8, a);
      ctx.fill();
    }
    ctx.restore();

    // label
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(7,20,14,.58)';
    rr(ctx, x - 45, y + 46, 90, 35, 13);
    ctx.fill();
    ctx.strokeStyle = 'rgba(218,239,200,.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(236,246,216,.82)';
    ctx.font = '700 9px "PingFang SC", sans-serif';
    ctx.fillText('呼 吸 核 心', x, y + 59);
    ctx.fillStyle = withAlpha(col, .88);
    ctx.font = '800 12px "PingFang SC", sans-serif';
    ctx.fillText(`${game.core} / ${game.maxCore}`, x, y + 74);
    ctx.restore();
  }

  function drawSpawnGate() {
    const t = game.realTime;
    const bx = 24, by = 250;
    ctx.save();
    // heat haze / pollen halo
    const g = ctx.createRadialGradient(bx, by - 24, 4, bx, by - 24, 122);
    g.addColorStop(0, 'rgba(255,174,150,.26)');
    g.addColorStop(.45, 'rgba(224,126,133,.1)');
    g.addColorStop(1, 'rgba(205,125,137,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by - 24, 122, 0, TAU);
    ctx.fill();

    // roots gripping the path mouth
    ctx.strokeStyle = 'rgba(72,43,33,.92)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = .28 + i * .46;
      ctx.lineWidth = 7 - i * .5;
      ctx.beginPath();
      ctx.moveTo(bx, by - 20);
      ctx.quadraticCurveTo(bx + Math.cos(a) * 38, by - 8, bx + Math.cos(a) * (58 + i * 3), by + 16 + Math.sin(a) * 9);
      ctx.stroke();
    }

    // outer petals
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10 + Math.sin(t * .15) * .025;
      const rx = 31 + Math.sin(t * .9 + i) * 1.8;
      ctx.fillStyle = i % 2 ? 'rgba(143,67,66,.92)' : 'rgba(188,91,83,.9)';
      ellipse(ctx, bx + Math.cos(a) * 22, by - 28 + Math.sin(a) * 18, rx, 12, a);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,181,151,.13)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // inner petals
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7 - t * .08;
      ctx.fillStyle = i % 2 ? 'rgba(234,140,120,.9)' : 'rgba(207,104,101,.9)';
      ellipse(ctx, bx + Math.cos(a) * 12, by - 30 + Math.sin(a) * 10, 15, 7, a);
      ctx.fill();
    }

    // glowing pollen sac
    const pg = ctx.createRadialGradient(bx - 4, by - 36, 1, bx, by - 30, 23);
    pg.addColorStop(0, '#ffe7b0');
    pg.addColorStop(.38, '#f4b06f');
    pg.addColorStop(.78, '#c95f5d');
    pg.addColorStop(1, 'rgba(92,40,45,.95)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(bx, by - 30, 21 + Math.sin(t * 2.2) * 1.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,226,171,.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // sleepy open mouth / source eye
    ctx.fillStyle = 'rgba(47,24,25,.82)';
    ctx.beginPath();
    ctx.ellipse(bx, by - 27, 8.5, 11 + Math.sin(t * 1.7) * 1.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,205,142,.65)';
    ctx.beginPath();
    ctx.arc(bx - 1, by - 33, 2.2, 0, TAU);
    ctx.fill();

    // drifting spores
    for (let i = 0; i < 9; i++) {
      const a = t * .26 + i * 1.8;
      const rr2 = 40 + (i % 4) * 13;
      const x = bx + Math.cos(a) * rr2;
      const y = by - 34 + Math.sin(a * 1.3) * 22;
      const al = .15 + .2 * (1 + Math.sin(t * 1.5 + i)) * .5;
      ctx.fillStyle = `rgba(255,214,158,${al})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + (i % 3), 0, TAU);
      ctx.fill();
    }

    // rotating warning rings
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255,175,142,${.13 - i * .025})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 9]);
      ctx.beginPath();
      ctx.arc(bx, by - 14, 43 + i * 17 + Math.sin(t * 1.4 + i) * 2, t * .2 + i, t * .2 + i + Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // source label
    ctx.save();
    ctx.textAlign = 'left';
    const label = '山木花粉过敏源';
    ctx.font = '700 9px "PingFang SC", sans-serif';
    const lw = ctx.measureText(label).width + 18;
    ctx.fillStyle = 'rgba(10,20,16,.66)';
    rr(ctx, 20, 150, lw, 28, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,170,144,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,206,172,.8)';
    ctx.fillText(label, 29, 163);
    ctx.fillStyle = 'rgba(233,177,149,.42)';
    ctx.font = '800 6px "PingFang SC", sans-serif';
    ctx.fillText('ALLERGEN SOURCE', 29, 173);
    ctx.restore();
  }

  function drawHeroOnField(h, now) {
    const def = HERO_DEFS[h.key];
    // shadow
    ctx.save();
    ctx.fillStyle = 'rgba(2,11,7,.36)';
    ellipse(ctx, h.x, h.y + 4, 25, 8);
    ctx.fill();
    // hero glow base
    if (h.glow > 0 || h.deployAnim > 0) {
      const gr = ctx.createRadialGradient(h.x, h.y - 26, 2, h.x, h.y - 26, 60);
      gr.addColorStop(0, withAlpha(def.colorSoft, .26 * Math.max(h.glow, h.deployAnim)));
      gr.addColorStop(1, withAlpha(def.colorSoft, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(h.x, h.y - 26, 60, 0, TAU);
      ctx.fill();
    }
    // level pips
    for (let i = 0; i < h.level; i++) {
      ctx.fillStyle = withAlpha(def.colorSoft, .7);
      ctx.beginPath();
      ctx.arc(h.x - (h.level - 1) * 3 + i * 6, h.y + 13, 1.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    drawHero(ctx, h.key, h.x, h.y, {
      t: game.realTime,
      scale: 1.14,
      facing: h.facing,
      attack: h.attackAnim,
      deploy: h.deployAnim
    });

    // attack muzzle
    if (h.attackAnim > .65) {
      ctx.save();
      ctx.globalAlpha = (h.attackAnim - .65) * 1.8;
      ctx.fillStyle = def.colorSoft;
      ctx.beginPath();
      ctx.arc(h.x + h.facing * 23, h.y - 35, 5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // hero name tag on hover / selected
    if (game.hoverHero === h.key) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 9px "PingFang SC", sans-serif';
      const wdt = ctx.measureText(def.name).width + 18;
      ctx.fillStyle = 'rgba(6,19,14,.82)';
      rr(ctx, h.x - wdt / 2, h.y + 44, wdt, 18, 9);
      ctx.fill();
      ctx.fillStyle = def.colorSoft;
      ctx.fillText(def.name, h.x, h.y + 56);
      ctx.restore();
    }
  }

  function drawGhosts() {
    for (const g of game.ghosts) {
      const a = g.life / g.maxLife;
      ctx.save();
      ctx.globalAlpha = a * .55;
      drawHero(ctx, g.key, g.x, g.y, {
        t: game.realTime,
        scale: 1.14,
        facing: g.facing || 1,
        attack: g.attack || 0,
        ghost: true
      });
      ctx.restore();
    }
  }

  function drawProjectiles() {
    for (const p of game.projectiles) {
      ctx.save();
      const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
      if (p.type === 'blade') {
        ctx.translate(p.x, p.y);
        ctx.rotate(ang + p.spin * .1);
        ctx.strokeStyle = p.colorSoft;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 11, -.9, .9);
        ctx.stroke();
        ctx.strokeStyle = withAlpha(p.color, .45);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(-5, 0);
        ctx.stroke();
      } else if (p.type === 'acorn') {
        const arc = Math.sin(clamp(p.elapsed / Math.max(.1, p.totalDist / p.speed), 0, 1) * Math.PI) * p.arc;
        ctx.translate(p.x, p.y - arc);
        ctx.rotate(p.spin);
        ctx.fillStyle = '#a87346';
        ellipse(ctx, 0, 0, 6, 8);
        ctx.fill();
        ctx.fillStyle = '#6b472c';
        ellipse(ctx, 0, -7, 6.5, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,207,160,.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.lineTo(4, 2);
        ctx.stroke();
      } else if (p.type === 'shell') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        const grd = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12);
        grd.addColorStop(0, '#ffe0a6');
        grd.addColorStop(.55, p.color);
        grd.addColorStop(1, '#9d4e32');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,224,174,.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.strokeStyle = withAlpha(p.colorSoft, .82);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8 + Math.sin(p.spin) * 1.5, -.8, .9);
        ctx.stroke();
        ctx.strokeStyle = withAlpha(p.color, .3);
        ctx.beginPath();
        ctx.arc(0, 0, 12, -.6, .7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBeams() {
    for (const b of game.beams) {
      const a = clamp(b.life / b.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineCap = 'round';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * (.6 + a * .5);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,236,.8)';
      ctx.lineWidth = Math.max(1, b.width * .26);
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSummons() {
    for (const s of game.summons) {
      if (s.kind !== 'bearcat') continue;
      const impactT = clamp(s.t / .46, 0, 1);
      const drop = (1 - easeOutBack(impactT)) * -260;
      const alpha = Math.min(1, s.t / .18) * clamp(s.life / .35, 0, 1) * .92;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawBearCat(ctx, s.x, s.y + drop, s.scale, s.t, game.realTime);
      ctx.restore();
      if (s.t > .34 && s.t < .5) {
        ctx.save();
        ctx.strokeStyle = 'rgba(235,222,255,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + 8, 58 * impactT, 16 * impactT, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (game.comicText) {
      const c = game.comicText;
      const a = clamp(c.life / c.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(c.x, c.y);
      ctx.rotate(-.08);
      ctx.scale(1 + (1 - a) * .12, 1 + (1 - a) * .12);
      ctx.font = '900 30px "Songti SC", "STSong", serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(101,43,25,.7)';
      ctx.strokeText('BOOM!', 0, 0);
      ctx.fillStyle = '#ffd9a3';
      ctx.fillText('BOOM!', 0, 0);
      ctx.restore();
    }
  }

  function drawEffects() {
    // rings
    for (const r of game.rings) {
      ctx.save();
      ctx.globalAlpha = r.alpha;
      ctx.strokeStyle = withAlpha(r.color, .9);
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // slashes
    for (const s of game.slashes) {
      const a = clamp(s.life / s.maxLife, 0, 1);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = a;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, s.length * .45, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, s.length * .45, -1, 1);
      ctx.stroke();
      ctx.restore();
    }
    // particles
    for (const p of game.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.kind === 'leaf') {
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot || 0) + game.time * (p.spin || 0));
        ctx.fillStyle = p.color;
        ellipse(ctx, 0, 0, p.size * 2.2, p.size * .9);
        ctx.fill();
      } else if (p.kind === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.4 - a * .4), 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // floating text
    for (const t of game.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `800 ${t.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(3,13,8,.6)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  function drawEnemy(e) {
    const p = { x: e.x, y: e.y };
    const bob = Math.sin(game.time * 4.2 + e.seed * 12) * 2;
    const frozen = game.time < e.stunUntil;
    const slow = game.time < e.slowUntil;
    const moveT = game.realTime;
    const isBoss = e.boss;
    const scale = e.spawnAnim < 1 ? easeOutBack(e.spawnAnim) : 1;

    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(2,10,6,.3)';
    ellipse(ctx, p.x, p.y + (isBoss ? 18 : 6), (isBoss ? 48 : e.radius * .95), isBoss ? 15 : e.radius * .36);
    ctx.fill();

    if (frozen) {
      ctx.strokeStyle = 'rgba(176,224,255,.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y - e.radius * .9, e.radius + 7, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (slow) {
      ctx.strokeStyle = 'rgba(160,205,255,.38)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y - e.radius * .9, e.radius + 5, 0, TAU);
      ctx.stroke();
    }

    ctx.translate(p.x, p.y + (e.type === 'bee' ? -17 + (e.hover || 0) : 0) + (isBoss ? 0 : bob));
    if (e.type === 'dart') ctx.rotate(Math.atan2(e.ty, e.tx) * .12);
    const drawScale = e.boss ? 1.02 : 1.12;
    ctx.scale(scale * drawScale, scale * drawScale);

    if (e.type === 'fluff') drawFluff(ctx, e, moveT);
    else if (e.type === 'puff') drawPuff(ctx, e, moveT);
    else if (e.type === 'dart') drawDart(ctx, e, moveT);
    else if (e.type === 'bee') drawBee(ctx, e, moveT);
    else if (e.type === 'elite') drawElite(ctx, e, moveT);
    else if (e.type === 'boss') drawBoss(ctx, e, moveT);

    if (e.hitFlash > 0) {
      ctx.globalAlpha = e.hitFlash * 3.8;
      ctx.fillStyle = '#fff8de';
      ctx.beginPath();
      ctx.arc(0, -e.radius * .5, e.radius * .9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // mark
    if (game.time < e.markUntil) {
      ctx.strokeStyle = 'rgba(255,136,102,.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4 + game.time;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (e.radius + 5), -e.radius * .6 + Math.sin(a) * (e.radius + 5));
        ctx.lineTo(Math.cos(a) * (e.radius + 10), -e.radius * .6 + Math.sin(a) * (e.radius + 10));
        ctx.stroke();
      }
    }
    ctx.restore();

    // stun stars
    if (frozen) {
      for (let i = 0; i < 3; i++) {
        const a = game.time * 3 + i * TAU / 3;
        const sx = p.x + Math.cos(a) * (e.radius + 4);
        const sy = p.y - e.radius * 2 - 6 + Math.sin(a) * 4;
        ctx.fillStyle = 'rgba(255,226,156,.9)';
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const aa = -Math.PI / 2 + k * TAU / 5;
          const rr2 = k % 2 ? 2 : 4.5;
          const xx = sx + Math.cos(aa) * rr2;
          const yy = sy + Math.sin(aa) * rr2;
          if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // hp bar
    if (!isBoss && (e.hp < e.maxHp || e.type === 'elite')) {
      const wdt = Math.max(20, e.radius * 2);
      const hp = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(4,14,9,.58)';
      rr(ctx, p.x - wdt / 2, p.y - e.radius * 2 - 15, wdt, 4, 2);
      ctx.fill();
      ctx.fillStyle = hp > .5 ? '#cfe98a' : hp > .25 ? '#ffce74' : '#ff8b6e';
      rr(ctx, p.x - wdt / 2, p.y - e.radius * 2 - 15, wdt * hp, 4, 2);
      ctx.fill();
    }

    if (isBoss) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,221,184,.7)';
      ctx.font = '700 8px "PingFang SC", sans-serif';
      ctx.fillText('山木 · 万蕊母株', p.x, p.y + 38);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------
  // Enemy art
  // ------------------------------------------------------------
  function drawFluff(c, e, t) {
    const squish = 1 + Math.sin(t * 6 + e.seed * 5) * .035;
    c.scale(1, squish);
    // fluff lobes
    c.fillStyle = '#f7e7a9';
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7 + t * .3;
      c.beginPath();
      c.arc(Math.cos(a) * 8, -9 + Math.sin(a) * 6, 7.5, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#f9eebc';
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 + .3;
      c.beginPath();
      c.arc(Math.cos(a) * 4.5, -11 + Math.sin(a) * 4, 6, 0, TAU);
      c.fill();
    }
    c.strokeStyle = 'rgba(154,128,72,.55)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(0, -10, 10, .15, Math.PI - .15);
    c.stroke();
    // face
    c.fillStyle = '#3a2e1d';
    c.beginPath(); c.arc(-3.6, -12, 1.4, 0, TAU); c.fill();
    c.beginPath(); c.arc(3.6, -12, 1.4, 0, TAU); c.fill();
    c.strokeStyle = '#6b532d';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, -8.2, 3, .15, Math.PI - .15);
    c.stroke();
    // tiny legs
    c.strokeStyle = '#9a824f';
    c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-4, 0); c.lineTo(-5, 3); c.stroke();
    c.beginPath(); c.moveTo(4, 0); c.lineTo(5, 3); c.stroke();
  }

  function drawPuff(c, e, t) {
    const wob = Math.sin(t * 2.6 + e.seed * 4) * .04;
    c.rotate(wob);
    // petals / spikes
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10 + t * .12;
      c.fillStyle = i % 2 ? '#d98b58' : '#e8a66c';
      ellipse(c, Math.cos(a) * 14, -16 + Math.sin(a) * 12, 10, 5.5, a);
      c.fill();
    }
    c.fillStyle = '#efb87f';
    c.beginPath(); c.arc(0, -16, 14, 0, TAU); c.fill();
    c.fillStyle = '#f6cb95';
    c.beginPath(); c.arc(-3, -19, 8, 0, TAU); c.fill();
    // face
    c.fillStyle = '#4f2c20';
    c.beginPath(); c.arc(-5, -17, 2, 0, TAU); c.fill();
    c.beginPath(); c.arc(5, -17, 2, 0, TAU); c.fill();
    c.strokeStyle = '#4f2c20';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-7, -23); c.lineTo(-2, -21); c.stroke();
    c.beginPath(); c.moveTo(7, -23); c.lineTo(2, -21); c.stroke();
    c.beginPath(); c.arc(0, -12, 3.5, .2, Math.PI - .2); c.stroke();
    // arms
    c.strokeStyle = '#c97d4e';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(-13, -13); c.lineTo(-17, -6); c.stroke();
    c.beginPath(); c.moveTo(13, -13); c.lineTo(17, -6); c.stroke();
  }

  function drawDart(c, e, t) {
    const bob = Math.sin(t * 9 + e.seed * 3) * 1.2;
    c.translate(0, bob);
    // speed lines
    c.strokeStyle = 'rgba(255,224,166,.36)';
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(12 + i * 3, -7 + i * 5);
      c.lineTo(28 + i * 7, -7 + i * 5);
      c.stroke();
    }
    c.fillStyle = '#ffd17e';
    c.beginPath();
    c.moveTo(-14, -11);
    c.quadraticCurveTo(0, -22, 13, -9);
    c.quadraticCurveTo(3, 4, -14, -11);
    c.fill();
    c.fillStyle = '#fff0b8';
    c.beginPath();
    c.moveTo(-10, -10);
    c.quadraticCurveTo(0, -17, 8, -10);
    c.quadraticCurveTo(0, -4, -10, -10);
    c.fill();
    c.fillStyle = '#59391e';
    c.beginPath(); c.arc(2, -12, 1.7, 0, TAU); c.fill();
    c.strokeStyle = '#9e672f';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-2, -8); c.lineTo(4, -8); c.stroke();
    // spikes
    c.fillStyle = '#e9a655';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-7 + i * 6, -16);
      c.lineTo(-4 + i * 6, -23);
      c.lineTo(-1 + i * 6, -16);
      c.fill();
    }
  }

  function drawBee(c, e, t) {
    const flap = Math.sin(t * 36 + e.seed * 8) * .5;
    // wings
    c.fillStyle = 'rgba(226,243,255,.46)';
    ellipse(c, -8, -18, 12, 5, -.55 + flap);
    c.fill();
    ellipse(c, 8, -18, 12, 5, .55 - flap);
    c.fill();
    c.strokeStyle = 'rgba(218,240,255,.4)';
    c.lineWidth = .8;
    ellipse(c, -8, -18, 12, 5, -.55 + flap); c.stroke();
    ellipse(c, 8, -18, 12, 5, .55 - flap); c.stroke();
    // body
    c.fillStyle = '#f7c85d';
    ellipse(c, 0, -10, 12, 10);
    c.fill();
    c.save();
    c.beginPath(); c.ellipse(0, -10, 12, 10, 0, 0, TAU); c.clip();
    c.strokeStyle = '#453322';
    c.lineWidth = 3.5;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(i * 6 - 3, -22);
      c.lineTo(i * 6 - 3, 2);
      c.stroke();
    }
    c.restore();
    // face
    c.fillStyle = '#fbe4a5';
    c.beginPath(); c.arc(0, -15, 6, 0, TAU); c.fill();
    c.fillStyle = '#382719';
    c.beginPath(); c.arc(-2.3, -16, 1.2, 0, TAU); c.fill();
    c.beginPath(); c.arc(2.3, -16, 1.2, 0, TAU); c.fill();
    c.strokeStyle = '#6d4a25';
    c.lineWidth = 1;
    c.beginPath(); c.arc(0, -12.5, 2, .2, Math.PI - .2); c.stroke();
    // stinger
    c.fillStyle = '#5f4528';
    c.beginPath();
    c.moveTo(-11, -8);
    c.lineTo(-17, -4);
    c.lineTo(-10, -4);
    c.fill();
  }

  function drawElite(c, e, t) {
    const pulse = 1 + Math.sin(t * 2.5) * .02;
    c.scale(pulse, pulse);
    // aura
    c.fillStyle = 'rgba(212,130,90,.09)';
    c.beginPath(); c.arc(0, -24, 44, 0, TAU); c.fill();
    // roots
    c.strokeStyle = '#7e3e2c';
    c.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + i * Math.PI / 4;
      c.beginPath();
      c.moveTo(0, -8);
      c.quadraticCurveTo(Math.cos(a) * 22, -2, Math.cos(a) * 30, 10);
      c.stroke();
    }
    // petals
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + t * .2;
      c.fillStyle = i % 2 ? '#bf5e48' : '#d87558';
      ellipse(c, Math.cos(a) * 19, -27 + Math.sin(a) * 16, 15, 7, a);
      c.fill();
    }
    c.fillStyle = '#e28e67';
    c.beginPath(); c.arc(0, -27, 20, 0, TAU); c.fill();
    c.fillStyle = '#3a2019';
    c.beginPath(); c.arc(0, -27, 11, 0, TAU); c.fill();
    c.fillStyle = '#ffd49c';
    c.beginPath(); c.arc(-4, -28, 2.5, 0, TAU); c.fill();
    c.beginPath(); c.arc(4, -28, 2.5, 0, TAU); c.fill();
    c.strokeStyle = '#ffc189';
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, -23, 5, .2, Math.PI - .2); c.stroke();
    // crown
    c.fillStyle = '#ffcd7b';
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(i * 9 - 4, -47);
      c.lineTo(i * 9, -55);
      c.lineTo(i * 9 + 4, -47);
      c.fill();
    }
  }

  function drawBoss(c, e, t) {
    const breathe = 1 + Math.sin(t * 1.8) * .025;
    c.scale(breathe, breathe);
    // aura
    const g = c.createRadialGradient(0, -50, 8, 0, -50, 90);
    g.addColorStop(0, 'rgba(255,166,118,.15)');
    g.addColorStop(1, 'rgba(255,166,118,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -50, 90, 0, TAU); c.fill();
    // roots
    c.strokeStyle = '#5e3426';
    c.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + i * Math.PI / 5;
      c.beginPath();
      c.moveTo(0, -10);
      c.quadraticCurveTo(Math.cos(a) * 30, 2, Math.cos(a) * 44, 20);
      c.stroke();
      c.strokeStyle = '#7e4832';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(Math.cos(a) * 30, 8);
      c.lineTo(Math.cos(a) * 48, 22);
      c.stroke();
      c.strokeStyle = '#5e3426';
      c.lineWidth = 7;
    }
    // outer petals
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + t * .1;
      c.fillStyle = i % 3 === 0 ? '#aa4c3d' : i % 2 ? '#d36e53' : '#e78a65';
      ellipse(c, Math.cos(a) * 34, -50 + Math.sin(a) * 27, 24, 11, a);
      c.fill();
      c.strokeStyle = 'rgba(255,188,148,.13)';
      c.lineWidth = 1;
      c.stroke();
    }
    // inner petals
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 - t * .17;
      c.fillStyle = i % 2 ? '#f1a076' : '#e88c69';
      ellipse(c, Math.cos(a) * 18, -50 + Math.sin(a) * 14, 15, 7, a);
      c.fill();
    }
    // face disk
    c.fillStyle = '#38211b';
    c.beginPath(); c.arc(0, -50, 23, 0, TAU); c.fill();
    c.strokeStyle = '#f4b37a';
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, -50, 23, 0, TAU); c.stroke();
    // angry eyes
    c.fillStyle = '#ffd19d';
    c.beginPath(); c.arc(-8, -54, 4.2, 0, TAU); c.fill();
    c.beginPath(); c.arc(8, -54, 4.2, 0, TAU); c.fill();
    c.fillStyle = '#2a1813';
    c.beginPath(); c.arc(-7, -54, 2, 0, TAU); c.fill();
    c.beginPath(); c.arc(9, -54, 2, 0, TAU); c.fill();
    c.strokeStyle = '#ffc28e';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-14, -60); c.lineTo(-4, -58); c.stroke();
    c.beginPath(); c.moveTo(14, -60); c.lineTo(4, -58); c.stroke();
    c.beginPath(); c.arc(0, -43, 9, .1, Math.PI - .1); c.stroke();
    // teeth
    c.fillStyle = '#f6dfb9';
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * 4 - 2, -38);
      c.lineTo(i * 4, -34);
      c.lineTo(i * 4 + 2, -38);
      c.fill();
    }
    // crown
    c.fillStyle = '#ffcb74';
    for (let i = -2; i <= 2; i++) {
      const h = i === 0 ? 18 : i === -1 || i === 1 ? 13 : 9;
      c.beginPath();
      c.moveTo(i * 9 - 5, -72);
      c.lineTo(i * 9, -72 - h);
      c.lineTo(i * 9 + 5, -72);
      c.fill();
    }
    c.fillStyle = '#ff9c69';
    c.beginPath(); c.arc(0, -73, 3.4, 0, TAU); c.fill();
  }

  function drawBearCat(c, x, y, scale, t, realT) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    // giant shadow
    c.fillStyle = 'rgba(3,12,8,.35)';
    ellipse(c, 0, 4, 62, 17);
    c.fill();
    const shiver = Math.sin(realT * 40) * .8;
    c.translate(shiver, 0);
    // tail
    c.strokeStyle = '#9b86c5';
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-34, -26);
    c.quadraticCurveTo(-58, -34, -52, -63);
    c.quadraticCurveTo(-49, -74, -60, -70);
    c.stroke();
    c.strokeStyle = '#c8b5ee';
    c.lineWidth = 5;
    c.stroke();
    // body
    c.fillStyle = '#bca7e3';
    c.beginPath(); c.ellipse(0, -35, 43, 37, 0, 0, TAU); c.fill();
    c.strokeStyle = '#6a588f';
    c.lineWidth = 2.2;
    c.stroke();
    // belly
    c.fillStyle = '#e2d7f3';
    c.beginPath(); c.ellipse(0, -26, 23, 21, 0, 0, TAU); c.fill();
    // arms
    c.strokeStyle = '#aa94d2';
    c.lineWidth = 13;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-30, -46); c.lineTo(-40, -18); c.stroke();
    c.beginPath(); c.moveTo(30, -46); c.lineTo(40, -18); c.stroke();
    // belly shiver lines
    c.strokeStyle = 'rgba(118,94,160,.35)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(0, -26, 12 + i * 7, .2, Math.PI - .2);
      c.stroke();
    }
    // head
    c.fillStyle = '#cbb7ed';
    c.beginPath(); c.arc(0, -78, 34, 0, TAU); c.fill();
    c.strokeStyle = '#6a588f';
    c.lineWidth = 2.2;
    c.stroke();
    // bear ears
    c.fillStyle = '#cbb7ed';
    c.beginPath(); c.arc(-23, -102, 12, 0, TAU); c.fill();
    c.stroke();
    c.beginPath(); c.arc(23, -102, 12, 0, TAU); c.fill();
    c.stroke();
    c.fillStyle = '#e5d9f6';
    c.beginPath(); c.arc(-23, -102, 6, 0, TAU); c.fill();
    c.beginPath(); c.arc(23, -102, 6, 0, TAU); c.fill();
    // cat ears peeking
    c.fillStyle = '#9c86c6';
    c.beginPath(); c.moveTo(-12, -108); c.lineTo(-7, -118); c.lineTo(-2, -108); c.fill();
    c.beginPath(); c.moveTo(12, -108); c.lineTo(7, -118); c.lineTo(2, -108); c.fill();
    // face
    c.fillStyle = '#f0e8fa';
    c.beginPath(); c.ellipse(0, -74, 22, 18, 0, 0, TAU); c.fill();
    // eyes (shivering)
    c.fillStyle = '#3b2c54';
    c.beginPath(); c.arc(-9, -80, 3.1, 0, TAU); c.fill();
    c.beginPath(); c.arc(9, -80, 3.1, 0, TAU); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-10, -81, 1.1, 0, TAU); c.fill();
    c.beginPath(); c.arc(8, -81, 1.1, 0, TAU); c.fill();
    // nose / mouth
    c.fillStyle = '#8c6a96';
    c.beginPath(); c.moveTo(0, -72); c.lineTo(-3, -69); c.lineTo(3, -69); c.fill();
    c.strokeStyle = '#5d476e';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(0, -69); c.lineTo(0, -66); c.stroke();
    c.beginPath(); c.arc(-4, -65, 3.5, 0, Math.PI); c.stroke();
    c.beginPath(); c.arc(4, -65, 3.5, 0, Math.PI); c.stroke();
    // whiskers
    c.strokeStyle = 'rgba(92,72,112,.5)';
    c.lineWidth = .9;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.moveTo(s * 12, -72 + i * 4);
        c.lineTo(s * 25, -75 + i * 5);
        c.stroke();
      }
    }
    // cheeks
    c.fillStyle = 'rgba(226,157,182,.4)';
    c.beginPath(); c.arc(-15, -69, 4, 0, TAU); c.fill();
    c.beginPath(); c.arc(15, -69, 4, 0, TAU); c.fill();
    // little crown
    c.fillStyle = '#ffd07e';
    c.beginPath(); c.moveTo(-9, -111); c.lineTo(-4, -121); c.lineTo(1, -111); c.lineTo(6, -121); c.lineTo(11, -111); c.fill();
    // shiver marks
    c.strokeStyle = 'rgba(215,198,245,.55)';
    c.lineWidth = 1.5;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = -1.4 + i * .5;
      c.beginPath();
      c.moveTo(Math.cos(a) * 56, -58 + Math.sin(a) * 20);
      c.lineTo(Math.cos(a) * 65, -58 + Math.sin(a) * 20);
      c.stroke();
    }
    c.restore();
  }

  // ------------------------------------------------------------
  // Hero art
  // ------------------------------------------------------------
  function drawHero(c, key, x, y, o) {
    const opts = o || {};
    const t = opts.t || 0;
    const s = opts.scale || 1;
    const facing = opts.facing || 1;
    const attack = clamp(opts.attack || 0, 0, 1);
    const bob = Math.sin(t * 2.1 + x * .01) * 1.1;
    const deploy = opts.deploy || 0;
    const tilt = attack * .06;
    c.save();
    c.translate(x, y + bob - deploy * 14);
    c.scale(facing * s * (1 + deploy * .18), s * (1 + deploy * .18));
    c.rotate(tilt * facing);
    c.globalAlpha = opts.alpha != null ? opts.alpha : 1;
    if (opts.ghost) {
      c.globalCompositeOperation = 'lighter';
    }
    if (key === 'dash') drawDashHero(c, t, attack);
    else if (key === 'shiver') drawShiverHero(c, t, attack);
    else if (key === 'blast') drawBlastHero(c, t, attack);
    else if (key === 'wall') drawWallHero(c, t, attack);
    c.restore();
  }

  function heroCommonHead(c, skin, hair, eye, t) {
    // head
    c.fillStyle = skin;
    c.beginPath();
    c.arc(0, -49, 11.2, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(38,29,21,.35)';
    c.lineWidth = 1;
    c.stroke();
    // hair cap
    c.fillStyle = hair;
    c.beginPath();
    c.arc(0, -51.5, 11.4, Math.PI * 1.02, Math.PI * 1.98);
    c.quadraticCurveTo(8, -58, 0, -58);
    c.quadraticCurveTo(-9, -58, -11.4, -51.5);
    c.fill();
    // face
    c.fillStyle = eye;
    c.beginPath(); c.arc(-4, -48, 1.25, 0, TAU); c.fill();
    c.beginPath(); c.arc(4, -48, 1.25, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(76,50,35,.65)';
    c.lineWidth = .9;
    c.beginPath();
    c.arc(0, -45.3, 2.2, .18, Math.PI - .18);
    c.stroke();
    // blush
    c.fillStyle = 'rgba(238,137,121,.22)';
    c.beginPath(); c.arc(-7, -45.5, 2, 0, TAU); c.fill();
    c.beginPath(); c.arc(7, -45.5, 2, 0, TAU); c.fill();
  }

  function drawDashHero(c, t, attack) {
    const lunge = attack * 3;
    // scarf tails
    c.strokeStyle = '#2fbda4';
    c.lineWidth = 5.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-4, -34);
    c.bezierCurveTo(-17, -37 + Math.sin(t * 4) * 2, -24, -29 + Math.sin(t * 3) * 3, -33, -33 + Math.sin(t * 4.5) * 3);
    c.stroke();
    c.strokeStyle = '#75ebd0';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-4, -34);
    c.bezierCurveTo(-15, -36, -22, -30, -31, -33);
    c.stroke();
    // legs
    c.strokeStyle = '#173b35';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(-4, -16); c.lineTo(-5 - lunge * .3, -2); c.stroke();
    c.beginPath(); c.moveTo(4, -16); c.lineTo(7 + lunge * .4, -2); c.stroke();
    c.strokeStyle = '#82ead1';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-8 - lunge * .3, -2); c.lineTo(-1 - lunge * .3, -2); c.stroke();
    c.beginPath(); c.moveTo(4 + lunge * .4, -2); c.lineTo(11 + lunge * .4, -2); c.stroke();
    // body
    c.fillStyle = '#47cdb1';
    c.beginPath();
    c.moveTo(-11, -33);
    c.quadraticCurveTo(0, -39, 11, -33);
    c.lineTo(9, -16);
    c.quadraticCurveTo(0, -12, -9, -16);
    c.closePath();
    c.fill();
    c.strokeStyle = '#1a574a';
    c.lineWidth = 1.2;
    c.stroke();
    // belt
    c.fillStyle = '#173d35';
    c.fillRect(-9, -21, 18, 3.2);
    c.fillStyle = '#ffd484';
    c.beginPath(); c.arc(0, -19.5, 2.3, 0, TAU); c.fill();
    // back arm
    c.strokeStyle = '#3bb89f';
    c.lineWidth = 4.2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-7, -29);
    c.lineTo(-14, -21);
    c.stroke();
    // head
    heroCommonHead(c, '#ffd9b3', '#1e5c50', '#20332c', t);
    // bandana
    c.fillStyle = '#ffda85';
    c.beginPath();
    c.moveTo(-11.5, -54);
    c.quadraticCurveTo(0, -58, 11.5, -54);
    c.lineTo(10.5, -51);
    c.quadraticCurveTo(0, -55, -10.5, -51);
    c.closePath();
    c.fill();
    c.strokeStyle = '#b6853f';
    c.lineWidth = .8;
    c.stroke();
    // front arm + dagger
    c.save();
    c.translate(7, -30);
    c.rotate(-.45 + attack * 1.1);
    c.strokeStyle = '#52d4b8';
    c.lineWidth = 4.2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(11, 4); c.stroke();
    c.fillStyle = '#ffd9b3';
    c.beginPath(); c.arc(12, 5, 2.4, 0, TAU); c.fill();
    // dagger
    c.translate(13, 5);
    c.rotate(-.2);
    c.fillStyle = '#f3f6dc';
    c.beginPath();
    c.moveTo(0, -1.6);
    c.lineTo(17, 0);
    c.lineTo(0, 1.6);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.7)';
    c.lineWidth = .8;
    c.beginPath(); c.moveTo(2, 0); c.lineTo(14, 0); c.stroke();
    c.restore();
    // speed spark
    if (attack > .4) {
      c.strokeStyle = 'rgba(196,255,238,.55)';
      c.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.moveTo(20 + i * 6, -36 + i * 7);
        c.lineTo(31 + i * 7, -36 + i * 7);
        c.stroke();
      }
    }
  }

  function drawShiverHero(c, t, attack) {
    const shiver = Math.sin(t * 17) * .7;
    c.translate(shiver, 0);
    // tail
    c.strokeStyle = '#927dbe';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-9, -19);
    c.quadraticCurveTo(-24, -20, -22, -34);
    c.quadraticCurveTo(-21, -41, -28, -38);
    c.stroke();
    c.strokeStyle = '#d5c7ef';
    c.lineWidth = 2.6;
    c.stroke();
    // legs (onesie)
    c.fillStyle = '#9e89c9';
    c.beginPath(); c.arc(-5, -5, 5, 0, TAU); c.fill();
    c.beginPath(); c.arc(5, -5, 5, 0, TAU); c.fill();
    // round body
    const bg = c.createLinearGradient(0, -38, 0, -8);
    bg.addColorStop(0, '#d3c2ef');
    bg.addColorStop(1, '#aa94d4');
    c.fillStyle = bg;
    c.beginPath(); c.ellipse(0, -23, 14.5, 16, 0, 0, TAU); c.fill();
    c.strokeStyle = '#6d5b93';
    c.lineWidth = 1.1;
    c.stroke();
    // belly patch
    c.fillStyle = '#eee5fa';
    c.beginPath(); c.ellipse(0, -19, 8.5, 9, 0, 0, TAU); c.fill();
    // back paw
    c.strokeStyle = '#8e78b9';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(-12, -26); c.lineTo(-18, -19); c.stroke();
    // bear hood
    c.fillStyle = '#c4b0e6';
    c.beginPath(); c.arc(0, -47, 15.2, 0, TAU); c.fill();
    c.strokeStyle = '#6a588f';
    c.lineWidth = 1.4;
    c.stroke();
    // ears
    c.fillStyle = '#c4b0e6';
    c.beginPath(); c.arc(-11, -59, 5.4, 0, TAU); c.fill();
    c.stroke();
    c.beginPath(); c.arc(11, -59, 5.4, 0, TAU); c.fill();
    c.stroke();
    c.fillStyle = '#eadff9';
    c.beginPath(); c.arc(-11, -59, 2.7, 0, TAU); c.fill();
    c.beginPath(); c.arc(11, -59, 2.7, 0, TAU); c.fill();
    // cat ears peeking
    c.fillStyle = '#9a84c4';
    c.beginPath(); c.moveTo(-6, -61); c.lineTo(-3, -68); c.lineTo(1, -61); c.fill();
    c.beginPath(); c.moveTo(6, -61); c.lineTo(3, -68); c.lineTo(-1, -61); c.fill();
    // face cream
    c.fillStyle = '#f4edfb';
    c.beginPath(); c.ellipse(0, -45, 10.5, 8.6, 0, 0, TAU); c.fill();
    c.fillStyle = '#3a2b52';
    c.beginPath(); c.arc(-4, -47, 1.5, 0, TAU); c.fill();
    c.beginPath(); c.arc(4, -47, 1.5, 0, TAU); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-4.4, -47.5, .5, 0, TAU); c.fill();
    c.beginPath(); c.arc(3.6, -47.5, .5, 0, TAU); c.fill();
    c.fillStyle = '#9a6f9d';
    c.beginPath(); c.moveTo(0, -43.3); c.lineTo(-1.7, -41.7); c.lineTo(1.7, -41.7); c.fill();
    c.strokeStyle = '#6a4d72';
    c.lineWidth = .8;
    c.beginPath(); c.arc(-2, -40.4, 2, .1, Math.PI - .1); c.stroke();
    c.beginPath(); c.arc(2, -40.4, 2, .1, Math.PI - .1); c.stroke();
    // whiskers
    c.strokeStyle = 'rgba(91,69,105,.5)';
    c.lineWidth = .7;
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * 7, -45); c.lineTo(s * 14, -47); c.stroke();
      c.beginPath(); c.moveTo(s * 7, -43); c.lineTo(s * 14, -42); c.stroke();
    }
    // tiny bell
    c.fillStyle = '#ffd47e';
    c.beginPath(); c.arc(0, -33, 2.2, 0, TAU); c.fill();
    c.strokeStyle = '#b7853a';
    c.lineWidth = .7;
    c.stroke();
    // front paw casts
    c.save();
    c.translate(11, -27);
    c.rotate(-.8 - attack * .4);
    c.strokeStyle = '#b9a2de';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(9, -2); c.stroke();
    c.fillStyle = '#e6daf6';
    c.beginPath(); c.arc(10, -2, 2.8, 0, TAU); c.fill();
    // acorn charm
    c.fillStyle = '#a97849';
    c.beginPath(); c.arc(11, -6, 2.6, 0, TAU); c.fill();
    c.fillStyle = '#6d492c';
    c.beginPath(); c.arc(11, -8, 3, Math.PI, TAU); c.fill();
    c.restore();
    // shiver lines
    c.strokeStyle = 'rgba(213,199,241,.5)';
    c.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      const a = -1.3 + i * .5;
      c.beginPath();
      c.moveTo(Math.cos(a) * 22, -24 + Math.sin(a) * 17);
      c.lineTo(Math.cos(a) * 27, -24 + Math.sin(a) * 17);
      c.stroke();
    }
  }

  function drawBlastHero(c, t, attack) {
    const recoil = attack * 2;
    // backpack shells
    c.save();
    c.translate(-10, -28);
    c.rotate(-.15);
    c.fillStyle = '#8e4d32';
    rr(c, -8, -8, 12, 17, 4);
    c.fill();
    c.strokeStyle = '#4c2c22';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#d7ab62';
    c.beginPath(); c.arc(-2, -4, 2.6, 0, TAU); c.fill();
    c.beginPath(); c.arc(-2, 2, 2.6, 0, TAU); c.fill();
    c.restore();
    // legs
    c.strokeStyle = '#4b332b';
    c.lineWidth = 5.4;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-5, -14); c.lineTo(-7, -2); c.stroke();
    c.beginPath(); c.moveTo(5, -14); c.lineTo(9, -2); c.stroke();
    c.fillStyle = '#2b2520';
    c.beginPath(); c.ellipse(-8, -1, 6, 3, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(10, -1, 6, 3, 0, 0, TAU); c.fill();
    // body
    const bg = c.createLinearGradient(0, -37, 0, -12);
    bg.addColorStop(0, '#d97b47');
    bg.addColorStop(1, '#a65434');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(-12, -35);
    c.quadraticCurveTo(0, -40, 12, -35);
    c.lineTo(11, -15);
    c.quadraticCurveTo(0, -11, -11, -15);
    c.closePath();
    c.fill();
    c.strokeStyle = '#5f3124';
    c.lineWidth = 1.2;
    c.stroke();
    // straps
    c.strokeStyle = '#4e2d24';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-7, -35); c.lineTo(-5, -15); c.stroke();
    // head
    heroCommonHead(c, '#ffd3ab', '#7e3d2c', '#2c211b', t);
    // spiky hair
    c.fillStyle = '#8e422d';
    c.beginPath();
    c.moveTo(-11, -53);
    c.lineTo(-17, -60);
    c.lineTo(-8, -58);
    c.lineTo(-3, -66);
    c.lineTo(2, -58);
    c.lineTo(11, -61);
    c.lineTo(9, -53);
    c.closePath();
    c.fill();
    // goggles
    c.strokeStyle = '#e1bb72';
    c.lineWidth = 2;
    c.beginPath(); c.arc(-4.5, -52, 4, 0, TAU); c.stroke();
    c.beginPath(); c.arc(4.5, -52, 4, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(96,191,191,.4)';
    c.beginPath(); c.arc(-4.5, -52, 3.1, 0, TAU); c.fill();
    c.beginPath(); c.arc(4.5, -52, 3.1, 0, TAU); c.fill();
    c.strokeStyle = '#b98543';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-8.5, -52); c.lineTo(8.5, -52); c.stroke();
    // grin
    c.fillStyle = '#f7ead3';
    c.beginPath(); c.arc(0, -42.5, 3.2, .05, Math.PI - .05); c.fill();
    // giant gauntlet
    c.save();
    c.translate(11 + recoil, -28);
    c.rotate(-.35 + attack * .65);
    c.strokeStyle = '#c86f40';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(14, 3); c.stroke();
    c.fillStyle = '#b55836';
    c.beginPath(); c.arc(18, 4, 10, 0, TAU); c.fill();
    c.strokeStyle = '#512d23';
    c.lineWidth = 1.7;
    c.stroke();
    c.fillStyle = '#3a2a24';
    c.beginPath(); c.arc(22, 4, 5.6, 0, TAU); c.fill();
    c.strokeStyle = '#e3ad63';
    c.lineWidth = 1.3;
    c.beginPath(); c.arc(22, 4, 5.4, 0, TAU); c.stroke();
    // vents
    c.strokeStyle = 'rgba(255,203,131,.55)';
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(13, -1 + i * 3);
      c.lineTo(16, -1 + i * 3);
      c.stroke();
    }
    c.restore();
    // other arm
    c.strokeStyle = '#c06c42';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(-9, -29); c.lineTo(-15, -20); c.stroke();
    c.fillStyle = '#ffd3ab';
    c.beginPath(); c.arc(-16, -19, 2.8, 0, TAU); c.fill();
    // muzzle flash
    if (attack > .72) {
      c.fillStyle = '#ffe8b3';
      c.beginPath();
      const a = attack;
      for (let i = 0; i < 8; i++) {
        const ang = i * TAU / 8;
        const rad = i % 2 ? 9 : 18;
        const xx = 30 + Math.cos(ang) * rad * a;
        const yy = 4 + Math.sin(ang) * rad * a;
        if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
      }
      c.closePath();
      c.fill();
    }
  }

  function drawWallHero(c, t, attack) {
    // cape
    c.fillStyle = '#3d5f96';
    c.beginPath();
    c.moveTo(-10, -34);
    c.quadraticCurveTo(-25, -22 + Math.sin(t * 2) * 2, -20, -4);
    c.lineTo(-4, -10);
    c.closePath();
    c.fill();
    c.strokeStyle = '#253d63';
    c.lineWidth = 1;
    c.stroke();
    // legs
    c.strokeStyle = '#2c3b52';
    c.lineWidth = 5.2;
    c.beginPath(); c.moveTo(-4, -14); c.lineTo(-6, -2); c.stroke();
    c.beginPath(); c.moveTo(5, -14); c.lineTo(7, -2); c.stroke();
    c.fillStyle = '#17232e';
    c.beginPath(); c.ellipse(-8, -1, 6, 3, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(9, -1, 6, 3, 0, 0, TAU); c.fill();
    // body armor
    const bg = c.createLinearGradient(0, -38, 0, -12);
    bg.addColorStop(0, '#6f98d2');
    bg.addColorStop(1, '#3e6194');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(-11, -35);
    c.quadraticCurveTo(0, -39, 11, -35);
    c.lineTo(10, -14);
    c.quadraticCurveTo(0, -11, -10, -14);
    c.closePath();
    c.fill();
    c.strokeStyle = '#223b5c';
    c.lineWidth = 1.2;
    c.stroke();
    // chest emblem
    c.fillStyle = 'rgba(209,232,255,.35)';
    c.beginPath(); c.arc(0, -26, 4.5, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(209,232,255,.6)';
    c.lineWidth = .9;
    c.stroke();
    // head + helmet
    c.fillStyle = '#ffd9b3';
    c.beginPath(); c.arc(0, -49, 10.5, 0, TAU); c.fill();
    c.fillStyle = '#577fb8';
    c.beginPath();
    c.arc(0, -51, 11.4, Math.PI * .98, Math.PI * 2.02);
    c.lineTo(11, -48);
    c.lineTo(8, -46);
    c.lineTo(-8, -46);
    c.lineTo(-11, -48);
    c.closePath();
    c.fill();
    c.strokeStyle = '#273f63';
    c.lineWidth = 1;
    c.stroke();
    // helmet crest
    c.fillStyle = '#dce9ff';
    c.beginPath();
    c.moveTo(-1, -62);
    c.quadraticCurveTo(3, -71, 12, -69);
    c.quadraticCurveTo(5, -65, 2, -60);
    c.closePath();
    c.fill();
    c.strokeStyle = '#91b2e0';
    c.lineWidth = .8;
    c.stroke();
    // face
    c.fillStyle = '#2d3242';
    c.beginPath(); c.arc(-3.8, -48, 1.2, 0, TAU); c.fill();
    c.beginPath(); c.arc(3.8, -48, 1.2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(87,66,50,.65)';
    c.lineWidth = .9;
    c.beginPath(); c.moveTo(-2.4, -44.5); c.lineTo(2.4, -44.5); c.stroke();
    // shield arm (front)
    const sx = 15 + attack * 4;
    c.save();
    c.translate(sx, -28);
    c.rotate(.08 + attack * .12);
    // shield
    c.fillStyle = '#4f74aa';
    c.beginPath();
    c.moveTo(-8, -18);
    c.lineTo(11, -16);
    c.quadraticCurveTo(14, 2, 8, 16);
    c.quadraticCurveTo(1, 22, -7, 16);
    c.quadraticCurveTo(-12, -1, -8, -18);
    c.closePath();
    c.fill();
    c.strokeStyle = '#d5e4fa';
    c.lineWidth = 1.8;
    c.stroke();
    c.strokeStyle = 'rgba(210,231,255,.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -12);
    c.lineTo(0, 13);
    c.stroke();
    // five tiny people etched on shield
    c.fillStyle = 'rgba(222,239,255,.62)';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(-3 + i * 4, -6, 1.1, 0, TAU);
      c.fill();
      rr(c, -4.1 + i * 4, -5, 2.2, 4, 1);
      c.fill();
    }
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.arc(-1 + i * 5, 3, 1.1, 0, TAU);
      c.fill();
      rr(c, -2.1 + i * 5, 4, 2.2, 4, 1);
      c.fill();
    }
    c.restore();
    // back arm
    c.strokeStyle = '#5279ab';
    c.lineWidth = 3.8;
    c.beginPath(); c.moveTo(-9, -29); c.lineTo(-14, -20); c.stroke();
  }

  // ------------------------------------------------------------
  // Static background
  // ------------------------------------------------------------
  function buildStaticBackground() {
    const c = document.createElement('canvas');
    const scale = 2;
    c.width = W * scale;
    c.height = H * scale;
    const g = c.getContext('2d');
    g.scale(scale, scale);

    // Base forest floor
    const base = g.createLinearGradient(0, 0, W * .6, H);
    base.addColorStop(0, '#0d2a22');
    base.addColorStop(.38, '#163b2c');
    base.addColorStop(.72, '#173d2d');
    base.addColorStop(1, '#0c261d');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);

    // Warm source light
    const warm = g.createRadialGradient(1040, 70, 10, 1040, 70, 760);
    warm.addColorStop(0, 'rgba(210,198,116,.17)');
    warm.addColorStop(.42, 'rgba(132,154,89,.06)');
    warm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = warm;
    g.fillRect(0, 0, W, H);

    // Cool fill
    const cool = g.createRadialGradient(160, 600, 20, 160, 600, 520);
    cool.addColorStop(0, 'rgba(90,164,142,.09)');
    cool.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cool;
    g.fillRect(0, 0, W, H);

    // Distant mist bands
    for (let i = 0; i < 5; i++) {
      const y = 110 + i * 67;
      const grd = g.createLinearGradient(0, y, W, y + 80);
      grd.addColorStop(0, 'rgba(166,194,157,0)');
      grd.addColorStop(.4, `rgba(166,194,157,${.018 + i * .003})`);
      grd.addColorStop(1, 'rgba(166,194,157,0)');
      g.fillStyle = grd;
      g.fillRect(0, y, W, 110);
    }

    // Big canopy silhouette at top
    g.save();
    g.fillStyle = 'rgba(4,16,12,.82)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W, 0);
    g.lineTo(W, 58);
    for (let x = W; x >= 0; x -= 70) {
      const y = 58 + Math.sin(x * .011 + 1.4) * 18 + Math.cos(x * .027) * 9;
      g.lineTo(x, y);
    }
    g.closePath();
    g.fill();

    // hanging leaves
    for (let i = 0; i < 24; i++) {
      const x = 20 + i * 55;
      const y = 48 + (i % 4) * 8;
      g.fillStyle = 'rgba(20,49,36,.8)';
      ellipse(g, x, y + 20, 17, 9, .35);
      g.fill();
    }
    g.restore();

    // Giant left tree / spawn source
    drawBigTree(g, 14, 18, .98);

    // Right shrine stones (behind core)
    g.save();
    g.fillStyle = 'rgba(35,61,49,.55)';
    ellipse(g, 1188, 395, 110, 42);
    g.fill();
    g.fillStyle = 'rgba(49,80,60,.45)';
    ellipse(g, 1190, 389, 84, 31);
    g.fill();
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7;
      const x = 1188 + Math.cos(a) * 94;
      const y = 390 + Math.sin(a) * 34;
      g.fillStyle = i % 2 ? 'rgba(78,105,76,.45)' : 'rgba(99,125,85,.32)';
      ellipse(g, x, y, 15 + (i % 3) * 4, 8, a);
      g.fill();
    }
    g.restore();

    // Scattered ground patches
    for (let i = 0; i < 42; i++) {
      const x = rand() * W;
      const y = 130 + rand() * 620;
      const rx = 18 + rand() * 68;
      const ry = 6 + rand() * 21;
      g.fillStyle = i % 3 === 0 ? 'rgba(72,112,81,.08)' : 'rgba(8,25,18,.1)';
      ellipse(g, x, y, rx, ry, rand() * .8);
      g.fill();
    }

    // Light shafts
    g.save();
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(880 + i * 38, -20);
      g.lineTo(1020 + i * 42, -20);
      g.lineTo(600 + i * 52, H + 30);
      g.lineTo(510 + i * 62, H + 30);
      g.closePath();
      const grd = g.createLinearGradient(800, 0, 600, H);
      grd.addColorStop(0, `rgba(228,224,157,${.022 - i * .003})`);
      grd.addColorStop(1, 'rgba(228,224,157,0)');
      g.fillStyle = grd;
      g.fill();
    }
    g.restore();

    // The path
    drawPath(g);

    // Ground details around path
    drawGroundDetails(g);

    // Foreground ferns / bushes
    drawForeground(g);

    return c;
  }

  function drawBigTree(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    // trunk
    const trunk = g.createLinearGradient(-50, 0, 50, 0);
    trunk.addColorStop(0, '#3a2a20');
    trunk.addColorStop(.5, '#5d4530');
    trunk.addColorStop(1, '#34251d');
    g.fillStyle = trunk;
    g.beginPath();
    g.moveTo(-46, 200);
    g.bezierCurveTo(-28, 100, -38, 30, -16, -40);
    g.bezierCurveTo(-6, -78, -16, -150, -38, -210);
    g.lineTo(6, -206);
    g.bezierCurveTo(18, -130, 8, -70, 22, -10);
    g.bezierCurveTo(38, 50, 34, 130, 54, 200);
    g.closePath();
    g.fill();
    // roots
    g.strokeStyle = '#33241b';
    g.lineWidth = 15;
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = .2 + i * .5;
      g.beginPath();
      g.moveTo(-10, 170);
      g.quadraticCurveTo(Math.cos(a) * 55, 200, Math.cos(a) * (80 + i * 9), 220 + Math.sin(a) * 15);
      g.stroke();
    }
    // branches
    g.strokeStyle = '#4a3426';
    g.lineWidth = 10;
    g.beginPath(); g.moveTo(-14, -90); g.bezierCurveTo(-80, -130, -130, -150, -184, -168); g.stroke();
    g.beginPath(); g.moveTo(0, -130); g.bezierCurveTo(40, -168, 100, -180, 150, -186); g.stroke();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(-90, -146); g.lineTo(-130, -200); g.stroke();
    g.beginPath(); g.moveTo(70, -176); g.lineTo(92, -228); g.stroke();
    // hanging pollen pods
    for (let i = 0; i < 7; i++) {
      const px = -150 + i * 30 + Math.sin(i * 2.4) * 13;
      const py = -152 + Math.cos(i * 1.7) * 28;
      g.strokeStyle = 'rgba(130,87,67,.5)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + 2, py + 26); g.stroke();
      const grd = g.createRadialGradient(px + 2, py + 30, 1, px + 2, py + 30, 11);
      grd.addColorStop(0, 'rgba(240,185,143,.55)');
      grd.addColorStop(1, 'rgba(196,113,104,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(px + 2, py + 30, 11, 0, TAU); g.fill();
      g.fillStyle = 'rgba(223,149,124,.55)';
      ellipse(g, px + 2, py + 30, 4.5, 6.5);
      g.fill();
    }
    // faint face in trunk
    g.fillStyle = 'rgba(17,12,9,.45)';
    g.beginPath(); g.ellipse(-8, -24, 13, 7, -.12, 0, TAU); g.fill();
    g.fillStyle = 'rgba(214,167,111,.21)';
    g.beginPath(); g.arc(-16, -26, 2.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(-1, -26, 2.2, 0, TAU); g.fill();
    g.restore();
  }

  function drawPath(g) {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const trace = () => {
      g.beginPath();
      g.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
    };

    // shadow
    g.save();
    g.translate(0, 7);
    trace();
    g.strokeStyle = 'rgba(2,10,7,.38)';
    g.lineWidth = 112;
    g.stroke();
    g.restore();

    // outer dark edge
    trace();
    g.strokeStyle = '#67563e';
    g.lineWidth = 108;
    g.stroke();

    // soil
    trace();
    g.strokeStyle = '#b59d75';
    g.lineWidth = 98;
    g.stroke();

    // inner warm path
    trace();
    g.strokeStyle = 'rgba(222,204,167,.82)';
    g.lineWidth = 84;
    g.stroke();

    // center highlight
    trace();
    g.strokeStyle = 'rgba(237,222,184,.2)';
    g.lineWidth = 44;
    g.stroke();

    // texture speckles
    for (let i = 0; i < 550; i++) {
      const d = rand() * PATH_LEN;
      const p = pathAt(d, {});
      const off = (rand() - .5) * 78;
      const x = p.x - p.ty * off;
      const y = p.y + p.tx * off;
      const r = rand();
      g.fillStyle = r > .62 ? 'rgba(119,95,65,.18)' : r > .3 ? 'rgba(249,236,203,.17)' : 'rgba(150,128,91,.16)';
      ellipse(g, x, y, .8 + rand() * 2.4, .6 + rand() * 1.2, rand() * TAU);
      g.fill();
    }

    // scattered pebbles at edges
    for (let i = 0; i < 120; i++) {
      const d = rand() * PATH_LEN;
      const p = pathAt(d, {});
      const side = rand() > .5 ? 1 : -1;
      const off = side * (51 + rand() * 11);
      const x = p.x - p.ty * off;
      const y = p.y + p.tx * off;
      g.fillStyle = rand() > .5 ? 'rgba(99,90,65,.45)' : 'rgba(70,83,61,.5)';
      ellipse(g, x, y, 2 + rand() * 4, 1.4 + rand() * 2.6, rand() * TAU);
      g.fill();
    }

    // direction chevrons
    for (let d = 90; d < PATH_LEN - 40; d += 190) {
      const p = pathAt(d, {});
      const a = Math.atan2(p.ty, p.tx);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(a);
      g.strokeStyle = 'rgba(125,103,71,.3)';
      g.lineWidth = 2;
      g.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        g.beginPath();
        g.moveTo(k * 8 - 5, -6);
        g.lineTo(k * 8 + 3, 0);
        g.lineTo(k * 8 - 5, 6);
        g.stroke();
      }
      g.restore();
    }

    // grass tufts on edges
    for (let i = 0; i < 90; i++) {
      const d = rand() * PATH_LEN;
      const p = pathAt(d, {});
      const side = rand() > .5 ? 1 : -1;
      const off = side * (57 + rand() * 12);
      const x = p.x - p.ty * off;
      const y = p.y + p.tx * off;
      g.strokeStyle = `rgba(${80 + rand() * 35 | 0},${118 + rand() * 30 | 0},${76 + rand() * 20 | 0},${.32 + rand() * .22})`;
      g.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(x + k * 2, y);
        g.quadraticCurveTo(x + Math.sin(rand() * 5) * 7, y - 8, x + Math.cos(rand() * 5) * 7, y - 13 - rand() * 4);
        g.stroke();
      }
    }
    g.restore();
  }

  function drawGroundDetails(g) {
    // ferns
    const fernSpots = [
      [56, 570], [300, 610], [520, 590], [810, 620], [1150, 600],
      [100, 130], [400, 120], [710, 130], [930, 140], [270, 300],
      [700, 470], [880, 560], [1160, 180], [520, 300]
    ];
    for (const [x, y] of fernSpots) {
      drawFern(g, x, y, .8 + rand() * .5, rand() * TAU);
    }

    // mushrooms
    for (let i = 0; i < 13; i++) {
      const x = 80 + rand() * 1080;
      const y = 150 + rand() * 540;
      if (nearPath(x, y, 70)) continue;
      drawMushroom(g, x, y, .6 + rand() * .8, rand() > .6);
    }

    // flowers
    for (let i = 0; i < 30; i++) {
      const x = 40 + rand() * 1180;
      const y = 150 + rand() * 560;
      if (nearPath(x, y, 66)) continue;
      drawFlower(g, x, y, .5 + rand() * .7, rand() > .65 ? '#e6d28c' : '#c3a6cf');
    }

    // rocks
    for (let i = 0; i < 20; i++) {
      const x = 40 + rand() * 1180;
      const y = 170 + rand() * 540;
      if (nearPath(x, y, 74)) continue;
      g.fillStyle = 'rgba(67,84,65,.48)';
      ellipse(g, x, y, 6 + rand() * 12, 3 + rand() * 6, rand() * TAU);
      g.fill();
      g.fillStyle = 'rgba(139,154,119,.16)';
      ellipse(g, x - 2, y - 2, 4 + rand() * 7, 1.5 + rand() * 2.5, rand() * TAU);
      g.fill();
    }

    // stumps
    for (const [x, y, s] of [[210, 120, .8], [940, 180, .65], [760, 690, .7]]) {
      g.fillStyle = 'rgba(54,48,34,.6)';
      ellipse(g, x, y, 19 * s, 8 * s);
      g.fill();
      g.fillStyle = 'rgba(113,91,61,.45)';
      ellipse(g, x, y - 6 * s, 15 * s, 6 * s);
      g.fill();
      g.strokeStyle = 'rgba(176,146,100,.16)';
      g.lineWidth = 1;
      ellipse(g, x, y - 6 * s, 9 * s, 3.4 * s);
      g.stroke();
    }
  }

  function nearPath(x, y, d) {
    for (let i = 0; i < PATH.length; i += 2) {
      if (dist2(x, y, PATH[i].x, PATH[i].y) < d * d) return true;
    }
    return false;
  }

  function drawFern(g, x, y, s, rot) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s, s);
    g.strokeStyle = 'rgba(83,128,80,.5)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const a = -1.75 + i * .5;
      const len = 22 + (i % 3) * 6;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(Math.cos(a) * len * .55, Math.sin(a) * len * .55 - 4, Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
      g.fillStyle = 'rgba(91,141,88,.34)';
      for (let k = 1; k < 4; k++) {
        const tt = k / 4;
        const px = Math.cos(a) * len * tt;
        const py = Math.sin(a) * len * tt - Math.sin(tt * Math.PI) * 2;
        ellipse(g, px, py, 3.5 - k * .4, 1.4, a);
        g.fill();
      }
    }
    g.restore();
  }

  function drawMushroom(g, x, y, s, purple) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(219,205,177,.48)';
    g.fillRect(-1.2, -8, 2.4, 8);
    g.fillStyle = purple ? 'rgba(161,125,170,.52)' : 'rgba(204,155,100,.5)';
    g.beginPath();
    g.arc(0, -8, 6.5, Math.PI, TAU);
    g.quadraticCurveTo(0, -4, -6.5, -8);
    g.fill();
    g.fillStyle = 'rgba(255,244,212,.3)';
    g.beginPath(); g.arc(-2, -10, 1.1, 0, TAU); g.fill();
    g.beginPath(); g.arc(2.5, -9.5, .8, 0, TAU); g.fill();
    g.restore();
  }

  function drawFlower(g, x, y, s, color) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.strokeStyle = 'rgba(109,151,91,.4)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(1, -8, 0, -14); g.stroke();
    g.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      ellipse(g, Math.cos(a) * 3.2, -14 + Math.sin(a) * 3.2, 2.2, 1.4, a);
      g.fill();
    }
    g.fillStyle = 'rgba(255,226,152,.6)';
    g.beginPath(); g.arc(0, -14, 1.3, 0, TAU); g.fill();
    g.restore();
  }

  function drawForeground(g) {
    // bottom and top edge bushes silhouettes
    const bushes = [
      [-30, 700, 150], [180, 730, 180], [440, 720, 130], [720, 740, 170], [1000, 720, 160], [1250, 710, 140],
      [40, 100, 90], [1080, 95, 120], [860, 40, 100]
    ];
    for (const [x, y, r] of bushes) {
      g.fillStyle = 'rgba(6,21,15,.65)';
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(25,56,39,.45)';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.2;
        g.beginPath();
        g.arc(x + Math.cos(a) * r * .4, y + Math.sin(a) * r * .2 - 10, r * .55, 0, TAU);
        g.fill();
      }
      // small leaves
      for (let i = 0; i < 12; i++) {
        const a = rand() * TAU;
        const rad = r * (.25 + rand() * .6);
        g.fillStyle = `rgba(${70 + rand() * 50 | 0},${110 + rand() * 50 | 0},${80 + rand() * 30 | 0},.26)`;
        ellipse(g, x + Math.cos(a) * rad, y + Math.sin(a) * rad * .45, 7, 3, a);
        g.fill();
      }
    }
    // tiny foreground grass tips
    g.strokeStyle = 'rgba(69,112,68,.5)';
    g.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x = rand() * W;
      const y = H - 10 - rand() * 50;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rand() - .5) * 14, y - 18, x + (rand() - .5) * 24, y - 30 - rand() * 15);
      g.stroke();
    }
  }

  // ------------------------------------------------------------
  // Frame loop
  // ------------------------------------------------------------
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(.05, (now - lastTime) / 1000);
    lastTime = now;
    if (game.screen === 'playing' && !game.paused) {
      update(dt * game.speed);
    } else {
      game.realTime += dt;
      updateMotes(dt);
      if (game.screen === 'menu') {
        game.time += dt * .4;
      }
    }
    render(now);
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------
  // Event wiring
  // ------------------------------------------------------------
  function wireEvents() {
    el.startBtn.addEventListener('click', () => {
      AudioSys.unlock();
      startGame();
    });

    const rotateOverlay = document.querySelector('#rotateOverlay');
    const rotateDismiss = document.querySelector('#rotateDismiss');
    if (rotateDismiss) {
      rotateDismiss.addEventListener('click', () => {
        rotateOverlay.classList.add('hidden');
      });
    }

    el.restartBtn.addEventListener('click', () => {
      resetGame();
      el.resultScreen.classList.add('hidden');
      el.resultScreen.setAttribute('aria-hidden', 'true');
      buildWaveDots();
      syncHud(true);
      showBanner('prep');
      game.lastBannerSecond = -1;
    });

    el.btnPause.addEventListener('click', () => togglePause());
    el.btnSpeed.addEventListener('click', () => {
      if (game.speed === 1) game.speed = 2;
      else if (game.speed === 2) game.speed = 3;
      else game.speed = 1;
      el.btnSpeed.textContent = game.speed + '×';
      AudioSys.sfx('select');
    });
    el.btnSound.addEventListener('click', () => {
      AudioSys.unlock();
      const muted = !AudioSys.mutedByUser;
      AudioSys.setMuted(muted);
      el.controls.classList.toggle('muted', muted);
      if (!muted) AudioSys.startMusic();
    });

    function togglePause() {
      if (game.screen !== 'playing') return;
      game.paused = !game.paused;
      el.controls.classList.toggle('paused', game.paused);
      el.btnPause.setAttribute('aria-label', game.paused ? '继续游戏' : '暂停游戏');
      setHint(game.paused ? '已暂停 · 按 <strong>空格</strong> 继续' : '已继续 · 花粉还在路上');
      AudioSys.sfx('select');
    }

    el.callWave.addEventListener('click', e => {
      e.stopPropagation();
      startWave(true);
    });
    el.bannerCall.addEventListener('click', e => {
      e.stopPropagation();
      startWave(true);
    });

    el.canvas.addEventListener('pointermove', e => {
      if (game.screen !== 'playing') return;
      const p = screenToWorld(e.clientX, e.clientY);
      game.mouse.x = p.x;
      game.mouse.y = p.y;
      const pad = findPadAt(p.x, p.y);
      game.hoverPad = pad;
      const heroKey = findHeroAt(p.x, p.y);
      game.hoverHero = heroKey;
      if (heroKey) el.canvas.style.cursor = 'pointer';
      else if (pad >= 0 && game.selectedHero && !game.heroes.has(game.selectedHero)) el.canvas.style.cursor = 'pointer';
      else el.canvas.style.cursor = 'default';
    });

    el.canvas.addEventListener('pointerleave', () => {
      game.hoverPad = -1;
      game.hoverHero = null;
    });

    el.canvas.addEventListener('pointerdown', e => {
      if (game.screen !== 'playing') return;
      e.preventDefault();
      const p = screenToWorld(e.clientX, e.clientY);
      const heroKey = findHeroAt(p.x, p.y);
      if (heroKey) {
        const h = game.heroes.get(heroKey);
        selectHero(heroKey);
        if (h) {
          showToast(`${HERO_DEFS[heroKey].name} · 「${HERO_DEFS[heroKey].skill}」${h.skillCd > 0 ? `冷却 ${Math.ceil(h.skillCd)} 秒` : '已就绪'}`);
        }
        return;
      }
      const pad = findPadAt(p.x, p.y);
      if (pad >= 0) {
        let occupied = false;
        for (const [, h] of game.heroes) if (h.pad === pad) occupied = true;
        if (game.selectedHero && !occupied) tryDeploy(pad);
        else if (occupied) {
          const h = [...game.heroes.values()].find(hh => hh.pad === pad);
          if (h) {
            selectHero(h.key);
            showToast(`${HERO_DEFS[h.key].name} · Lv.${h.level}`);
          }
        } else if (!game.selectedHero) {
          setHint('先在上方卡片里选一位守林人，再点击花台');
        }
      } else {
        game.selectedHero = null;
        refreshCards();
        setHint('选一位守林人，点击花台布阵');
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === ' ' || e.code === 'Space') {
        if (game.screen === 'playing') {
          e.preventDefault();
          togglePause();
        }
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        if (game.screen !== 'playing') return;
        if (game.speed === 1) game.speed = 2;
        else if (game.speed === 2) game.speed = 3;
        else game.speed = 1;
        el.btnSpeed.textContent = game.speed + '×';
        return;
      }
      if (e.key === 'Escape') {
        game.selectedHero = null;
        refreshCards();
        setHint('已取消选择');
        return;
      }
      if (game.screen !== 'playing') return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) {
        selectHero(HERO_ORDER[idx]);
        return;
      }
      const skillKey = { q: 'dash', w: 'shiver', e: 'blast', r: 'wall' }[e.key.toLowerCase()];
      if (skillKey) {
        e.preventDefault();
        castSkill(skillKey);
      }
    });

    window.addEventListener('resize', () => {
      resize();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.screen === 'playing' && !game.paused) {
        game.paused = true;
        el.controls.classList.add('paused');
      }
    });
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    buildWaveDots();
    buildHeroCards();
    buildSkillCards();
    buildStartLineup();
    createMotes();
    resize();
    staticBg = buildStaticBackground();
    wireEvents();
    syncHud(true);
    requestAnimationFrame(() => {
      resize();
      for (const key of HERO_ORDER) {
        const canvas = cardEls[key] && cardEls[key].querySelector('canvas');
        if (canvas) drawPortrait(key, canvas);
      }
      for (const item of el.startLineup.children) {
        const key = HERO_ORDER[Array.from(el.startLineup.children).indexOf(item)];
        const canvas = item.querySelector('canvas');
        if (canvas) drawPortrait(key, canvas, 1.02);
      }
    });
    requestAnimationFrame(loop);
    window.__PF = {
      game,
      start: startGame,
      deploy: (key, pad) => { game.selectedHero = key; tryDeploy(pad); },
      upgrade: tryUpgrade,
      cast: castSkill,
      startWave,
      speed: v => { game.speed = v; },
      skipPrep: () => { if (game.phase === 'prep') { game.prep = .01; } },
      win: winGame,
      lose: loseGame,
      spawn: type => spawnEnemy(type),
      api: { HERO_DEFS, WAVES, PADS, PATH_LEN }
    };
  }

  init();
})();
