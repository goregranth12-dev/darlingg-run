// requestAnimationFrame driver. Clamps dt so tab switches / hitches can't
// teleport the player, and tracks a smoothed FPS for the debug overlay.
export class GameLoop {
  constructor(config, onFrame) {
    this.config = config.game;
    this.onFrame = onFrame;
    this.running = false;
    this.last = 0;
    this.fps = 60;
    this._raf = 0;
    this._tick = (now) => this._step(now);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resetClock();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  /** Call after a pause so the first frame back doesn't see a huge dt. */
  resetClock() {
    this.last = 0;
  }

  _step(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._tick);
    if (this.last === 0) {
      this.last = now;
      return;
    }
    const raw = (now - this.last) / 1000;
    this.last = now;
    if (raw > 0) this.fps += (1 / raw - this.fps) * this.config.fpsSmoothing;
    this.onFrame(Math.min(raw, this.config.maxDeltaTime));
  }
}
