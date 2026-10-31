/* 睦子米魔人 — game flow, screens, HUD */
(function () {
  'use strict';
  const G = window.G;
  const PF = G.PF;
  const TAU = G.TAU;
  const CANVAS_W = 640, CANVAS_H = 480;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const params = new URLSearchParams(location.search);

  const BGM_NAMES = {
    title: '碧雾之庭',
    stage: '碧雾的尽头',
    boss: '睦子米魔人',
    result: '余韵 · 绿月'
  };

  const say = (who, name, side, text) => ({
    who, name, side, text,
    glow: who === 'midori' ? 'rgba(40,160,110,0.35)' : 'rgba(40,200,140,0.4)'
  });

  const STORY = {
    opening: [
      say('mutsumi', '？？？', 'right', '欢迎光临碧雾庭园——请问您有预约吗？没有的话，脸也可以先寄存在前台。'),
      say('midori', '祓使 翠', 'left', '……我只是路过。你们这里连路灯都是脸？'),
      say('mutsumi', '？？？', 'right', '那是氛围灯。我们主打沉浸式人脸主题，差评率只有百分之九十八。'),
      say('midori', '祓使 翠', 'left', '……剩下百分之二呢？'),
      say('mutsumi', '？？？', 'right', '没有脸给差评。'),
      say('midori', '祓使 翠', 'left', '好冷的笑话。'),
      say('mutsumi', '？？？', 'right', '谢谢，我练了三百年。要办会员卡吗？充三百送一张别人的脸。'),
      say('midori', '祓使 翠', 'left', '不用。我是祓使，来清理这里的异常。'),
      say('mutsumi', '？？？', 'right', '祓使？正好，我们缺一个保洁。五险一金没有，脸险有一份。'),
      say('midori', '祓使 翠', 'left', '……脸险保什么？'),
      say('mutsumi', '？？？', 'right', '保我不脸盲。可惜去年过期了。'),
      say('midori', '祓使 翠', 'left', '我现在走还来得及吗？'),
      say('mutsumi', '？？？', 'right', '来不及了，电梯已经改成弹幕了。')
    ],
    midBefore: [
      say('cirno', '霜见', 'right', '欢迎光临——啊不是，站住！这里是员工通道，游客请走弹幕通道。'),
      say('midori', '祓使 翠', 'left', '我是祓使，不是游客。'),
      say('cirno', '霜见', 'right', '祓使也要排队。前面还有三十七张脸在等退票。'),
      say('midori', '祓使 翠', 'left', '那些脸还会退票？'),
      say('cirno', '霜见', 'right', '会。她们说体验感不好，弹幕太密，脸都挤变形了。'),
      say('midori', '祓使 翠', 'left', '所以你就替魔人守门？'),
      say('cirno', '霜见', 'right', '嗯。她说干满三百年，就把脸还我，还包转正。'),
      say('midori', '祓使 翠', 'left', '三百年？你签合同了吗？'),
      say('cirno', '霜见', 'right', '签了。合同也是一张脸，签完就被她收走了。'),
      say('midori', '祓使 翠', 'left', '……我来帮你把合同要回来。'),
      say('cirno', '霜见', 'right', '真的吗？那太好了！不过按照流程，我得先和你打一场。'),
      say('midori', '祓使 翠', 'left', '为什么？'),
      say('cirno', '霜见', 'right', '因为我是前台。前台不能直接放人进去，会被扣绩效。'),
      say('midori', '祓使 翠', 'left', '你们这个庭园到底有几个正常人？'),
      say('cirno', '霜见', 'right', '目前零个。请多指教。')
    ],
    midAfter: [
      say('cirno', '霜见', 'right', '啊……我输了。这个月的全勤奖也没了。'),
      say('midori', '祓使 翠', 'left', '你还有全勤奖？'),
      say('cirno', '霜见', 'right', '本来有。现在变成一张脸的形状，被她收走了。'),
      say('midori', '祓使 翠', 'left', '你的脸我会拿回来。'),
      say('cirno', '霜见', 'right', '谢谢。对了，进去以后别信她说的任何话。'),
      say('midori', '祓使 翠', 'left', '比如？'),
      say('cirno', '霜见', 'right', '比如「我只收脸，不收费」。她收完脸还会收停车费。'),
      say('midori', '祓使 翠', 'left', '这里还有停车场？'),
      say('cirno', '霜见', 'right', '有。停的是脸。一小时一张。'),
      say('midori', '祓使 翠', 'left', '我越来越不想进去了。'),
      say('cirno', '霜见', 'right', '加油。记得给我五星好评，不然我这个月白干。')
    ],
    bossBefore: [
      say('mutsumi', '睦子米魔人', 'right', '欢迎欢迎——这位客人，您的脸真好看，是原装的吗？'),
      say('midori', '祓使 翠', 'left', '……原装。你谁？'),
      say('mutsumi', '睦子米魔人', 'right', '睦子米，碧雾庭园主理人，兼首席面部资产管理师。您可以叫我「米总」。'),
      say('midori', '祓使 翠', 'left', '米总，你的脸呢？'),
      say('mutsumi', '睦子米魔人', 'right', '问得好。（停顿）下一题。'),
      say('midori', '祓使 翠', 'left', '这不是问答环节。'),
      say('mutsumi', '睦子米魔人', 'right', '那正好，我也不想答。我们庭园最近在做活动——把脸交出来，送一张弹幕体验券。'),
      say('midori', '祓使 翠', 'left', '什么券？'),
      say('mutsumi', '睦子米魔人', 'right', '被一百万张脸追着跑的那种。很解压，跑完就和解了。'),
      say('midori', '祓使 翠', 'left', '我看是跑完就没命了。'),
      say('mutsumi', '睦子米魔人', 'right', '哎呀，您真幽默。要不要先办张年卡？今天办卡送一张「前男友的脸」。'),
      say('midori', '祓使 翠', 'left', '我没有前男友。'),
      say('mutsumi', '睦子米魔人', 'right', '那就送一张「未来前男友的脸」，提前准备。'),
      say('midori', '祓使 翠', 'left', '你是不是把所有人都当成潜在客户？'),
      say('mutsumi', '睦子米魔人', 'right', '不，我把所有人都当成潜在的脸。'),
      say('midori', '祓使 翠', 'left', '行。那我今天就把你这张脸——'),
      say('mutsumi', '睦子米魔人', 'right', '等等！您这张脸，是不是在哪儿见过？'),
      say('midori', '祓使 翠', 'left', '少套近乎。'),
      say('mutsumi', '睦子米魔人', 'right', '不是套近乎，是脸熟。我们会员系统里，好像有您的脸。'),
      say('midori', '祓使 翠', 'left', '……我今天是来祓除你的。'),
      say('mutsumi', '睦子米魔人', 'right', '祓除？那正好，我们缺一个「祓除体验官」，工资日结，结的是脸。'),
      say('mutsumi', '睦子米魔人', 'right', '（她摆了个很帅的姿势，披风挂在了自己的角上。）'),
      say('midori', '祓使 翠', 'left', '……需要帮忙吗？'),
      say('mutsumi', '睦子米魔人', 'right', '不用，这是造型。'),
      say('midori', '祓使 翠', 'left', '行，那我开始了。')
    ],
    epilogue: [
      say('mutsumi', '睦子米魔人', 'right', '……啊。我输了。脸也散了。'),
      say('midori', '祓使 翠', 'left', '结束了。把庭园里的脸都放回去。'),
      say('mutsumi', '睦子米魔人', 'right', '放回去可以，但您得先填一张《面部归还申请表》，再交二十块工本费。'),
      say('midori', '祓使 翠', 'left', '你都没了还想着收费？'),
      say('mutsumi', '睦子米魔人', 'right', '职业习惯。再说，万一您以后成了回头客呢？'),
      say('midori', '祓使 翠', 'left', '……不会。'),
      say('mutsumi', '睦子米魔人', 'right', '那我给您打个折，十八。'),
      say('midori', '祓使 翠', 'left', '……'),
      say('mutsumi', '睦子米魔人', 'right', '好吧，免费。反正我也要下班了。'),
      say('midori', '祓使 翠', 'left', '你还有下班？'),
      say('mutsumi', '睦子米魔人', 'right', '有。三百年一次，和霜见的转正同一天。'),
      say('cirno', '霜见', 'left', '（远处）米总，我的脸呢——？'),
      say('mutsumi', '睦子米魔人', 'right', '下次一定。'),
      say('midori', '祓使 翠', 'left', '……所以这算圆满结束吗？'),
      say('mutsumi', '睦子米魔人', 'right', '算吧。记得给个五星好评，评价写「脸很多，服务一般，老板很努力」。'),
      say('midori', '祓使 翠', 'left', '我会写「建议整改」。'),
      say('mutsumi', '睦子米魔人', 'right', '差评也行，记得带图。'),
      say('mutsumi', '？？？', 'right', '（碧雾散去。庭园深处传来一张脸幽幽的声音：「记得……关灯……」）'),
      say('midori', '祓使 翠', 'left', '……我到底祓除了个什么。')
    ],
    mutsumiLines: [
      '本阶段由「不存在的脸」独家赞助播出。',
      '请各位观众把脸调成飞行模式，谢谢配合。',
      '接下来是员工内购会，所有脸一律九块九。',
      '别怕，这些脸只是看起来像您的，实际上都办了保险。',
      '这一枪叫「碧落贯日」。名字很帅，效果很随机。',
      '最后一张脸，压轴出场——就是您这张！'
    ],
    shimomiLines: [
      '前台温馨提示：本场弹幕不支持退换。',
      '冰符「六花坠落」——掉下来的不是冰，是我想下班的决心。'
    ]
  };

  class Game {
    constructor() {
      this.ctx = ctx;
      this.state = 'title';
      this.t = 0;
      this.settings = G.loadJSON('sdm_settings_v1', { diff: 1, auto: true, muted: false });
      this.diffIndex = G.clamp(this.settings.diff | 0, 0, 3);
      this.best = G.loadJSON('sdm_best_v1', { score: 0 });
      this.titleMenu = 0;
      this.menuRects = [];
      this.titleBullets = [];
      this.freeze = false;
      this.god = params.get('god') === '1';
      this.touch = { enabled: false, active: false, focus: false, x: 0, y: 0, startX: 0, startY: 0, px: 0, py: 0 };

      G.Art.init();

      this.bullets = new G.BulletManager();
      this.effects = new G.Effects();
      this.items = [];
      this.stage = new G.Stage(this);
      this.score = 0;
      this.spellsCaptured = 0;
      this.itemsCollected = 0;
      this.deaths = 0;
      this.nextExtend = 5000000;
      this.boss = null;
      this.bossIsMid = false;
      this.player = new G.Player(this);
      this.introT = 0;
      this.cutIn = null;
      this.toast = null;
      this.hitstop = 0;
      this.flash = 0;
      this.shakeT = 0;
      this.shakeMag = 0;
      this.overlayT = 0;
      this.dialogue = null;
      this.resultT = 0;
      this.endMenu = 0;
      this.pauseMenu = 0;
      this.paused = false;
      this.newRecord = false;
      this.helpOpen = false;
      this.titleUI = document.getElementById('title-screen');
      this.helpUI = document.getElementById('help-screen');
      this.ui = {
        start: document.getElementById('btn-start'),
        diff: document.getElementById('btn-diff'),
        help: document.getElementById('btn-help'),
        auto: document.getElementById('btn-auto'),
        music: document.getElementById('btn-music'),
        helpClose: document.getElementById('btn-help-close'),
        helpOk: document.getElementById('btn-help-ok'),
        diffLabel: document.getElementById('diff-label'),
        autoLabel: document.getElementById('auto-label'),
        musicLabel: document.getElementById('music-label'),
        best: document.getElementById('best-score')
      };

      this.player.autoFire = this.settings.auto;
      this.bindGlobal();
      this.bindTitleUI();
      this.applyMute();
      this.updateTitleUI();
      this.showTitleUI();
      this.setupDebug();

      this.last = performance.now();
      this.acc = 0;
    }

    get diff() { return G.DIFFS[this.diffIndex]; }

    /* ------------------------------------------------------------------ */
    /*  setup                                                             */
    /* ------------------------------------------------------------------ */
    bindGlobal() {
      const wake = () => this.ensureAudio();
      addEventListener('pointerdown', wake, { once: true });
      addEventListener('keydown', wake, { once: true });

      addEventListener('keydown', (e) => {
        if (e.code === 'KeyM') this.toggleMute();
        if (e.code === 'KeyF') {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        }
      });
    }

    ensureAudio() {
      if (!G.Audio.ready) {
        G.Audio.init();
        this.applyMute();
        if (G.Audio.trackName !== 'title') G.Audio.music('title');
      } else if (G.Audio.ctx && G.Audio.ctx.state === 'suspended') {
        G.Audio.ctx.resume();
      }
    }

    bindTitleUI() {
      const ui = this.ui;
      if (!ui || !ui.start) return;
      ui.start.addEventListener('click', () => {
        this.ensureAudio();
        G.Audio.sfx('confirm');
        this.startRun();
      });
      ui.diff.addEventListener('click', () => {
        this.ensureAudio();
        this.diffIndex = (this.diffIndex + 1) % 4;
        this.saveSettings();
        this.updateTitleUI();
        G.Audio.sfx('select');
      });
      ui.auto.addEventListener('click', () => {
        this.ensureAudio();
        this.player.autoFire = !this.player.autoFire;
        this.saveSettings();
        this.updateTitleUI();
        G.Audio.sfx('select');
      });
      ui.music.addEventListener('click', () => {
        this.ensureAudio();
        this.toggleMute();
        this.updateTitleUI();
      });
      ui.help.addEventListener('click', () => {
        this.ensureAudio();
        this.showHelp(true);
        G.Audio.sfx('select');
      });
      if (ui.helpClose) ui.helpClose.addEventListener('click', () => this.showHelp(false));
      if (ui.helpOk) ui.helpOk.addEventListener('click', () => this.showHelp(false));
      this.helpUI.addEventListener('pointerdown', (e) => {
        if (e.target === this.helpUI) this.showHelp(false);
      });
      this.titleUI.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });
    }

    updateTitleUI() {
      const ui = this.ui;
      if (!ui || !ui.diffLabel) return;
      ui.diffLabel.textContent = this.diff.cn;
      ui.diffLabel.style.color = this.diff.color;
      ui.autoLabel.textContent = this.player.autoFire ? '开' : '关';
      ui.musicLabel.textContent = this.settings.muted ? '关' : '开';
      ui.best.textContent = G.fmt(this.best.score || 0);
    }

    showTitleUI() {
      if (!this.titleUI) return;
      this.titleUI.classList.remove('hidden');
      this.updateTitleUI();
    }

    hideTitleUI() {
      if (!this.titleUI) return;
      this.titleUI.classList.add('hidden');
      this.showHelp(false);
    }

    titleMenuVisible() {
      if (!this.titleUI) return false;
      if (this.titleUI.classList.contains('hidden')) return false;
      const cs = getComputedStyle(this.titleUI);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (parseFloat(cs.opacity || '1') < 0.05) return false;
      const r = this.titleUI.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
    }

    showHelp(open) {
      this.helpOpen = !!open;
      if (!this.helpUI) return;
      this.helpUI.classList.toggle('hidden', !open);
      if (open && this.ui && this.ui.helpClose) this.ui.helpClose.focus();
      else if (!open && this.ui && this.ui.start) this.ui.start.focus({ preventScroll: true });
    }

    applyMute() {
      G.Audio.setMuted(!!this.settings.muted);
    }

    toggleMute() {
      this.settings.muted = !this.settings.muted;
      G.Audio.setMuted(this.settings.muted);
      this.saveSettings();
      this.updateTitleUI();
      if (this.state === 'play') this.toastMsg(this.settings.muted ? '音乐 OFF' : '音乐 ON', '#cfe0ff', 70);
    }

    saveSettings() {
      this.settings.diff = this.diffIndex;
      this.settings.auto = this.player ? this.player.autoFire : this.settings.auto;
      G.saveJSON('sdm_settings_v1', this.settings);
    }

    setupDebug() {
      window.__game = this;
      this.debugStep = (n) => {
        for (let i = 0; i < (n || 1); i++) this.update();
        this.render();
      };
      const scene = params.get('scene');
      if (params.get('diff')) this.diffIndex = G.clamp(parseInt(params.get('diff'), 10) || 0, 0, 3);
      this.player.autoFire = this.settings.auto;
      this.updateTitleUI();
      this.showTitleBullets();
      if (scene && scene !== 'title') {
        if (scene === 'howto') {
          this.showHelp(true);
        } else {
          this.startRun();
          this.introT = 0;
          this.openingPending = false;
          if (scene === 'boss' || scene === 'spell') {
            this.stage.mode = 'boss';
            this.spawnBoss('mutsumi');
            if (scene === 'spell') {
              const idx = G.clamp(parseInt(params.get('phase') || '1', 10), 0, 5);
              this.boss.startPhase(idx);
            }
          } else if (scene === 'midboss') {
            this.spawnMidboss();
          } else if (scene === 'result') {
            this.finishGame();
          } else if (scene === 'gameover') {
            this.gameOver();
          } else if (scene === 'dialogue') {
            this.beginBossFight();
          }
        }
      }
      if (params.get('freeze') === '1') this.freeze = true;
    }

    /* ------------------------------------------------------------------ */
    /*  main loop                                                         */
    /* ------------------------------------------------------------------ */
    frame(now) {
      const dt = Math.min(100, now - this.last);
      this.last = now;
      if (!this.freeze) {
        this.acc += dt;
        let steps = 0;
        const stepMs = 1000 / 60;
        while (this.acc >= stepMs && steps < 4) {
          this.update();
          this.acc -= stepMs;
          steps++;
        }
        if (this.acc > 250) this.acc = 0;
      }
      this.render();
      G.Input.flush();
    }

    /* ------------------------------------------------------------------ */
    /*  update                                                            */
    /* ------------------------------------------------------------------ */
    update() {
      this.t++;
      G.Input.pollGamepad();
      if (this.helpOpen) {
        if (this.confirmPressed() || this.cancelPressed() || G.Input.consume('pause')) this.showHelp(false);
        this.updateTitleBullets();
        return;
      }
      if (this.state === 'play') {
        if (G.Input.consume('pause')) {
          this.state = 'paused';
          this.pauseMenu = 0;
          G.Audio.sfx('pause');
          return;
        }
      } else if (this.state === 'paused') {
        if (G.Input.consume('pause') || G.Input.consume('cancel')) {
          this.resume();
          return;
        }
      }

      switch (this.state) {
        case 'title': this.updateTitle(); break;
        case 'play': this.updatePlay(); break;
        case 'paused': this.updatePause(); break;
        case 'dialogue': this.updateDialogue(); break;
        case 'result': this.updateResult(); break;
        case 'gameover': this.updateGameOver(); break;
      }

      if (this.state === 'title') this.updateTitleBullets();
    }

    resume() {
      this.state = 'play';
      G.Audio.sfx('select');
    }

    /* ------------------------------------------------------------------ */
    /*  run lifecycle                                                     */
    /* ------------------------------------------------------------------ */
    startRun() {
      this.ensureAudio();
      this.hideTitleUI();
      this.saveBest();
      this.score = 0;
      this.spellsCaptured = 0;
      this.itemsCollected = 0;
      this.deaths = 0;
      this.nextExtend = 5000000;
      this.newRecord = false;
      this.bullets.reset();
      this.effects.reset();
      this.items.length = 0;
      this.stage = new G.Stage(this);
      this.boss = null;
      this.bossIsMid = false;
      this.touch.active = false;
      this.touch.focus = false;
      this.overlayT = 0;
      this.player = new G.Player(this);
      this.player.autoFire = this.settings.auto;
      this.introT = 165;
      this.openingPending = true;
      this.cutIn = null;
      this.bossLine = null;
      this.toast = null;
      this.hitstop = 0;
      this.flash = 0;
      this.shakeT = 0;
      this.overlayT = 0;
      this.dialogue = null;
      this.resultT = 0;
      this.t = 0;
      this.state = 'play';
      G.Audio.music('stage');
    }

    toTitle() {
      this.saveBest();
      this.state = 'title';
      this.titleMenu = 0;
      this.player.autoFire = this.settings.auto;
      this.bullets.reset();
      this.items.length = 0;
      this.boss = null;
      this.dialogue = null;
      this.bossLine = null;
      G.Audio.music('title');
      this.showTitleBullets();
      this.showTitleUI();
    }

    showTitleBullets() {
      this.titleBullets.length = 0;
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * TAU;
        const sp = 0.3 + Math.random() * 0.8;
        this.titleBullets.push({
          x: 490 + Math.cos(a) * (20 + Math.random() * 80),
          y: 130 + Math.sin(a) * (20 + Math.random() * 80),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: 2 + Math.random() * 3.5,
          color: [0, 1, 2, 3, 10][(Math.random() * 5) | 0],
          kind: Math.random() < 0.3 ? 'rice' : 'orb',
          rot: a, life: 400 + Math.random() * 600
        });
      }
    }

    updateTitleBullets() {
      if (this.state === 'title' && this.t % 42 === 0) {
        const a0 = Math.random() * TAU;
        const n = 12 + ((Math.random() * 8) | 0);
        const col = [0, 1, 2, 3, 10][(Math.random() * 5) | 0];
        for (let i = 0; i < n; i++) {
          const a = a0 + (i / n) * TAU;
          this.titleBullets.push({
            x: 490, y: 130,
            vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9,
            r: 2.6 + Math.random() * 2.6, color: col,
            kind: Math.random() < 0.25 ? 'knife' : 'orb',
            rot: a, life: 520
          });
        }
      }
      for (let i = this.titleBullets.length - 1; i >= 0; i--) {
        const b = this.titleBullets[i];
        b.x += b.vx; b.y += b.vy;
        b.life--;
        if (b.life <= 0 || b.x < -40 || b.x > CANVAS_W + 40 || b.y < -40 || b.y > CANVAS_H + 40) {
          this.titleBullets.splice(i, 1);
        }
      }
      if (this.titleBullets.length > 320) this.titleBullets.splice(0, this.titleBullets.length - 320);
    }

    /* ------------------------------------------------------------------ */
    /*  title / menus                                                     */
    /* ------------------------------------------------------------------ */
    updateTitle() {
      if (G.Input.pointer.justDown) {
        G.Input.pointer.justDown = false;
        this.ensureAudio();
        G.Audio.sfx('confirm');
        this.startRun();
        return;
      }
      if (this.helpOpen) {
        if (this.confirmPressed() || this.cancelPressed() || G.Input.consume('pause')) this.showHelp(false);
        return;
      }
      const left = G.Input.consume('left'), right = G.Input.consume('right');
      if (left || right) {
        this.diffIndex = (this.diffIndex + (right ? 1 : 3)) % 4;
        this.saveSettings();
        this.updateTitleUI();
        G.Audio.sfx('select');
      }
      if (G.Input.consume('mute')) this.toggleMute();
      if (this.confirmPressed()) {
        const ae = document.activeElement;
        if (ae && ae.tagName === 'BUTTON' && this.titleUI && this.titleUI.contains(ae) && ae.id !== 'btn-start') {
          ae.click();
          return;
        }
        this.ensureAudio();
        G.Audio.sfx('confirm');
        this.startRun();
      }
    }

    confirmPressed() {
      return G.Input.consume('confirm') || G.Input.consume('shoot');
    }

    cancelPressed() {
      return G.Input.consume('cancel') || G.Input.consume('bomb');
    }

    updatePause() {
      const items = 5;
      if (G.Input.consume('up')) { this.pauseMenu = (this.pauseMenu + items - 1) % items; G.Audio.sfx('select'); }
      if (G.Input.consume('down')) { this.pauseMenu = (this.pauseMenu + 1) % items; G.Audio.sfx('select'); }
      const left = G.Input.consume('left'), right = G.Input.consume('right');
      if (this.pauseMenu === 3 && (left || right)) { this.toggleMute(); }
      if (this.pauseMenu === 4 && (left || right)) {
        this.player.autoFire = !this.player.autoFire;
        this.saveSettings();
        G.Audio.sfx('select');
      }
      if (G.Input.pointer.justDown) {
        const p = G.Input.pointer;
        G.Input.pointer.justDown = false;
        for (let i = 0; i < items; i++) {
          const yy = 108 + 104 + i * 32;
          if (p.x > 170 && p.x < 470 && Math.abs(p.y - yy) < 17) {
            this.pauseMenu = i;
            this.activatePauseItem();
            return;
          }
        }
      }
      if (this.confirmPressed()) {
        G.Audio.sfx('confirm');
        this.activatePauseItem();
      }
    }

    activatePauseItem() {
      if (this.pauseMenu === 0) this.resume();
      else if (this.pauseMenu === 1) this.startRun();
      else if (this.pauseMenu === 2) this.toTitle();
      else if (this.pauseMenu === 3) this.toggleMute();
      else if (this.pauseMenu === 4) { this.player.autoFire = !this.player.autoFire; this.saveSettings(); }
    }

    updateResult() {
      this.resultT++;
      this.effects.update();
      if (this.resultT < 45) return;
      if (G.Input.consume('up') || G.Input.consume('down')) {
        this.endMenu = 1 - this.endMenu;
        G.Audio.sfx('select');
      }
      if (G.Input.pointer.justDown) {
        const p = G.Input.pointer;
        G.Input.pointer.justDown = false;
        if (p.y > 368 && p.y < 404) {
          if (p.x > 190 && p.x < 310) this.endMenu = 0;
          else if (p.x > 330 && p.x < 450) this.endMenu = 1;
          else { this.effects.update(); return; }
          G.Audio.sfx('confirm');
          this.activateEndItem();
          return;
        }
      }
      if (this.confirmPressed()) {
        G.Audio.sfx('confirm');
        this.activateEndItem();
      }
      if (G.Input.consume('restart')) this.startRun();
      this.effects.update();
    }

    activateEndItem() {
      if (this.endMenu === 0) this.startRun();
      else this.toTitle();
    }

    updateGameOver() {
      this.overlayT++;
      this.effects.update();
      if (this.overlayT < 36) return;
      if (G.Input.consume('up') || G.Input.consume('down')) {
        this.endMenu = 1 - this.endMenu;
        G.Audio.sfx('select');
      }
      if (G.Input.pointer.justDown) {
        const p = G.Input.pointer;
        G.Input.pointer.justDown = false;
        if (p.y > 284 && p.y < 320) {
          if (p.x > 190 && p.x < 310) this.endMenu = 0;
          else if (p.x > 330 && p.x < 450) this.endMenu = 1;
          else return;
          G.Audio.sfx('confirm');
          this.activateEndItem();
          return;
        }
      }
      if (this.confirmPressed()) {
        G.Audio.sfx('confirm');
        this.activateEndItem();
      }
      if (G.Input.consume('restart')) this.startRun();
    }

    updateDialogue() {
      const d = this.dialogue;
      if (!d) { this.state = 'play'; return; }
      if (G.Input.consume('pause') || G.Input.consume('cancel')) {
        this.endDialogue();
        return;
      }
      const line = d.lines[d.index];
      const advance = G.Input.consume('confirm') || G.Input.consume('shoot') || G.Input.pointer.justDown;
      if (advance) G.Input.pointer.justDown = false;
      if (d.chars < line.text.length) {
        d.chars += advance ? line.text.length : 1.1;
        if (d.chars > line.text.length) d.chars = line.text.length;
        if (advance) G.Audio.sfx('tick');
      } else if (advance) {
        d.index++;
        d.chars = 0;
        if (d.index >= d.lines.length) {
          this.endDialogue();
        } else {
          G.Audio.sfx('tick');
        }
      }
    }

    endDialogue() {
      const d = this.dialogue;
      if (!d) return;
      this.dialogue = null;
      this.state = 'play';
      if (d.onDone) d.onDone();
    }

    /* ------------------------------------------------------------------ */
    /*  gameplay update                                                   */
    /* ------------------------------------------------------------------ */
    updatePlay() {
      this.handleTouch();
      if (this.hitstop > 0) {
        this.hitstop--;
        this.effects.update();
        this.decayShake();
        if (this.flash > 0) this.flash -= 0.05;
        return;
      }
      if (this.toast) {
        this.toast.life--;
        if (this.toast.life <= 0) this.toast = null;
      }
      if (this.cutIn) {
        this.cutIn.t--;
        if (this.cutIn.t <= 0) this.cutIn = null;
      }
      if (this.bossLine) {
        this.bossLine.life--;
        if (this.bossLine.life <= 0) this.bossLine = null;
      }
      if (this.introT > 0) {
        this.introT--;
        if (this.introT === 0 && this.openingPending) {
          this.openingPending = false;
          this.startDialogue(STORY.opening);
          return;
        }
        this.stage.time = Math.max(0, this.stage.time);
      }
      this.decayShake();
      if (this.flash > 0) this.flash -= 0.06;

      // stage
      if (this.introT <= 0) this.stage.update();
      if (this.state !== 'play') return;

      // player
      this.player.update(G.Input, this);
      if (this.state !== 'play') return;

      // boss
      if (this.boss) {
        this.boss.update();
        if (this.boss && this.boss.finished) {
          // onBossDefeated should have handled cleanup
        }
      }
      if (this.state !== 'play') return;

      // bullets
      this.bullets.update(this.player);

      // items
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.update();
        if (it.dead) this.items.splice(i, 1);
      }

      this.collideShots();
      this.collidePlayer();
      this.effects.update();

      // death explosion trail on boss
      if (this.boss && this.boss.dead && this.boss.state === 'end' && this.t % 7 === 0) {
        this.effects.burst(this.boss.x + G.rand(-24, 24), this.boss.y + G.rand(-20, 20), G.choice(['#8fffd0', '#d8ffb0', '#2fd695']), 8, 3);
        this.shake(3, 6);
      }
    }

    decayShake() {
      if (this.shakeT > 0) {
        this.shakeT--;
        this.shakeMag *= 0.9;
      }
    }

    shake(mag, time) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeT = Math.max(this.shakeT, time);
    }

    addScore(v) {
      this.score += Math.round(v);
      if (this.score >= this.nextExtend && this.player) {
        this.nextExtend += 12000000;
        this.player.lives++;
        G.Audio.sfx('extend');
        this.toastMsg('EXTEND  1UP', '#8fffd0', 100);
        this.effects.burst(this.player.x, this.player.y, '#b9ffdd', 30, 4);
      }
    }

    addPower(v) {
      this.player.power = G.clamp(this.player.power + v, 0, 4);
    }

    collectAllItems() {
      for (const it of this.items) it.magnet = true;
    }

    clearBullets(convert) {
      let count = 0;
      this.bullets.clear((b) => {
        count++;
        if (count < 340) this.effects.spark(b.x, b.y, '#d9ffec', 1, 1.3, 1.4, 12);
        if (convert && count <= 22 && Math.random() < 0.55) {
          this.items.push(new G.Item(this, b.x, b.y, 'point'));
        }
      });
      if (convert) {
        this.effects.ring(this.player.x, this.player.y, 'rgba(150,255,210,0.8)', 10, 210, 3, 30);
      }
    }

    bombBlast() {
      this.clearBullets(true);
      if (this.boss && this.boss.state === 'fight') this.boss.damage(120);
      this.effects.ring(this.player.x, this.player.y, 'rgba(120,255,200,0.9)', 20, 260, 4, 36);
      this.effects.burst(this.player.x, this.player.y, '#9dffd0', 25, 5);
      this.shake(10, 18);
    }

    onBomb() {
      this.clearBullets(true);
      if (this.boss) {
        this.boss.notifyPlayerHit();
        if (this.boss.state === 'fight') this.boss.damage(100);
      }
      this.effects.ring(this.player.x, this.player.y, 'rgba(150,255,220,0.9)', 8, 190, 3, 28);
      this.effects.burst(this.player.x, this.player.y, '#cfeaff', 30, 4.5);
      this.flash = 0.7;
      this.shake(14, 26);
      G.Audio.sfx('bomb');
    }

    onPlayerDeath() {
      this.deaths++;
      this.clearBullets(true);
      if (this.boss) this.boss.notifyPlayerHit();
      this.effects.burst(this.player.x, this.player.y, '#b9ffdd', 40, 5);
      this.effects.ring(this.player.x, this.player.y, 'rgba(150,255,210,0.9)', 4, 120, 3, 34);
      for (let i = 0; i < 3; i++) {
        this.items.push(new G.Item(this, this.player.x + G.rand(-12, 12), this.player.y + G.rand(-10, 10), 'power'));
      }
      this.flash = 0.85;
      this.shake(16, 30);
      this.hitstop = 16;
      G.Audio.sfx('die');
    }

    gameOver() {
      this.state = 'gameover';
      this.endMenu = 0;
      this.overlayT = 0;
      this.cutIn = null;
      this.toast = null;
      this.bossLine = null;
      this.saveBest();
      this.clearBullets(false);
      G.Audio.stopMusic();
      G.Audio.music('result');
    }

    finishGame() {
      if (this.state === 'result') return;
      this.clearBullets(false);
      this.bonus = 1000000 + Math.max(0, this.player.lives) * 250000 + this.player.bombs * 100000;
      this.addScore(this.bonus);
      this.spellBonusTotal = this.spellsCaptured * 0;
      this.saveBest();
      this.state = 'result';
      this.resultT = 0;
      this.endMenu = 0;
      this.cutIn = null;
      this.toast = null;
      this.bossLine = null;
      this.effects.update();
      G.Audio.stopMusic();
      G.Audio.music('result');
      G.Audio.sfx('capture');
    }

    saveBest() {
      if (this.score > (this.best.score || 0)) {
        this.best.score = this.score;
        this.newRecord = true;
        G.saveJSON('sdm_best_v1', this.best);
      }
    }

    getPlayerTarget() {
      if (this.boss && !this.boss.finished) return this.boss;
      let best = null, bd = 1e9;
      const list = this.stage ? this.stage.enemyList : [];
      for (const e of list) {
        if (e.dead || e.gone) continue;
        const d = G.dist(this.player.x, this.player.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    }

    sparkAt(x, y, color, n) {
      this.effects.spark(x, y, color, n || 1, 1.8, 1.6, 12);
    }

    toastMsg(text, color, life) {
      this.toast = { text, color: color || '#d9ffec', life: life || 90, max: life || 90 };
    }

    /* ------------------------------------------------------------------ */
    /*  collisions                                                        */
    /* ------------------------------------------------------------------ */
    collideShots() {
      const shots = this.player.shots;
      if (!shots.length) return;
      const boss = this.boss;
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        let hit = false;
        if (boss && !boss.finished && boss.state === 'fight') {
          const dx = s.x - boss.x, dy = s.y - (boss.y - 4);
          if (dx * dx + dy * dy < 26 * 26) {
            boss.damage(s.dmg);
            hit = true;
          }
        }
        if (!hit) {
          const list = this.stage.enemyList;
          for (const e of list) {
            if (e.dead || e.gone) continue;
            const dx = s.x - e.x, dy = s.y - e.y;
            const r = e.r + 5;
            if (dx * dx + dy * dy < r * r) {
              e.hit(s.dmg);
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          this.effects.spark(s.x, s.y, '#eafff2', 2, 1.8, 1.6, 10);
          shots.splice(i, 1);
        }
      }
    }

    collidePlayer() {
      const p = this.player;
      if (p.dead) return;
      const px = p.x, py = p.y, pr = p.hitR;
      let hit = false;
      this.bullets.forEach((b) => {
        if (hit) return;
        if (b.kind === 'laser') {
          if (b.warn > 0) return;
          const ex = b.x + Math.cos(b.ang) * b.len;
          const ey = b.y + Math.sin(b.ang) * b.len;
          const d = G.pointSegDist(px, py, b.x, b.y, ex, ey);
          if (!b.grazed && d < b.width + 26) {
            b.grazed = true;
            this.grazeGain(b);
          }
          if (d < b.width * 0.42 + pr) {
            if (this.god) return;
            if (p.hit(this)) hit = true;
          }
        } else {
          const dx = px - b.x, dy = py - b.y;
          const d2 = dx * dx + dy * dy;
          const grazeR = b.r + 20;
          if (!b.grazed && d2 < grazeR * grazeR) {
            b.grazed = true;
            this.grazeGain(b);
          }
          const cr = b.cr + pr;
          if (d2 < cr * cr) {
            if (this.god) return;
            if (p.hit(this)) hit = true;
          }
        }
      });
    }

    grazeGain(b) {
      this.player.graze++;
      this.addScore(120);
      if (this.player.graze % 2 === 0) {
        this.effects.spark(b.x, b.y, 'rgba(210,255,220,0.9)', 2, 1.2, 1.3, 14);
      }
      if (!this._lastGraze || performance.now() - this._lastGraze > 50) {
        G.Audio.sfx('graze');
        this._lastGraze = performance.now();
      }
      b.grazed = true;
    }

    /* ------------------------------------------------------------------ */
    /*  boss orchestration                                                */
    /* ------------------------------------------------------------------ */
    clearEnemies() {
      if (!this.stage) return;
      for (const e of this.stage.enemyList) {
        this.effects.burst(e.x, e.y, G.COLORS[e.color % G.COLORS.length].mid, 10, 2.4);
      }
      this.stage.enemyList.length = 0;
    }

    beginMidbossFight() {
      this.stage.mode = 'midboss';
      this.clearBullets(false);
      this.clearEnemies();
      this.player.shots.length = 0;
      this.startDialogue(STORY.midBefore, () => this.spawnMidboss());
    }

    spawnMidboss() {
      this.clearBullets(false);
      this.clearEnemies();
      this.player.shots.length = 0;
      this.boss = new G.Boss(this, G.BOSS_CONFIG.cirno);
      this.bossIsMid = true;
      this.boss.begin();
      this.stage.mode = 'midboss';
      G.Audio.music('boss');
      this.toastMsg('MIDBOSS  霜见', '#b8ffe0', 120);
      this.flash = 0.3;
    }

    spawnBoss(which) {
      this.boss = new G.Boss(this, G.BOSS_CONFIG[which]);
      this.bossIsMid = false;
      this.boss.begin();
      G.Audio.music('boss');
      this.flash = 0.5;
      this.shake(4, 16);
    }

    beginBossFight() {
      this.stage.mode = 'boss';
      this.clearBullets(false);
      this.clearEnemies();
      this.player.shots.length = 0;
      G.Audio.music('boss');
      this.startDialogue(STORY.bossBefore, () => {
        this.spawnBoss('remilia');
      });
    }

    startDialogue(lines, onDone) {
      this.dialogue = { lines, index: 0, chars: 0, onDone };
      this.state = 'dialogue';
      G.Audio.sfx('spell');
    }

    onPhaseStart(phase, boss) {
      if (phase.type === 'spell') {
        this.cutIn = { name: phase.name, sub: boss.which, t: 96, max: 96 };
        G.Audio.sfx('spell');
        this.shake(5, 14);
      } else {
        this.toastMsg(phase.name, '#c8ffe4', 60);
      }
      const lines = boss.isMid ? STORY.shimomiLines : STORY.mutsumiLines;
      const line = lines[boss.phaseIndex];
      this.bossLine = line ? { text: '「' + line + '」', life: 240, max: 240 } : null;
    }

    onPhaseEnd(phase, info) {
      if (info.timeout) {
        this.toastMsg('TIME UP', '#9fc8ff', 90);
      }
    }

    onCapture(phase, bonus) {
      this.toastMsg('BARRAGE BONUS  +' + G.fmt(bonus), '#d8ffb0', 110);
      G.Audio.sfx('capture');
      this.effects.ring(this.boss ? this.boss.x : 320, this.boss ? this.boss.y : 120, 'rgba(200,255,160,0.9)', 10, 90, 2, 30);
      this.flash = 0.35;
      this.addScore(25000);
    }

    onTimeout(phase) {
      this.clearBullets(false);
      G.Audio.sfx('timeout');
    }

    onBossDying(boss) {
      this.flash = 0.75;
      this.shake(14, 40);
      this.effects.burst(boss.x, boss.y, '#9dffd0', 60, 5.5);
      this.effects.ring(boss.x, boss.y, 'rgba(120,255,200,0.9)', 6, 180, 4, 40);
      this.player.invuln = Math.max(this.player.invuln, 240);
    }

    onBossDefeated(boss) {
      if (!boss) return;
      if (boss.isMid) {
        this.boss = null;
        this.bossIsMid = false;
        this.addScore(80000);
        for (let i = 0; i < 8; i++) this.items.push(new G.Item(this, boss.x + G.rand(-30, 30), boss.y + G.rand(-20, 20), 'point'));
        this.items.push(new G.Item(this, boss.x, boss.y, 'bigpower'));
        this.items.push(new G.Item(this, boss.x, boss.y - 10, 'bomb'));
        G.Audio.music('stage');
        this.toastMsg('MIDBOSS CLEAR  +80,000', '#d8ffb0', 110);
        this.flash = 0.45;
        this.stage.mode = 'midboss';
        this.startDialogue(STORY.midAfter, () => {
          this.stage.onMidbossDefeated();
        });
      } else {
        this.boss = null;
        this.clearBullets(false);
        this.player.invuln = Math.max(this.player.invuln, 240);
        this.startDialogue(STORY.epilogue, () => this.finishGame());
      }
    }

    spawnBossItems(x, y, n) {
      for (let i = 0; i < n; i++) {
        this.items.push(new G.Item(this, x + G.rand(-40, 40), y + G.rand(-18, 18), 'point'));
      }
      if (n >= 12) this.items.push(new G.Item(this, x, y, 'bigpower'));
    }

    /* ------------------------------------------------------------------ */
    /*  rendering                                                         */
    /* ------------------------------------------------------------------ */
    render() {
      const c = this.ctx;
      c.setTransform(2, 0, 0, 2, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#03100a';
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (this.state === 'title') {
        this.drawTitleBackdrop();
        return;
      }

      this.drawPlayfield();
      if (this.state !== 'result' && this.state !== 'gameover') {
        this.drawHUD();
        this.drawBossBar();
      }
      this.drawGameOverlays();

      if (this.state === 'paused') this.drawPause();
      if (this.state === 'result') this.drawResult();
      if (this.state === 'gameover') this.drawGameOver();
      if (this.state === 'dialogue') this.drawDialogue();
    }

    drawTitleBackdrop() {
      const c = this.ctx, t = this.t;
      const g = c.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#03100b');
      g.addColorStop(0.45, '#071c13');
      g.addColorStop(0.8, '#0a271a');
      g.addColorStop(1, '#020a07');
      c.fillStyle = g;
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const rnd = G.RNG(987654);
      c.fillStyle = 'rgba(210,255,232,0.55)';
      for (let i = 0; i < 110; i++) {
        const sx = rnd() * CANVAS_W, sy = rnd() * 280;
        c.globalAlpha = 0.10 + rnd() * 0.5;
        c.fillRect(sx, sy, 1, 1);
      }
      c.globalAlpha = 1;

      const mx = 486, my = 142, mr = 112;
      const halo = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 2.8);
      halo.addColorStop(0, 'rgba(92,240,184,0.20)');
      halo.addColorStop(0.45, 'rgba(40,160,110,0.08)');
      halo.addColorStop(1, 'rgba(10,60,40,0)');
      c.fillStyle = halo;
      c.fillRect(mx - mr * 2.9, my - mr * 2.9, mr * 5.8, mr * 5.8);
      const mg = c.createRadialGradient(mx - 36, my - 42, 8, mx, my, mr);
      mg.addColorStop(0, '#f2fff7');
      mg.addColorStop(0.45, '#c8f5da');
      mg.addColorStop(0.82, '#7fcf9f');
      mg.addColorStop(1, '#317a58');
      c.fillStyle = mg;
      c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(20,90,60,0.18)';
      for (const [cx, cy, cr] of [[-0.3, -0.2, 0.2], [0.35, 0.1, 0.12], [-0.05, 0.5, 0.1], [0.2, -0.45, 0.07]]) {
        c.beginPath(); c.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU); c.fill();
      }

      c.fillStyle = '#020b07';
      c.fillRect(0, 360, CANVAS_W, 120);
      c.fillStyle = '#05140d';
      for (const [bx, bw, bh] of [[40, 90, 60], [150, 130, 78], [300, 100, 54], [420, 150, 88], [590, 60, 44]]) {
        c.fillRect(bx, 360 - bh, bw, bh);
        c.beginPath();
        c.moveTo(bx - 12, 360 - bh);
        c.lineTo(bx + bw / 2, 360 - bh - 30);
        c.lineTo(bx + bw + 12, 360 - bh);
        c.closePath(); c.fill();
      }
      for (let i = 0; i < 20; i++) {
        const wx = 50 + (i * 29) % 540;
        const wy = 320 + ((i * 13) % 5) * 8;
        c.fillStyle = `rgba(140,255,200,${0.10 + (i % 3) * 0.10})`;
        c.fillRect(wx, wy, 3, 6);
      }
      for (let i = 0; i < 6; i++) {
        const y = 300 + i * 28 + Math.sin(t * 0.003 + i) * 6;
        const off = ((t * (0.15 + i * 0.03)) % (CANVAS_W + 300)) - 150;
        const fg = c.createLinearGradient(off - 220, y, off + 220, y);
        fg.addColorStop(0, 'rgba(50,170,120,0)');
        fg.addColorStop(0.5, `rgba(50,170,120,${0.06 + i * 0.01})`);
        fg.addColorStop(1, 'rgba(50,170,120,0)');
        c.fillStyle = fg;
        c.beginPath(); c.ellipse(off, y, 230, 24, 0, 0, TAU); c.fill();
      }

      c.save();
      c.globalAlpha = 0.68;
      c.globalCompositeOperation = 'lighter';
      for (const b of this.titleBullets) G.Art.drawBullet(c, b);
      c.restore();

      const vg = c.createRadialGradient(320, 220, 160, 320, 220, 470);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = vg;
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Always draw a playable canvas fallback. When the HTML menu is visible it covers this.
      G.Art.text(c, '睦子米魔人', 320, 148, 44, '#eafff2', 'center', G.Art.SANS, '800');
      G.Art.text(c, 'MUTSUMI MAJIN', 320, 188, 10, 'rgba(150,220,190,0.7)', 'center', G.Art.SANS, '600');
      G.Art.glowText(c, '点击画面 / ENTER 开始', 320, 250, 15, '#5cf0b8', 'rgba(60,240,170,0.6)', 'center', G.Art.SANS);
      G.Art.text(c, '如果菜单没有显示，直接点这里开始', 320, 278, 9, 'rgba(160,220,190,0.55)', 'center', G.Art.SANS);
    }

    drawPlayfield() {
      const c = this.ctx;
      const t = this.t;
      c.save();
      if (this.shakeT > 0) {
        const m = this.shakeMag;
        c.translate(G.rand(-m, m), G.rand(-m, m));
      }
      G.Art.drawBackground(c, t, !!this.boss && !this.boss.isMid, 'stage');

      c.save();
      c.beginPath();
      c.rect(PF.x, PF.y, PF.w, PF.h);
      c.clip();

      for (const it of this.items) it.draw(c, t);
      if (this.stage) this.stage.draw(c, t);
      if (this.boss) this.boss.draw(c, t);
      this.bullets.draw(c, t);
      this.player.draw(c, t);
      this.effects.draw(c);

      // hit flash
      if (this.flash > 0) {
        c.fillStyle = `rgba(220,255,235,${G.clamp(this.flash, 0, 1) * 0.6})`;
        c.fillRect(PF.x, PF.y, PF.w, PF.h);
      }
      c.restore();
      c.restore();
    }

    renderPanel() {
      G.Art.panelFrame(this.ctx);
    }

    drawHUD() {
      this.renderPanel();
      const c = this.ctx, p = this.player;
      const bx = 444, rx = 610;
      const t = this.t;
      const LABEL = 'rgba(150,205,178,0.72)';
      const VALUE = '#e9fff4';
      const ACCENT = '#5cf0b8';
      const MUTED = 'rgba(160,200,180,0.55)';

      // header with avatar
      const img = G.Art.getImage();
      if (G.Art.isImageReady() && img) {
        c.save();
        c.beginPath(); c.arc(446, 38, 16, 0, TAU); c.clip();
        c.drawImage(img, 0, 0, img.width, img.height, 430, 22, 32, 32);
        c.restore();
        c.strokeStyle = 'rgba(92,240,184,0.5)';
        c.lineWidth = 1.2;
        c.beginPath(); c.arc(446, 38, 16, 0, TAU); c.stroke();
      } else {
        c.fillStyle = 'rgba(92,240,184,0.16)';
        c.beginPath(); c.arc(446, 38, 16, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(92,240,184,0.4)';
        c.stroke();
      }
      G.Art.text(c, '睦子米魔人', 470, 33, 13, VALUE, 'left', G.Art.SANS, '700');
      G.Art.text(c, 'M U T S U M I   M A J I N', 470, 48, 5.6, 'rgba(160,220,190,0.55)', 'left', G.Art.SANS, '600');
      c.strokeStyle = 'rgba(92,240,184,0.16)';
      c.beginPath(); c.moveTo(bx, 64); c.lineTo(rx, 64); c.stroke();

      // score
      G.Art.text(c, 'SCORE', bx, 82, 7.5, LABEL, 'left', G.Art.SANS, '600');
      G.Art.text(c, G.fmt(this.score), rx, 97, 23, VALUE, 'right', G.Art.SANS, '700');
      G.Art.text(c, 'BEST  ' + G.fmt(this.best.score || 0), rx, 115, 8, MUTED, 'right', G.Art.SANS);
      c.strokeStyle = 'rgba(92,240,184,0.12)';
      c.beginPath(); c.moveTo(bx, 126); c.lineTo(rx, 126); c.stroke();

      // lives / bombs
      G.Art.text(c, 'LIFE', bx, 141, 7.5, LABEL, 'left', G.Art.SANS, '600');
      const lives = G.clamp(p.lives, 0, 6);
      for (let i = 0; i < 6; i++) {
        G.Art.lifeIcon(c, 512 + i * 14, 140, i < lives, 1.0);
      }
      G.Art.text(c, String(Math.max(0, p.lives)), rx, 140, 10, VALUE, 'right', G.Art.SANS, '700');

      G.Art.text(c, 'BOMB', bx, 162, 7.5, LABEL, 'left', G.Art.SANS, '600');
      for (let i = 0; i < 6; i++) {
        G.Art.bombIcon(c, 512 + i * 14, 161, i < p.bombs, 1.05);
      }
      G.Art.text(c, String(p.bombs), rx, 161, 10, VALUE, 'right', G.Art.SANS, '700');

      // power
      G.Art.text(c, 'POWER', bx, 186, 7.5, LABEL, 'left', G.Art.SANS, '600');
      G.Art.text(c, p.power.toFixed(2) + ' / 4.00', rx, 186, 9, p.power >= 4 ? ACCENT : VALUE, 'right', G.Art.SANS);
      G.Art.powerBar(c, bx, 195, rx - bx, p.power, 4);

      // graze
      G.Art.text(c, 'GRAZE', bx, 220, 7.5, LABEL, 'left', G.Art.SANS, '600');
      G.Art.text(c, String(p.graze), rx, 219, 15, '#c8ffe4', 'right', G.Art.SANS, '700');

      c.strokeStyle = 'rgba(92,240,184,0.12)';
      c.beginPath(); c.moveTo(bx, 232); c.lineTo(rx, 232); c.stroke();

      // boss info / spell bonus
      const b = this.boss;
      if (b && !b.finished) {
        G.Art.text(c, 'BOSS', bx, 248, 7.5, LABEL, 'left', G.Art.SANS, '600');
        G.Art.text(c, b.name, rx, 248, 10, VALUE, 'right', G.Art.SANS, '700');
        for (let i = 0; i < b.phases.length; i++) {
          const current = i === b.phaseIndex;
          const done = i < b.phaseIndex;
          c.save();
          c.translate(452 + i * 10, 264);
          c.rotate(Math.PI / 4);
          if (current) {
            c.fillStyle = ACCENT;
            c.shadowColor = 'rgba(92,240,184,0.9)';
            c.shadowBlur = 6;
          } else if (done) {
            c.fillStyle = 'rgba(70,120,95,0.5)';
          } else {
            c.fillStyle = 'rgba(210,255,232,0.45)';
          }
          c.fillRect(-2.4, -2.4, 4.8, 4.8);
          c.restore();
        }
        G.Art.text(c, 'PHASE ' + G.pad(b.phaseIndex + 1) + ' / ' + G.pad(b.phases.length), rx, 264, 7.5, MUTED, 'right', G.Art.SANS);

        if (b.phase && b.phase.type === 'spell') {
          G.Art.text(c, 'PATTERN BONUS', bx, 286, 7.5, LABEL, 'left', G.Art.SANS, '600');
          G.Art.text(c, G.fmt(b.spellBonus), rx, 302, 17, b.phasePerfect ? '#d8ffb0' : 'rgba(180,210,190,0.4)', 'right', G.Art.SANS, '700');
          G.Art.text(c, b.captured ? 'CAPTURED' : (b.phasePerfect ? 'NO MISS' : 'FAILED'), bx, 302, 7.5, b.phasePerfect ? ACCENT : 'rgba(200,150,150,0.55)', 'left', G.Art.SANS, '600');
          const pct = b.maxTime > 0 ? G.clamp(b.timeLeft / b.maxTime, 0, 1) : 0;
          c.fillStyle = 'rgba(255,255,255,0.07)';
          c.fillRect(bx, 312, rx - bx, 3);
          c.fillStyle = b.phasePerfect ? 'rgba(92,240,184,0.85)' : 'rgba(180,140,140,0.5)';
          c.fillRect(bx, 312, (rx - bx) * pct, 3);
        } else if (b.phase) {
          G.Art.text(c, 'NON-BARRAGE', bx, 286, 7.5, MUTED, 'left', G.Art.SANS);
          G.Art.text(c, b.phase.name, rx, 289, 10, 'rgba(215,255,235,0.85)', 'right', G.Art.SANS, '600');
        }
      } else {
        G.Art.text(c, 'AREA', bx, 250, 7.5, LABEL, 'left', G.Art.SANS, '600');
        G.Art.text(c, this.stage && this.stage.mode === 'boss' ? 'FINAL' : '01', rx, 250, 10, VALUE, 'right', G.Art.SANS);
        G.Art.text(c, 'BGM', bx, 276, 7.5, MUTED, 'left', G.Art.SANS);
        G.Art.text(c, BGM_NAMES[G.Audio.trackName] || '—', rx, 288, 8, 'rgba(180,225,200,0.6)', 'right', G.Art.SANS);
      }

      // difficulty pill
      const dy = 336;
      c.fillStyle = 'rgba(92,240,184,0.06)';
      c.beginPath(); c.roundRect(bx, dy - 11, rx - bx, 22, 11); c.fill();
      c.strokeStyle = 'rgba(92,240,184,0.18)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = this.diff.color;
      c.beginPath(); c.arc(bx + 13, dy, 3.2, 0, TAU); c.fill();
      G.Art.text(c, this.diff.name.toUpperCase(), bx + 24, dy, 8.5, this.diff.color, 'left', G.Art.SANS, '700');
      G.Art.text(c, this.diff.cn, rx - 10, dy, 8.5, 'rgba(180,225,200,0.65)', 'right', G.Art.SANS);

      // controls
      c.strokeStyle = 'rgba(92,240,184,0.10)';
      c.beginPath(); c.moveTo(bx, 358); c.lineTo(rx, 358); c.stroke();
      if (!this.touch.enabled) {
        G.Art.text(c, 'Z 射击　X 祓符', bx, 376, 9, 'rgba(180,225,200,0.62)', 'left', G.Art.SANS);
        G.Art.text(c, 'SHIFT 低速　ESC 暂停', bx, 393, 9, 'rgba(180,225,200,0.62)', 'left', G.Art.SANS);
        G.Art.text(c, this.player.autoFire ? 'AUTO FIRE  ON' : 'AUTO FIRE  OFF', bx, 411, 7.5, this.player.autoFire ? 'rgba(92,240,184,0.55)' : 'rgba(190,140,140,0.5)', 'left', G.Art.SANS, '600');
      }

      if (this.touch.enabled) this.drawTouchButtons(c);
    }

    drawTouchButtons(c) {
      const p = this.player;
      const fx = 462, fy = 420, bx = 530, by = 420, px = 598, py = 420;
      c.save();
      // focus
      c.fillStyle = this.touch.focus ? 'rgba(92,240,184,0.26)' : 'rgba(8,32,22,0.55)';
      c.beginPath(); c.arc(fx, fy, 21, 0, TAU); c.fill();
      c.strokeStyle = this.touch.focus ? 'rgba(92,240,184,0.85)' : 'rgba(110,190,155,0.4)';
      c.stroke();
      G.Art.text(c, '低速', fx, fy, 10, this.touch.focus ? '#d9ffec' : 'rgba(200,240,220,0.7)', 'center', G.Art.SANS, '600');
      // bomb
      c.fillStyle = 'rgba(8,42,30,0.55)';
      c.beginPath(); c.arc(bx, by, 21, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(92,240,184,0.55)';
      c.stroke();
      G.Art.text(c, '祓符', bx, by, 10, 'rgba(210,255,235,0.9)', 'center', G.Art.SANS, '600');
      G.Art.text(c, String(p.bombs), bx + 15, by - 14, 9, 'rgba(210,255,235,0.9)', 'center', G.Art.SANS);
      // pause
      c.fillStyle = 'rgba(8,30,22,0.5)';
      c.beginPath(); c.arc(px, py, 20, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(120,200,165,0.45)';
      c.stroke();
      c.fillStyle = 'rgba(210,255,235,0.85)';
      c.fillRect(px - 6, py - 7, 3.5, 14);
      c.fillRect(px + 2.5, py - 7, 3.5, 14);
      c.restore();
    }

    drawBossBar() {
      const b = this.boss;
      if (!b || b.finished) return;
      const c = this.ctx;
      const x = PF.x + 18, w = PF.w - 36, y = PF.y + 12;
      const col = G.COLORS[(b.phase ? b.phase.color : 0) % G.COLORS.length];
      c.save();
      // name
      c.font = '700 10px ' + G.Art.SANS;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(233,255,245,0.92)';
      c.shadowColor = 'rgba(0,0,0,0.9)';
      c.shadowBlur = 3;
      c.fillText(b.name, x, y);
      // timer
      const sec = Math.ceil(Math.max(0, b.timeLeft) / 60);
      c.textAlign = 'right';
      c.font = 'bold 12px ' + G.Art.SANS;
      c.fillStyle = sec <= 10 ? '#d8ff78' : 'rgba(190,255,225,0.9)';
      c.fillText(G.pad(sec), x + w, y);
      c.shadowBlur = 0;
      // bar back
      c.fillStyle = 'rgba(2,16,10,0.7)';
      c.fillRect(x, y + 9, w, 7);
      c.strokeStyle = 'rgba(92,240,184,0.3)';
      c.lineWidth = 0.8;
      c.strokeRect(x - 0.5, y + 8.5, w + 1, 8);
      // bar fill
      const ratio = G.clamp(b.hp / b.maxHp, 0, 1);
      const g = c.createLinearGradient(x, y + 9, x + w, y + 9);
      g.addColorStop(0, col.mid);
      g.addColorStop(0.55, col.glow);
      g.addColorStop(1, '#eafff2');
      c.fillStyle = g;
      c.fillRect(x, y + 9, w * ratio, 7);
      // shine
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(x, y + 9, w * ratio, 2);
      // phase pips
      const total = b.phases.length;
      for (let i = 0; i < total; i++) {
        const px = x + 4 + i * 9;
        c.save();
        c.translate(px, y + 23);
        c.rotate(Math.PI / 4);
        if (i < b.phaseIndex) c.fillStyle = 'rgba(60,100,80,0.5)';
        else if (i === b.phaseIndex) {
          c.fillStyle = '#5cf0b8';
          c.shadowColor = 'rgba(92,240,184,0.9)';
          c.shadowBlur = 5;
        } else c.fillStyle = 'rgba(210,255,235,0.6)';
        c.fillRect(-2, -2, 4, 4);
        c.restore();
      }
      c.restore();
    }

    drawGameOverlays() {
      const c = this.ctx;
      if (this.introT > 0) this.drawStageIntro();
      if (this.bossLine) {
        const bl = this.bossLine;
        const a = G.clamp(Math.min(bl.life / 30, (bl.max - bl.life) / 12), 0, 1);
        const bw = PF.w - 76, bx = PF.x + 38, by = PF.y + 58, bh = 22;
        c.save();
        c.globalAlpha = a;
        c.beginPath(); c.roundRect(bx, by, bw, bh, 11);
        c.fillStyle = 'rgba(2,18,11,0.68)';
        c.fill();
        c.strokeStyle = 'rgba(92,240,184,0.25)';
        c.lineWidth = 1;
        c.stroke();
        c.save();
        c.font = '600 10px ' + G.Art.SANS;
        const tw = c.measureText(bl.text).width;
        c.restore();
        const fs = tw > bw - 18 ? Math.max(7.5, 10 * (bw - 18) / tw) : 10;
        G.Art.text(c, bl.text, bx + bw / 2, by + bh / 2 + 0.5, fs, 'rgba(215,255,235,0.92)', 'center', G.Art.SANS, '600');
        c.restore();
      }
      if (this.toast) {
        const a = G.clamp(Math.min(this.toast.life / 20, (this.toast.max - this.toast.life) / 8), 0, 1);
        c.save();
        c.globalAlpha = a;
        G.Art.text(c, this.toast.text, PF.x + PF.w / 2, PF.y + 228, 12, this.toast.color, 'center', G.Art.SANS, '600');
        c.restore();
      }
      if (this.cutIn) {
        const prog = 1 - this.cutIn.t / this.cutIn.max;
        G.Art.drawCutIn(c, this.t, prog, this.cutIn.name, this.cutIn.sub);
      }
    }

    drawStageIntro() {
      const c = this.ctx;
      const p = 1 - this.introT / 165;
      let a = 1;
      if (this.introT > 130) a = (165 - this.introT) / 35;
      else if (this.introT < 40) a = this.introT / 40;
      a = G.clamp(a, 0, 1);
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(2,12,8,0.35)';
      c.fillRect(PF.x, PF.y, PF.w, PF.h);
      c.strokeStyle = 'rgba(92,240,184,0.45)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(PF.x + 40, PF.y + 204); c.lineTo(PF.x + PF.w - 40, PF.y + 204);
      c.moveTo(PF.x + 40, PF.y + 262); c.lineTo(PF.x + PF.w - 40, PF.y + 262);
      c.stroke();
      G.Art.glowText(c, 'AREA  01', PF.x + PF.w / 2, PF.y + 224, 34, '#f0fff8', 'rgba(60,240,170,0.75)', 'center', G.Art.SANS);
      G.Art.text(c, '碧雾庭园 · 绿月之下', PF.x + PF.w / 2, PF.y + 248, 13, 'rgba(205,245,225,0.85)', 'center', G.Art.SANS);
      c.restore();
    }

    drawPause() {
      const c = this.ctx;
      c.fillStyle = 'rgba(1,9,6,0.7)';
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);
      const x = 170, y = 108, w = 300, h = 278, r = 16;
      c.beginPath(); c.roundRect(x, y, w, h, r);
      const bg = c.createLinearGradient(x, y, x, y + h);
      bg.addColorStop(0, 'rgba(9,38,26,0.97)');
      bg.addColorStop(1, 'rgba(3,18,11,0.98)');
      c.fillStyle = bg;
      c.fill();
      c.strokeStyle = 'rgba(92,240,184,0.35)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = 'rgba(92,240,184,0.7)';
      c.fillRect(x + 34, y + 12, w - 68, 1);
      G.Art.glowText(c, 'PAUSED', 320, y + 44, 27, '#eafff2', 'rgba(60,240,170,0.5)', 'center', G.Art.SANS);
      G.Art.text(c, '— 暂停 —', 320, y + 66, 9, 'rgba(160,210,185,0.55)', 'center', G.Art.SANS);

      const items = [
        '继续游戏',
        '重新开始',
        '返回标题',
        '音乐  ' + (this.settings.muted ? 'OFF' : 'ON'),
        '自动射击  ' + (this.player.autoFire ? 'ON' : 'OFF')
      ];
      for (let i = 0; i < items.length; i++) {
        const yy = y + 104 + i * 32;
        const sel = i === this.pauseMenu;
        if (sel) {
          c.fillStyle = 'rgba(92,240,184,0.12)';
          c.beginPath(); c.roundRect(x + 30, yy - 13, w - 60, 26, 8); c.fill();
          c.fillStyle = '#5cf0b8';
          c.fillRect(x + 30, yy - 8, 2.5, 16);
        }
        G.Art.text(c, items[i], 320, yy, sel ? 14 : 12.5, sel ? '#eafff2' : 'rgba(160,205,185,0.6)', 'center', G.Art.SANS, sel ? '700' : '500');
      }
      G.Art.text(c, 'ESC 继续　Z 确认', 320, y + h - 16, 8.5, 'rgba(140,190,165,0.45)', 'center', G.Art.SANS);
    }

    drawDialogue() {
      const c = this.ctx;
      const d = this.dialogue;
      if (!d) return;
      const line = d.lines[d.index];
      const shown = line.text.slice(0, Math.floor(d.chars));
      G.Art.drawDialogBox(c, {
        side: line.side,
        portrait: line.who,
        portraitGlow: line.glow,
        name: line.name,
        text: shown,
        done: d.chars >= line.text.length
      });
      // progress
      G.Art.text(c, `${d.index + 1} / ${d.lines.length}`, 604, 340, 8, 'rgba(150,200,175,0.4)', 'right', G.Art.SANS);
      G.Art.text(c, 'ESC 跳过剧情', 320, 456, 8, 'rgba(150,200,175,0.38)', 'center', G.Art.SANS);
    }

    drawResult() {
      const c = this.ctx;
      const a = G.clamp(this.resultT / 30, 0, 1);
      c.fillStyle = `rgba(1,9,6,${0.84 * a})`;
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);
      c.save();
      c.globalAlpha = a;
      // title
      G.Art.glowText(c, 'AREA  CLEAR', 320, 74, 38, '#f0fff8', 'rgba(60,240,170,0.75)', 'center', G.Art.SANS);
      G.Art.text(c, '碧雾散去。庭园里的脸终于闭上了眼睛，并向你索要五星好评。', 320, 104, 11, 'rgba(200,240,220,0.8)', 'center', G.Art.SANS);
      c.strokeStyle = 'rgba(92,240,184,0.35)';
      c.beginPath(); c.moveTo(150, 120); c.lineTo(490, 120); c.stroke();

      // score
      G.Art.text(c, 'SCORE', 320, 144, 9, 'rgba(160,210,185,0.7)', 'center', G.Art.SANS);
      G.Art.text(c, G.fmt(this.score), 320, 172, 36, '#f2fff8', 'center', G.Art.SANS);
      if (this.newRecord) {
        const pulse = 0.6 + 0.4 * Math.sin(this.t * 0.1);
        G.Art.text(c, 'NEW RECORD!', 320, 196, 11, `rgba(200,255,140,${pulse})`, 'center', G.Art.SANS);
      } else {
        G.Art.text(c, 'BEST  ' + G.fmt(this.best.score || 0), 320, 196, 10, 'rgba(160,210,185,0.55)', 'center', G.Art.SANS);
      }

      // stats
      const stats = [
        ['擦弹 GRAZE', G.fmt(this.player.graze)],
        ['弹幕回收', this.spellsCaptured + ' / 5'],
        ['收集道具', G.fmt(this.itemsCollected)],
        ['残机 / 祓符', Math.max(0, this.player.lives) + ' / ' + this.player.bombs],
        ['通关奖励', '+' + G.fmt(this.bonus || 0)],
        ['难度', this.diff.name.toUpperCase() + ' / ' + this.diff.cn]
      ];
      let yy = 226;
      for (let i = 0; i < stats.length; i++) {
        const left = i % 2 === 0;
        const x = left ? 150 : 336;
        if (i > 0 && left) yy += 25;
        G.Art.text(c, stats[i][0], x, yy, 9, 'rgba(155,205,180,0.65)', 'left', G.Art.SANS);
        G.Art.text(c, stats[i][1], x + 140, yy, 10, 'rgba(225,255,238,0.9)', 'right', G.Art.SANS);
      }

      // menu
      const opts = ['再来一局', '返回标题'];
      for (let i = 0; i < 2; i++) {
        const x = 250 + i * 140;
        const sel = i === this.endMenu;
        if (sel) {
          c.fillStyle = 'rgba(92,240,184,0.14)';
          c.fillRect(x - 52, 372, 104, 28);
          c.strokeStyle = 'rgba(92,240,184,0.4)';
          c.strokeRect(x - 51.5, 372.5, 103, 27);
        }
        G.Art.text(c, opts[i], x, 386, sel ? 14 : 12.5, sel ? '#eafff2' : 'rgba(160,205,185,0.55)', 'center', G.Art.SANS, sel ? '700' : '500');
      }
      G.Art.text(c, '↑↓ 选择　Z 确认', 320, 430, 8.5, 'rgba(150,200,175,0.45)', 'center', G.Art.SANS);
      c.restore();
    }

    drawGameOver() {
      const c = this.ctx;
      c.fillStyle = 'rgba(1,9,6,0.82)';
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);
      G.Art.glowText(c, 'GAME  OVER', 320, 120, 44, '#d8ff78', 'rgba(120,255,120,0.5)', 'center', G.Art.SANS);
      G.Art.text(c, '你也被留在了碧雾里，并被登记为「临时脸源」。', 320, 158, 13, 'rgba(190,225,205,0.75)', 'center', G.Art.SANS);
      G.Art.text(c, 'SCORE  ' + G.fmt(this.score), 320, 206, 18, '#f2fff8', 'center', G.Art.SANS);
      G.Art.text(c, 'GRAZE  ' + this.player.graze + '　　弹幕 ' + this.spellsCaptured, 320, 232, 10, 'rgba(170,210,190,0.65)', 'center', G.Art.SANS);

      const opts = ['重新开始', '返回标题'];
      for (let i = 0; i < 2; i++) {
        const x = 250 + i * 140;
        const sel = i === this.endMenu;
        if (sel) {
          c.fillStyle = 'rgba(92,240,184,0.14)';
          c.fillRect(x - 52, 288, 104, 28);
          c.strokeStyle = 'rgba(92,240,184,0.4)';
          c.strokeRect(x - 51.5, 288.5, 103, 27);
        }
        G.Art.text(c, opts[i], x, 302, sel ? 14 : 12.5, sel ? '#eafff2' : 'rgba(160,205,185,0.55)', 'center', G.Art.SANS, sel ? '700' : '500');
      }
      G.Art.text(c, '↑↓ 选择　Z 确认', 320, 348, 8.5, 'rgba(150,200,175,0.45)', 'center', G.Art.SANS);
    }

    /* ------------------------------------------------------------------ */
    /*  touch input handling                                              */
    /* ------------------------------------------------------------------ */
    handleTouch() {
      if (this.state !== 'play') return;
      const p = G.Input.pointer;
      if (p.justDown) {
        p.justDown = false;
        this.touch.enabled = p.type === 'touch' || this.touch.enabled;
        const fx = 462, fy = 420, bx = 530, by = 420, px = 598, py = 420;
        if (this.touch.enabled) {
          if (G.dist(p.x, p.y, px, py) < 24) {
            this.state = 'paused';
            this.pauseMenu = 0;
            G.Audio.sfx('pause');
            return;
          }
          if (G.dist(p.x, p.y, fx, fy) < 26) {
            this.touch.focus = !this.touch.focus;
            G.Audio.sfx('select');
            return;
          }
          if (G.dist(p.x, p.y, bx, by) < 26) {
            if (this.player.bombs > 0 && this.player.bombCooldown <= 0 && !this.player.dead) {
              this.player.doBomb(this);
            }
            return;
          }
        }
        if (p.x >= PF.x && p.x <= PF.x + PF.w && p.y >= PF.y && p.y <= PF.y + PF.h && !this.player.dead) {
          this.touch.active = true;
          this.touch.startX = p.downX;
          this.touch.startY = p.downY;
          this.touch.px = this.player.x;
          this.touch.py = this.player.y;
          this.touch.x = this.player.x;
          this.touch.y = this.player.y;
        }
      }
      if (this.touch.active) {
        if (!p.down) {
          this.touch.active = false;
        } else {
          this.touch.x = G.clamp(this.touch.px + (p.x - this.touch.startX) * 1.9, PF.x + 10, PF.x + PF.w - 10);
          this.touch.y = G.clamp(this.touch.py + (p.y - this.touch.startY) * 1.9, PF.y + 14, PF.y + PF.h - 10);
        }
      }
    }
  }

  G.Game = Game;

  const game = new Game();

  function loop(now) {
    game.frame(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

})();
