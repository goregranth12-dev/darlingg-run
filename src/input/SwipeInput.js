import { Action } from './Action.js';

// Pointer-based swipes. Fires the moment the threshold is crossed within the
// time limit (not on release), then re-anchors so one touch can chain swipes.
export class SwipeInput {
  constructor(target, config, push) {
    this.target = target;
    this.config = config;
    this.push = push;
    this.pointerId = -1;
    this.startX = 0;
    this.startY = 0;
    this.startT = 0;

    this._down = (e) => {
      if (this.pointerId !== -1) return;
      this.pointerId = e.pointerId;
      this._anchor(e.clientX, e.clientY, e.timeStamp);
      if (target.setPointerCapture) target.setPointerCapture(e.pointerId);
    };
    this._move = (e) => {
      if (e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const threshold = this.config.swipeThresholdPx;
      if (e.timeStamp - this.startT > this.config.swipeMaxTimeMs) {
        this._anchor(e.clientX, e.clientY, e.timeStamp); // too slow: not a swipe
        return;
      }
      if (ax < threshold && ay < threshold) return;
      if (ax > ay) this.push(dx < 0 ? Action.LEFT : Action.RIGHT);
      else this.push(dy < 0 ? Action.JUMP : Action.SLIDE);
      this._anchor(e.clientX, e.clientY, e.timeStamp);
    };
    this._up = (e) => {
      if (e.pointerId === this.pointerId) this.pointerId = -1;
    };
    this._prevent = (e) => e.preventDefault();

    target.addEventListener('pointerdown', this._down);
    target.addEventListener('pointermove', this._move);
    target.addEventListener('pointerup', this._up);
    target.addEventListener('pointercancel', this._up);
    target.addEventListener('contextmenu', this._prevent);
    // iOS Safari: stop pinch-zoom / page drag gestures
    target.addEventListener('touchmove', this._prevent, { passive: false });
    document.addEventListener('gesturestart', this._prevent);
  }

  _anchor(x, y, t) {
    this.startX = x;
    this.startY = y;
    this.startT = t;
  }

  dispose() {
    const t = this.target;
    t.removeEventListener('pointerdown', this._down);
    t.removeEventListener('pointermove', this._move);
    t.removeEventListener('pointerup', this._up);
    t.removeEventListener('pointercancel', this._up);
    t.removeEventListener('contextmenu', this._prevent);
    t.removeEventListener('touchmove', this._prevent);
    document.removeEventListener('gesturestart', this._prevent);
  }
}
