// Distance + coin score, with a persisted best (localStorage, failure-tolerant).
export class ScoreManager {
  constructor(config, bus) {
    this.cfg = config.score;
    this.bus = bus;
    this.coins = 0;
    this.distancePoints = 0;
    this.best = 0;
    this.newBest = false;
  }

  init() {
    this.best = this._load();
    this.reset();
    this.bus.on('coinCollected', () => this.coins++);
    this.bus.on('gameOver', () => this._finish());
  }

  get score() {
    return this.distancePoints + this.coins * this.cfg.coinValue;
  }

  update(dt, player) {
    if (player.sm.alive) this.distancePoints = Math.floor(player.distance * this.cfg.pointsPerUnit);
  }

  _finish() {
    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      this._save(this.best);
    }
  }

  _load() {
    try {
      return parseInt(localStorage.getItem(this.cfg.storageKey), 10) || 0;
    } catch {
      return 0;
    }
  }

  _save(value) {
    try {
      localStorage.setItem(this.cfg.storageKey, String(value));
    } catch {
      /* storage unavailable (private mode): best just won't persist */
    }
  }

  shiftOrigin(dz) {}

  reset() {
    this.coins = 0;
    this.distancePoints = 0;
    this.newBest = false;
  }

  dispose() {}
}
