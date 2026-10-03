// STUB (M2): correct public interface, wired into Game, does nothing yet.
export class CollisionManager {
  constructor(config, bus) {
    this.config = config;
    this.bus = bus;
  }

  init() {}

  // TODO(M2): player vs obstacle/coin overlap tests, emits gameOver / coinCollected
  update(dt, player) {}

  shiftOrigin(dz) {}

  reset() {}

  dispose() {}
}
