import { PLAYER_STATE_NAMES } from '../player/PlayerStateMachine.js';

// Minimal debug HUD: FPS, speed, lane, player state. Toggle with backtick or ?debug=1.
export class DebugOverlay {
  constructor(config) {
    this.cfg = config.game;
    this.el = document.createElement('pre');
    this.el.className = 'debug-overlay';
    document.body.appendChild(this.el);
    this.visible = new URLSearchParams(location.search).get('debug') === '1';
    this.elapsed = 0;
    this._apply();
    this._onKey = (e) => {
      if (e.code !== this.cfg.debugKey) return;
      e.preventDefault();
      if (!e.repeat) this.toggle();
    };
    window.addEventListener('keydown', this._onKey);
  }

  toggle() {
    this.visible = !this.visible;
    this._apply();
  }

  _apply() {
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  update(dt, game) {
    if (!this.visible) return;
    this.elapsed += dt * 1000;
    if (this.elapsed < this.cfg.debugUpdateIntervalMs) return;
    this.elapsed = 0;
    const p = game.player;
    this.el.textContent =
      `FPS    ${game.loop.fps.toFixed(0)}\n` +
      `speed  ${p.speed.toFixed(1)}\n` +
      `lane   ${p.lane}\n` +
      `state  ${PLAYER_STATE_NAMES[p.state]}\n` +
      `dist   ${p.distance.toFixed(0)}`;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.el.remove();
  }
}
