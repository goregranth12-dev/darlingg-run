// STUB (M3): correct public interface, wired into Game, does nothing yet.
export class ScoreManager {
  constructor(config, bus) {
    this.config = config;
    this.bus = bus;
  }

  init() {}

  // TODO(M3): distance + coin score
  update(dt, player) {}

  shiftOrigin(dz) {}

  reset() {}

  dispose() {}
}
