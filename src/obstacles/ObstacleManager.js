// STUB (M2): correct public interface, wired into Game, does nothing yet.
export class ObstacleManager {
  constructor(config, bus) {
    this.config = config;
    this.bus = bus;
  }

  init() {}

  // TODO(M2): pooled low/high/full-block obstacles, spawning and difficulty ramp
  update(dt, player) {}

  shiftOrigin(dz) {}

  reset() {}

  dispose() {}
}
