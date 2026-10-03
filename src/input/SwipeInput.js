import { Action } from './Action.js';

// Pointer-based swipes. Fires the moment the threshold is crossed within the
// time limit (not on release). One touch gives at most one action, however long or fast the swipe.
export class SwipeInput {
  constructor(target, config, push) {
    this.target = target;
    this.config = config;
    this.push = push;
    this.pointerId = -1;
    this.startX = 0;
    this.startY = 0;
    this.startT = 0;
    this.downX = 0;
    this.downY = 0;
    this.downT = 0;
    this.swiped = false;

    this._down = (e) => {
      // a new touch always starts fresh (a lost pointerup must never lock input)
      this.pointerId = e.pointerId;
      this._anchor(e.clientX, e.clientY, e.timeStamp);
      this.downX = e.clientX;
      this.downY = e.clientY;
      this.downT = e.timeStamp;
      this.swiped = false;
      if (target.setPointerCapture) target.setPointerCapture(e.pointerId);
    };
    this._move = (e) => {
      if (e.pointerId !== this.pointerId || this.swiped) return; // one swipe per touch
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
      this.swiped = true;
    };
    this._up = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = -1;
      const dist = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
      const quick = e.timeStamp - this.downT <= this.config.swipeMaxTimeMs;
      if (e.type === 'pointerup' && !this.swiped && quick && dist < this.config.swipeThresholdPx) this.push(Action.TAP);
    };
    this._prevent = (e) => e.preventDefault();

    target.addEventListener('pointerdown', this._down);
    target.addEventListener('pointermove', this._move);
    target.addEventListener('pointerup', this._up);
    target.addEventListener('pointercancel', this._up);
    window.addEventListener('pointerup', this._up); // finger lifted outside the canvas
    window.addEventListener('pointercancel', this._up);
    window.addEventListener('blur', this._reset = () => (this.pointerId = -1));
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
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    window.removeEventListener('blur', this._reset);
    t.removeEventListener('contextmenu', this._prevent);
    t.removeEventListener('touchmove', this._prevent);
    document.removeEventListener('gesturestart', this._prevent);
  }
}
