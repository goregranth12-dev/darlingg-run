export const PlayerState = Object.freeze({
  RUNNING: 0,
  JUMPING: 1,
  SLIDING: 2,
  DEAD: 3, // wired for M2 (collision -> game over)
});

export const PLAYER_STATE_NAMES = ['running', 'jumping', 'sliding', 'dead'];

// Owns the player's state and the timers that gate transitions (jump buffer,
// coyote time, slide timer, queued slide-on-landing). Physics lives in Player.
export class PlayerStateMachine {
  constructor(config, bus) {
    this.cfg = config;
    this.bus = bus;
    this.reset();
  }

  reset() {
    this.state = PlayerState.RUNNING;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.slideTimer = 0;
    this.fastFall = false;
    this.slideQueued = false;
  }

  get grounded() {
    return this.state === PlayerState.RUNNING || this.state === PlayerState.SLIDING;
  }

  get alive() {
    return this.state !== PlayerState.DEAD;
  }

  tick(dt) {
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.state === PlayerState.JUMPING) {
      if (this.coyote > 0) this.coyote -= dt;
    } else {
      this.coyote = this.cfg.jump.coyoteTimeMs / 1000;
    }
    if (this.state === PlayerState.SLIDING) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.state = PlayerState.RUNNING;
    }
  }

  pressJump() {
    if (this.alive) this.jumpBuffer = this.cfg.jump.inputBufferMs / 1000;
  }

  pressSlide() {
    if (!this.alive) return;
    if (this.grounded) this._startSlide();
    else {
      this.fastFall = true; // dive down, then slide on landing
      this.slideQueued = true;
    }
  }

  /** True (and consumes the buffered press) if a jump should start now. */
  consumeJump() {
    if (!this.alive || this.jumpBuffer <= 0) return false;
    if (!this.grounded && this.coyote <= 0) return false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.slideQueued = false;
    this.state = PlayerState.JUMPING;
    this.bus.emit('jump');
    return true;
  }

  /** True once per fast-fall request. */
  consumeFastFall() {
    const f = this.fastFall;
    this.fastFall = false;
    return f;
  }

  land() {
    this.fastFall = false;
    this.state = PlayerState.RUNNING;
    this.bus.emit('land');
    if (this.slideQueued) {
      this.slideQueued = false;
      this._startSlide();
    }
  }

  die() {
    this.state = PlayerState.DEAD;
  }

  _startSlide() {
    this.state = PlayerState.SLIDING;
    this.slideTimer = this.cfg.slide.slideDuration;
    this.bus.emit('slide');
  }
}
