// STUB (M3): correct public interface, wired into Game, does nothing yet.
export class CoinManager {
  constructor(config, bus) {
    this.config = config;
    this.bus = bus;
  }

  init() {}

  // TODO(M3): pooled coins and spawn patterns
  update(dt, player) {}

  shiftOrigin(dz) {}

  reset() {}

  dispose() {}
}
