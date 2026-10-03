import * as THREE from 'three';
import { clamp, damp } from '../utils/math.js';
import { PlayerModel } from './PlayerModel.js';
import { PlayerState, PlayerStateMachine } from './PlayerStateMachine.js';
import { Action } from '../input/Action.js';

// Runs forward along -Z, owns lane/jump/slide physics and its visual model.
export class Player {
  constructor(config, bus, lanes) {
    this.cfg = config;
    this.bus = bus;
    this.lanes = lanes;
    this.sm = new PlayerStateMachine(config, bus);
    this.model = new PlayerModel(config);
    this.group = new THREE.Group();
    this.group.add(this.model.root);
    this.reset();
  }

  reset() {
    this.sm.reset();
    this.lane = this.lanes.centerLane;
    this.x = this.targetX = this.lanes.xOf(this.lane);
    this.y = 0;
    this.z = 0;
    this.prevZ = 0;
    this.vy = 0;
    this.speed = this.cfg.player.baseSpeed;
    this.distance = 0;
    this.runPhase = 0;
    this.bumpTimer = 0;
    this.bumpDir = 0;
    this.model.reset();
    this._sync();
  }

  get state() {
    return this.sm.state;
  }

  get speedRatio() {
    const p = this.cfg.player;
    return clamp((this.speed - p.baseSpeed) / (p.maxSpeed - p.baseSpeed), 0, 1);
  }

  /** Height of the collision volume (used by M2). */
  get height() {
    const s = this.sm.state === PlayerState.SLIDING ? this.cfg.slide.slideHeightScale : 1;
    return this.cfg.player.standHeight * s;
  }

  die() {
    this.sm.die();
  }

  handleAction(action) {
    if (!this.sm.alive) return;
    switch (action) {
      case Action.LEFT:
        this._changeLane(-1);
        break;
      case Action.RIGHT:
        this._changeLane(1);
        break;
      case Action.JUMP:
        this.sm.pressJump();
        break;
      case Action.SLIDE:
        this.sm.pressSlide();
        break;
    }
  }

  _changeLane(dir) {
    const next = this.lane + dir;
    if (!this.lanes.isValid(next)) {
      this.bumpTimer = this.cfg.lanes.bumpDuration;
      this.bumpDir = dir;
      this.bus.emit('laneBump', dir);
      return;
    }
    this.lane = next;
    this.targetX = this.lanes.xOf(next);
    this.bus.emit('laneChange', next);
  }

  update(dt) {
    const { player: p, lanes: l, jump: j } = this.cfg;
    const sm = this.sm;
    this.prevZ = this.z;

    if (!sm.alive) {
      // crashed: finish any fall, keep animating the stumble
      if (this.y > 0 || this.vy !== 0) {
        this.vy -= j.gravity * dt;
        this.y = Math.max(0, this.y + this.vy * dt);
        if (this.y === 0) this.vy = 0;
      }
      this.model.update(dt, this.runPhase, sm.state, 0);
      this._sync();
      return;
    }

    if (sm.alive) {
      this.speed = Math.min(p.maxSpeed, this.speed + p.speedIncreasePerSecond * dt);
      this.z -= this.speed * dt;
      this.distance += this.speed * dt;
      this.runPhase += this.speed * dt * p.strideRate;
      this.x = damp(this.x, this.targetX, l.laneSwitchSpeed, dt);
    }

    sm.tick(dt);
    this._tryJump();
    if (sm.state === PlayerState.JUMPING) {
      if (sm.consumeFastFall()) this.vy = Math.min(this.vy, j.fastFallVelocity);
      this.vy -= j.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        sm.land();
        this._tryJump(); // buffered press right before landing
      }
    }

    if (this.bumpTimer > 0) this.bumpTimer = Math.max(0, this.bumpTimer - dt);
    this.model.update(dt, this.runPhase, sm.state, this.targetX - this.x);
    this._sync();
  }

  _tryJump() {
    if (this.sm.consumeJump()) this.vy = this.cfg.jump.jumpVelocity;
  }

  _sync() {
    const l = this.cfg.lanes;
    let bump = 0;
    if (this.bumpTimer > 0) {
      const t = 1 - this.bumpTimer / l.bumpDuration;
      bump = Math.sin(t * Math.PI);
    }
    this.group.position.set(this.x + bump * l.bumpDistance * this.bumpDir, this.y, this.z);
    this.group.rotation.z = -bump * l.bumpTilt * this.bumpDir;
  }

  shiftOrigin(dz) {
    this.z += dz;
    this.prevZ += dz;
    this.group.position.z += dz;
  }

  dispose() {
    this.model.dispose();
  }
}
