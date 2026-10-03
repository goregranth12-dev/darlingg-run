import { DebugOverlay } from './DebugOverlay.js';

// Minimal until M4 (start screen, HUD, pause, game over).
export class UIManager {
  constructor(config, bus) {
    this.bus = bus;
    this.debug = new DebugOverlay(config);
  }

  update(dt, game) {
    this.debug.update(dt, game);
  }

  dispose() {
    this.debug.dispose();
  }
}
