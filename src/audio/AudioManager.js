// STUB (M5): correct public interface, wired into Game, does nothing yet.
export class AudioManager {
  constructor(config, bus) {
    this.config = config;
    this.bus = bus;
  }

  init() {}

  // TODO(M5): WebAudio SFX/music, unlocked on first user gesture
  update(dt, player) {}

  shiftOrigin(dz) {}

  reset() {}

  dispose() {}
}
