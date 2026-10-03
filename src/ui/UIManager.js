import { DebugOverlay } from './DebugOverlay.js';

const MARKUP = `
  <div class="hud" hidden>
    <div class="hud-score"><span class="hud-label">Score</span><span class="hud-value" data-ref="score">0</span></div>
    <div class="hud-coins"><i class="coin-icon">gg</i><span class="hud-value" data-ref="coins">0</span></div>
  </div>
  <div class="overlay" data-ref="start">
    <div class="panel">
      <h1 class="title">Darlingg <em>Run</em></h1>
      <ul class="controls">
        <li><b>Left / Right</b> change lane</li>
        <li><b>Up / Space</b> jump over low barriers</li>
        <li><b>Down</b> slide under beams</li>
        <li class="touch">Swipe in any direction on a phone</li>
      </ul>
      <p class="prompt">Tap or press Space to run</p>
    </div>
  </div>
  <div class="overlay" data-ref="over" hidden>
    <div class="panel">
      <h2 class="title small">Wiped out</h2>
      <p class="newbest" data-ref="newbest" hidden>New best!</p>
      <dl class="results">
        <div><dt>Score</dt><dd data-ref="finalScore">0</dd></div>
        <div><dt>Best</dt><dd data-ref="best">0</dd></div>
        <div><dt>Coins</dt><dd data-ref="finalCoins">0</dd></div>
      </dl>
      <p class="prompt">Tap or press Space to run again</p>
    </div>
  </div>`;

// DOM-only UI: HUD (score, coins), start screen and game-over screen.
// Overlays have pointer-events: none so taps/swipes still reach the canvas.
export class UIManager {
  constructor(config, bus) {
    this.bus = bus;
    this.debug = new DebugOverlay(config);
    this.root = document.createElement('div');
    this.root.className = 'ui';
    this.root.innerHTML = MARKUP;
    document.body.appendChild(this.root);
    this.refs = {};
    this.root.querySelectorAll('[data-ref]').forEach((el) => (this.refs[el.dataset.ref] = el));
    this.hud = this.root.querySelector('.hud');
    this.lastScore = -1;
    this.lastCoins = -1;
    this.score = null;
    this.off = bus.on('stateChanged', (state) => this._onState(state));
  }

  bindScore(score) {
    this.score = score;
  }

  _onState(state) {
    const r = this.refs;
    r.start.hidden = state !== 'ready';
    r.over.hidden = state !== 'gameover';
    this.hud.hidden = state === 'ready';
    if (state === 'gameover' && this.score) {
      const s = this.score;
      r.finalScore.textContent = s.score;
      r.best.textContent = s.best;
      r.finalCoins.textContent = s.coins;
      r.newbest.hidden = !s.newBest;
    }
  }

  update(dt, game) {
    this.debug.update(dt, game);
    const s = this.score;
    if (!s) return;
    const score = s.score;
    if (score !== this.lastScore) {
      this.lastScore = score;
      this.refs.score.textContent = score;
    }
    if (s.coins !== this.lastCoins) {
      this.lastCoins = s.coins;
      this.refs.coins.textContent = s.coins;
    }
  }

  dispose() {
    this.off();
    this.root.remove();
    this.debug.dispose();
  }
}
