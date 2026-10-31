/* 睦子米魔人 — input (keyboard / gamepad / pointer) */
(function () {
  'use strict';
  const G = window.G;
  const Input = (G.Input = {
    down: Object.create(null),
    pressed: Object.create(null),
    released: Object.create(null),
    pointer: { x: 0, y: 0, downX: 0, downY: 0, down: false, justDown: false, justUp: false, id: null, type: 'mouse' },
    anyPressed: false,
    lastDevice: 'keyboard',
    gamepad: null,
    listeners: []
  });

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'shoot', Space: 'shoot', KeyJ: 'shoot',
    KeyX: 'bomb', KeyK: 'bomb',
    ShiftLeft: 'focus', ShiftRight: 'focus', KeyL: 'focus',
    Escape: 'pause', KeyP: 'pause',
    Enter: 'confirm', NumpadEnter: 'confirm',
    Backspace: 'cancel',
    KeyM: 'mute',
    KeyF: 'fullscreen',
    KeyR: 'restart'
  };

  function setAction(action, isDown) {
    if (isDown) {
      if (!Input.down[action]) Input.pressed[action] = true;
      Input.down[action] = true;
    } else {
      if (Input.down[action]) Input.released[action] = true;
      Input.down[action] = false;
    }
  }

  addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      e.preventDefault();
      if (!e.repeat) {
        setAction(action, true);
        Input.anyPressed = true;
        Input.lastDevice = 'keyboard';
      }
    }
  }, { passive: false });

  addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      e.preventDefault();
      setAction(action, false);
    }
  }, { passive: false });

  addEventListener('blur', () => {
    for (const k in Input.down) Input.down[k] = false;
    Input.pointer.down = false;
  });

  const canvas = () => document.getElementById('game');

  function toLogical(clientX, clientY) {
    const c = canvas();
    const r = c.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * G.W,
      y: ((clientY - r.top) / r.height) * G.H
    };
  }

  function pointerDown(x, y, id, type) {
    const p = Input.pointer;
    p.x = x; p.y = y; p.downX = x; p.downY = y;
    p.down = true; p.justDown = true; p.id = id; p.type = type;
    Input.anyPressed = true;
    Input.lastDevice = type;
  }
  function pointerMove(x, y) {
    Input.pointer.x = x;
    Input.pointer.y = y;
  }
  function pointerUp() {
    Input.pointer.down = false;
    Input.pointer.justUp = true;
    Input.pointer.id = null;
  }

  addEventListener('pointerdown', (e) => {
    if (e.target && e.target.id === 'game') {
      const q = toLogical(e.clientX, e.clientY);
      pointerDown(q.x, q.y, e.pointerId, e.pointerType);
      try { canvas().setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    }
  }, { passive: false });

  addEventListener('pointermove', (e) => {
    const q = toLogical(e.clientX, e.clientY);
    pointerMove(q.x, q.y);
    if (Input.pointer.down && e.pointerId === Input.pointer.id) {
      Input.pointer.down = true;
    }
  }, { passive: true });

  addEventListener('pointerup', (e) => {
    if (Input.pointer.id === e.pointerId || Input.pointer.down) pointerUp();
  });
  addEventListener('pointercancel', () => pointerUp());

  Input.isDown = (a) => !!Input.down[a];
  Input.justPressed = (a) => !!Input.pressed[a];
  Input.justReleased = (a) => !!Input.released[a];
  Input.consume = (a) => {
    if (!Input.pressed[a]) return false;
    delete Input.pressed[a];
    return true;
  };
  Input.axis = function () {
    Input.pollGamepad();
    let x = (Input.isDown('right') ? 1 : 0) - (Input.isDown('left') ? 1 : 0);
    let y = (Input.isDown('down') ? 1 : 0) - (Input.isDown('up') ? 1 : 0);
    x += Input.gp.x; y += Input.gp.y;
    if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
    return { x: G.clamp(x, -1, 1), y: G.clamp(y, -1, 1) };
  };

  Input.gp = { x: 0, y: 0, shoot: false, bomb: false, focus: false };
  Input.gpPrev = Object.create(null);

  Input.pollGamepad = function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    if (!pads) return null;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (!p || !p.connected) continue;
      const dz = 0.24;
      let x = p.axes[0] || 0, y = p.axes[1] || 0;
      if (Math.abs(x) < dz) x = 0;
      if (Math.abs(y) < dz) y = 0;
      const btn = (n) => !!(p.buttons[n] && p.buttons[n].pressed);
      const gp = Input.gp;
      gp.x = x; gp.y = y;
      gp.shoot = btn(0) || btn(7);
      gp.bomb = btn(1) || btn(6);
      gp.focus = btn(2) || btn(3) || btn(4) || btn(5);

      const edge = (name, pressed) => {
        if (pressed && !Input.gpPrev[name]) Input.pressed[name] = true;
        Input.gpPrev[name] = pressed;
      };
      edge('shoot', gp.shoot);
      edge('bomb', gp.bomb);
      edge('confirm', btn(9));
      edge('up', btn(12));
      edge('down', btn(13));
      edge('left', btn(14));
      edge('right', btn(15));
      if (x || y || gp.shoot || gp.bomb) Input.lastDevice = 'gamepad';
      return { x, y };
    }
    return null;
  };

  Input.flush = function () {
    Input.pressed = Object.create(null);
    Input.released = Object.create(null);
    Input.pointer.justDown = false;
    Input.pointer.justUp = false;
    Input.anyPressed = false;
  };

  Input.reset = function () {
    Input.down = Object.create(null);
    Input.flush();
  };
})();
