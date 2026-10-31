/* 睦子米魔人 — procedural audio: synthesized BGM + SFX */
(function () {
  'use strict';
  const G = window.G;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.ready = false;
      this.muted = false;
      this.musicVolume = 0.55;
      this.sfxVolume = 0.75;
      this.trackName = null;
      this.track = null;
      this.step = 0;
      this.nextTime = 0;
      this.timer = null;
      this.lastShot = 0;
      this.lastItem = 0;
      this.lastPower = 0;
      this.tracks = null;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.95;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 18;
      this.limiter.ratio.value = 4;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.22;
      this.master.connect(this.limiter);
      this.limiter.connect(ctx.destination);

      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.9;
      this.musicGain.connect(this.master);

      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume * 0.7;
      this.sfxGain.connect(this.master);

      // reverb
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(1.8, 3.0);
      this.reverbGain = ctx.createGain();
      this.reverbGain.gain.value = 0.34;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);

      // ping-pong-ish delay
      this.delay = ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.29;
      this.delayFb = ctx.createGain();
      this.delayFb.gain.value = 0.32;
      this.delayFilter = ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 2400;
      this.delaySend = ctx.createGain();
      this.delaySend.gain.value = 0.22;
      this.delaySend.connect(this.delay);
      this.delay.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFb);
      this.delayFb.connect(this.delay);
      this.delay.connect(this.musicGain);

      this.noiseBuf = this._noise(1.2);
      this.tracks = this._buildTracks();
      this.ready = true;

      // resume on any gesture
      const resume = () => { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); };
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
      window.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else if (!this.muted) this.ctx.resume();
      });
    }

    _noise(seconds) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    _impulse(seconds, decay) {
      const ctx = this.ctx;
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 80 ? i / 80 : 1);
        }
      }
      return buf;
    }

    setMuted(m) {
      this.muted = m;
      if (this.master) {
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(m ? 0 : 0.95, t, 0.05);
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    /* ------------------------------------------------------------------ */
    /*  SFX                                                                */
    /* ------------------------------------------------------------------ */
    _sfxVol(g) { return g * this.sfxVolume; }

    _ping(freq, dur, gain, type = 'sine', slideTo = null) {
      if (!this.ready || this.muted) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(this._sfxVol(gain), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + dur + 0.02);
    }

    _noiseHit(dur, gain, freq, q = 1, type = 'bandpass') {
      if (!this.ready || this.muted) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(this._sfxVol(gain), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.sfxGain);
      src.start(t); src.stop(t + dur);
    }

    sfx(name) {
      if (!this.ready || this.muted) return;
      switch (name) {
        case 'shot':
          if (this.ctx.currentTime - this.lastShot < 0.055) return;
          this.lastShot = this.ctx.currentTime;
          this._ping(1500 + Math.random() * 160, 0.045, 0.018, 'triangle', 900);
          break;
        case 'graze':
          this._ping(2350 + Math.random() * 300, 0.06, 0.035, 'sine', 2900);
          break;
        case 'item':
          if (this.ctx.currentTime - this.lastItem < 0.045) return;
          this.lastItem = this.ctx.currentTime;
          this._ping(1400, 0.05, 0.02, 'square', 1900);
          break;
        case 'power':
          if (this.ctx.currentTime - this.lastPower < 0.06) return;
          this.lastPower = this.ctx.currentTime;
          this._ping(760, 0.10, 0.035, 'triangle', 1500);
          break;
        case 'enemy':
          this._noiseHit(0.12, 0.05, 1200, 0.8);
          this._ping(240, 0.10, 0.025, 'sawtooth', 90);
          break;
        case 'die':
          this._noiseHit(0.5, 0.22, 700, 0.5, 'lowpass');
          this._ping(420, 0.55, 0.14, 'sawtooth', 60);
          break;
        case 'bomb':
          this._noiseHit(0.9, 0.20, 500, 0.4, 'lowpass');
          this._ping(180, 0.8, 0.10, 'sine', 55);
          this._ping(880, 0.5, 0.05, 'triangle', 220);
          break;
        case 'spell':
          this._bell(55, 0.30);
          this._bell(67, 0.22);
          this._bell(74, 0.18);
          break;
        case 'select':
          this._ping(660, 0.06, 0.03, 'triangle', 720);
          break;
        case 'confirm':
          this._ping(880, 0.09, 0.035, 'triangle', 1320);
          setTimeout(() => this._ping(1320, 0.10, 0.025, 'triangle', 1760), 55);
          break;
        case 'cancel':
          this._ping(440, 0.10, 0.03, 'triangle', 330);
          break;
        case 'pause':
          this._ping(520, 0.08, 0.03, 'sine', 390);
          break;
        case 'extend':
          [0, 4, 7, 12].forEach((n, i) => setTimeout(() => this._ping(mtof(72 + n), 0.18, 0.04, 'triangle'), i * 80));
          break;
        case 'timeout':
          this._ping(110, 0.9, 0.10, 'sine', 55);
          this._bell(43, 0.25);
          break;
        case 'laser':
          this._noiseHit(0.4, 0.08, 2200, 2, 'bandpass');
          this._ping(1600, 0.3, 0.03, 'sawtooth', 400);
          break;
        case 'capture':
          [0, 7, 12, 16].forEach((n, i) => setTimeout(() => this._bell(72 + n, 0.12), i * 90));
          break;
        case 'tick':
          this._ping(1000, 0.03, 0.015, 'square');
          break;
      }
    }

    _bell(midi, gain) {
      if (!this.ready || this.muted) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const f = mtof(midi);
      for (const [mult, gg, dur] of [[1, 1, 2.2], [2.01, 0.5, 1.4], [2.99, 0.3, 0.9]]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(this._sfxVol(gain) * gg * 0.4, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.reverb); g.connect(this.sfxGain);
        o.start(t); o.stop(t + dur + 0.05);
      }
    }

    /* ------------------------------------------------------------------ */
    /*  Music                                                              */
    /* ------------------------------------------------------------------ */
    _buildTracks() {
      return {
        title: this._makeTitle(),
        stage: this._makeStage(),
        boss: this._makeBoss(),
        result: this._makeResult()
      };
    }

    _base(bpm, bars, chords) {
      return {
        bpm, bars, chords,
        stepsPerBar: 16,
        loopSteps: bars * 16,
        eventMap: new Map(),
        duration: (bars * 16) * (60 / bpm / 4)
      };
    }

    _ev(tr, step, voice, midi, dur, gain) {
      if (!tr.eventMap.has(step)) tr.eventMap.set(step, []);
      tr.eventMap.get(step).push({ voice, midi, dur, gain });
    }

    _chordNotes(tr, bar) {
      return tr.chords[bar % tr.chords.length];
    }

    _makeTitle() {
      const tr = this._base(92, 8, [
        { root: 45, triad: [57, 60, 64] }, { root: 41, triad: [53, 57, 60] },
        { root: 48, triad: [55, 60, 64] }, { root: 43, triad: [55, 59, 62] },
        { root: 45, triad: [57, 60, 64] }, { root: 41, triad: [53, 57, 60] },
        { root: 38, triad: [50, 53, 57] }, { root: 40, triad: [52, 56, 59] }
      ]);
      for (let bar = 0; bar < tr.bars; bar++) {
        const ch = this._chordNotes(tr, bar);
        const s = bar * 16;
        // airy pad
        for (const n of ch.triad) this._ev(tr, s, 'pad', n + 12, 16, 0.028);
        // sparse bell arpeggio
        const arp = [0, 3, 7, 10, 12, 7, 3, 0];
        for (let i = 0; i < 8; i++) {
          if ((bar + i) % 3 === 2) continue;
          this._ev(tr, s + i * 2, 'arp', ch.triad[i % 3] + 12, 3, 0.020);
        }
        this._ev(tr, s, 'bass', ch.root, 8, 0.10);
        this._ev(tr, s + 8, 'bass', ch.root + 7, 6, 0.075);
        if (bar % 2 === 0) this._ev(tr, s, 'kick', 0, 1, 0.18);
        if (bar % 4 === 2) this._ev(tr, s + 8, 'snare', 0, 1, 0.06);
      }
      // lonely melody
      const mel = [
        [0, 0, 76, 6], [0, 8, 79, 6], [1, 0, 77, 4], [1, 4, 76, 4], [1, 8, 72, 6],
        [2, 0, 74, 6], [2, 8, 76, 6], [3, 0, 79, 8], [3, 10, 77, 4],
        [4, 0, 81, 6], [4, 8, 79, 4], [4, 12, 76, 4], [5, 0, 77, 8], [5, 10, 74, 5],
        [6, 0, 72, 6], [6, 8, 74, 4], [6, 12, 77, 4], [7, 0, 76, 12]
      ];
      for (const [bar, st, n, d] of mel) this._ev(tr, bar * 16 + st, 'leadSoft', n, d, 0.055);
      return tr;
    }

    _makeStage() {
      const tr = this._base(152, 16, [
        { root: 45, triad: [57, 60, 64] }, { root: 41, triad: [53, 57, 60] },
        { root: 48, triad: [55, 60, 64] }, { root: 43, triad: [55, 59, 62] },
        { root: 45, triad: [57, 60, 64] }, { root: 41, triad: [53, 57, 60] },
        { root: 38, triad: [50, 53, 57] }, { root: 40, triad: [52, 56, 59] }
      ]);
      const melody = [
        // bar 0
        [0, 69, 4], [4, 72, 2], [6, 76, 2], [8, 81, 6], [14, 79, 2],
        // bar 1
        [16, 77, 4], [20, 76, 2], [22, 72, 2], [24, 74, 4], [28, 76, 4],
        // bar 2
        [32, 79, 4], [36, 76, 2], [38, 72, 2], [40, 76, 6], [46, 74, 2],
        // bar 3
        [48, 72, 4], [52, 74, 2], [54, 76, 2], [56, 79, 8],
        // bar 4
        [64, 81, 4], [68, 79, 2], [70, 76, 2], [72, 72, 4], [76, 74, 4],
        // bar 5
        [80, 77, 4], [84, 81, 2], [86, 79, 2], [88, 77, 4], [92, 76, 4],
        // bar 6
        [96, 74, 4], [100, 77, 2], [102, 81, 2], [104, 86, 8],
        // bar 7
        [112, 84, 4], [116, 83, 2], [118, 79, 2], [120, 76, 8]
      ];
      for (let rep = 0; rep < 2; rep++) {
        const off = rep * 128;
        for (const [st, n, d] of melody) this._ev(tr, off + st, 'lead', n - (rep ? 0 : 0), d, 0.075);
        // harmony a third below on second pass
        if (rep === 1) for (const [st, n, d] of melody) this._ev(tr, off + st, 'arp', n - 5, d, 0.026);
      }

      for (let bar = 0; bar < tr.bars; bar++) {
        const ch = this._chordNotes(tr, bar);
        const s = bar * 16;
        // bass: driving eighths with octave pops
        const bassPat = [0, 0, 12, 0, 0, 0, 7, 0, 0, 0, 12, 0, 7, 0, 10, 0];
        for (let i = 0; i < 16; i++) {
          if (bassPat[i] !== null) this._ev(tr, s + i, 'bass', ch.root + bassPat[i], 2, i % 4 === 0 ? 0.13 : 0.085);
        }
        // arpeggio 16ths
        for (let i = 0; i < 16; i++) {
          const n = ch.triad[i % 3] + 12 + (i >= 8 ? 12 : 0);
          this._ev(tr, s + i, 'arp', n, 2, 0.018);
        }
        // drums
        for (let i = 0; i < 16; i++) {
          if (i % 4 === 0) this._ev(tr, s + i, 'kick', 0, 1, 0.22);
          if (i === 4 || i === 12) this._ev(tr, s + i, 'snare', 0, 1, 0.10);
          if (i % 2 === 0) this._ev(tr, s + i, 'hat', 0, 1, i % 4 === 0 ? 0.05 : 0.032);
        }
        if (bar % 4 === 0) this._ev(tr, s, 'crash', 0, 1, 0.05);
      }
      return tr;
    }

    _makeBoss() {
      const tr = this._base(178, 16, [
        { root: 38, triad: [50, 53, 57] }, { root: 34, triad: [50, 53, 58] },
        { root: 36, triad: [48, 52, 55] }, { root: 33, triad: [49, 52, 57] },
        { root: 38, triad: [50, 53, 57] }, { root: 34, triad: [50, 53, 58] },
        { root: 31, triad: [50, 55, 58] }, { root: 33, triad: [49, 52, 57] }
      ]);
      const melody = [
        [0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 86, 4], [10, 84, 2], [12, 81, 2], [14, 77, 2],
        [16, 82, 4], [20, 81, 2], [22, 77, 2], [24, 74, 4], [28, 77, 2], [30, 82, 2],
        [32, 84, 4], [36, 82, 2], [38, 79, 2], [40, 76, 4], [44, 79, 2], [46, 84, 2],
        [48, 81, 8], [56, 84, 2], [58, 88, 2], [60, 86, 2], [62, 84, 2],
        [64, 86, 4], [68, 84, 2], [70, 81, 2], [72, 77, 4], [76, 81, 2], [78, 86, 2],
        [80, 89, 4], [84, 86, 2], [86, 82, 2], [88, 77, 4], [92, 82, 2], [94, 86, 2],
        [96, 87, 4], [100, 86, 2], [102, 82, 2], [104, 79, 4], [108, 82, 2], [110, 87, 2],
        [112, 88, 6], [118, 86, 2], [120, 84, 2], [122, 81, 2], [124, 76, 4]
      ];
      for (let rep = 0; rep < 2; rep++) {
        const off = rep * 128;
        for (const [st, n, d] of melody) {
          this._ev(tr, off + st, 'lead', n, d, 0.070);
          if (rep === 1) this._ev(tr, off + st, 'arp', n - 12, d, 0.022);
        }
      }
      for (let bar = 0; bar < tr.bars; bar++) {
        const ch = this._chordNotes(tr, bar);
        const s = bar * 16;
        const bassPat = [0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 0, 12, 0, 10, 7, 0];
        for (let i = 0; i < 16; i++) {
          if (bassPat[i] !== null) this._ev(tr, s + i, 'bass', ch.root + bassPat[i], 2, i % 4 === 0 ? 0.15 : 0.09);
          this._ev(tr, s + i, 'arp', ch.triad[i % 3] + 24, 2, 0.014);
          if (i % 4 === 0 || i === 6 || i === 10 || i === 14) this._ev(tr, s + i, 'kick', 0, 1, 0.24);
          if (i === 4 || i === 12) this._ev(tr, s + i, 'snare', 0, 1, 0.12);
          this._ev(tr, s + i, 'hat', 0, 1, i % 2 === 0 ? 0.045 : 0.026);
        }
        if (bar % 2 === 0) this._ev(tr, s, 'crash', 0, 1, 0.04);
      }
      return tr;
    }

    _makeResult() {
      const tr = this._base(84, 8, [
        { root: 45, triad: [57, 60, 64] }, { root: 41, triad: [53, 57, 60] },
        { root: 48, triad: [55, 60, 64] }, { root: 43, triad: [55, 59, 62] },
        { root: 45, triad: [57, 60, 64] }, { root: 41, triad: [53, 57, 60] },
        { root: 38, triad: [50, 53, 57] }, { root: 45, triad: [57, 60, 64] }
      ]);
      for (let bar = 0; bar < tr.bars; bar++) {
        const ch = this._chordNotes(tr, bar);
        const s = bar * 16;
        for (const n of ch.triad) this._ev(tr, s, 'pad', n + 12, 16, 0.03);
        for (let i = 0; i < 4; i++) this._ev(tr, s + i * 4, 'bass', ch.root, 3, 0.08);
        for (let i = 0; i < 4; i++) this._ev(tr, s + i * 4 + 2, 'arp', ch.triad[i % 3] + 24, 2, 0.016);
      }
      const mel = [
        [0, 72, 8], [8, 76, 8], [16, 74, 8], [24, 72, 8],
        [32, 79, 8], [40, 76, 8], [48, 74, 16],
        [64, 72, 8], [72, 76, 8], [80, 79, 8], [88, 81, 8],
        [96, 77, 8], [104, 76, 8], [112, 72, 16]
      ];
      for (const [st, n, d] of mel) this._ev(tr, st, 'leadSoft', n, d, 0.05);
      return tr;
    }

    music(name) {
      if (!this.ready) return;
      if (this.trackName === name && this.timer) return;
      this.trackName = name;
      this.track = this.tracks[name] || this.tracks.title;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.06;
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => this._schedule(), 25);
      this._schedule();
    }

    stopMusic() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.trackName = null;
      this.track = null;
    }

    _schedule() {
      if (!this.ready || !this.track) return;
      const ctx = this.ctx;
      const stepDur = 60 / this.track.bpm / 4;
      if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.02;
      while (this.nextTime < ctx.currentTime + 0.14) {
        this._playStep(this.track, this.step, this.nextTime);
        this.nextTime += stepDur;
        this.step = (this.step + 1) % this.track.loopSteps;
      }
    }

    _playStep(tr, step, t) {
      const evs = tr.eventMap.get(step);
      if (!evs) return;
      for (const e of evs) {
        const dur = e.dur * (60 / tr.bpm / 4);
        switch (e.voice) {
          case 'lead': this._lead(t, e.midi, dur, e.gain, 'square'); break;
          case 'leadSoft': this._lead(t, e.midi, dur, e.gain, 'triangle'); break;
          case 'bass': this._bass(t, e.midi, dur, e.gain); break;
          case 'arp': this._pluck(t, e.midi, dur, e.gain); break;
          case 'pad': this._pad(t, e.midi, dur, e.gain); break;
          case 'kick': this._kick(t, e.gain); break;
          case 'snare': this._snare(t, e.gain); break;
          case 'hat': this._hat(t, e.gain); break;
          case 'crash': this._crash(t, e.gain); break;
        }
      }
    }

    _lead(t, midi, dur, gain, type) {
      if (this.muted) return;
      const ctx = this.ctx, f = mtof(midi);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = type; o2.type = type;
      o1.frequency.value = f; o2.frequency.value = f;
      o1.detune.value = -6; o2.detune.value = 7;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(3400, t);
      filt.frequency.exponentialRampToValueAtTime(1900, t + dur);
      filt.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(gain * 0.55, t + Math.min(dur * 0.7, 0.5));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      o1.connect(filt); o2.connect(filt);
      filt.connect(g); g.connect(this.musicGain);
      if (this.delaySend) g.connect(this.delaySend);
      o1.start(t); o2.start(t);
      o1.stop(t + dur + 0.08); o2.stop(t + dur + 0.08);
    }

    _bass(t, midi, dur, gain) {
      if (this.muted) return;
      const ctx = this.ctx, f = mtof(midi);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = f / 2;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(900, t);
      filt.frequency.exponentialRampToValueAtTime(220, t + dur);
      filt.Q.value = 2.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const sg = ctx.createGain();
      sg.gain.value = 0.5;
      o.connect(filt); sub.connect(sg); sg.connect(filt);
      filt.connect(g); g.connect(this.musicGain);
      o.start(t); sub.start(t);
      o.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
    }

    _pluck(t, midi, dur, gain) {
      if (this.muted) return;
      const ctx = this.ctx, f = mtof(midi);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.22));
      o.connect(g); g.connect(this.musicGain);
      if (this.delaySend) g.connect(this.delaySend);
      o.start(t); o.stop(t + Math.min(dur, 0.22) + 0.03);
    }

    _pad(t, midi, dur, gain) {
      if (this.muted) return;
      const ctx = this.ctx, f = mtof(midi);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'sawtooth';
      o1.frequency.value = f; o2.frequency.value = f;
      o1.detune.value = -9; o2.detune.value = 9;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1100;
      filt.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.5);
      g.gain.setValueAtTime(gain, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
      o1.connect(filt); o2.connect(filt); filt.connect(g);
      g.connect(this.musicGain); g.connect(this.reverb);
      o1.start(t); o2.start(t);
      o1.stop(t + dur + 0.7); o2.stop(t + dur + 0.7);
    }

    _kick(t, gain) {
      if (this.muted) return;
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + 0.2);
    }

    _snare(t, gain) {
      if (this.muted) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      src.connect(f); f.connect(g); g.connect(this.musicGain);
      g.connect(this.reverb);
      src.start(t); src.stop(t + 0.16);
    }

    _hat(t, gain) {
      if (this.muted) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      src.connect(f); f.connect(g); g.connect(this.musicGain);
      src.start(t); src.stop(t + 0.05);
    }

    _crash(t, gain) {
      if (this.muted) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 4500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      src.connect(f); f.connect(g); g.connect(this.musicGain);
      g.connect(this.reverb);
      src.start(t); src.stop(t + 1.0);
    }
  }

  G.Audio = new AudioEngine();
})();
