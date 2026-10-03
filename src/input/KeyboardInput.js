import { Action } from './Action.js';

const KEY_MAP = {
  KeyA: Action.LEFT,
  ArrowLeft: Action.LEFT,
  KeyD: Action.RIGHT,
  ArrowRight: Action.RIGHT,
  KeyW: Action.JUMP,
  ArrowUp: Action.JUMP,
  Space: Action.JUMP,
  KeyS: Action.SLIDE,
  ArrowDown: Action.SLIDE,
};

export class KeyboardInput {
  constructor(push) {
    this.push = push;
    this._onKeyDown = (e) => {
      const action = KEY_MAP[e.code];
      if (action === undefined || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault(); // no page scroll
      if (e.repeat) return;
      this.push(action);
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
