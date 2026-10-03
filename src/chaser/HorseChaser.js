import { damp } from '../utils/math.js';
import { HorseModel } from './HorseModel.js';

export const HorseMode = Object.freeze({
  HIDDEN: 0,
  CHASE: 1, // galloping right behind the flamingo
  APPROACH: 2, // after a crash: racing up from behind
  CARRY: 3, // flamingo on its back, galloping away
  DONE: 4,
});

// The rocking-horse unicorn: chases the flamingo in the opening shot and the first
// seconds of a run (then is left behind), and collects the flamingo after a crash.
export class HorseChaser {
  constructor(scene, config) {
    this.cfg = config.horse;
    this.scene = scene;
    this.model = new HorseModel(config);
    scene.add(this.model.root);
    this.mode = HorseMode.HIDDEN;
    this.gap = 0;
    this.timer = 0;
    this.x = 0;
    this.z = 0;
    this.speed = 0;
    this.carried = null;
  }

  get done() {
    return this.mode === HorseMode.DONE;
  }

  reset() {
    this.mode = HorseMode.HIDDEN;
    this.model.root.visible = false;
    this.carried = null;
  }

  /** Horse position for the camera to follow once it carries the flamingo (else null). */
  get focus() {
    return this.carried ? this.model.root.position : null;
  }

  /** Start (or restart) the chase right behind the flamingo. */
  startChase(player, gap) {
    this.mode = HorseMode.CHASE;
    this.timer = 0;
    this.gap = gap;
    this.x = player.x;
    this.z = player.z + gap;
    this.model.root.visible = true;
    this._place(0);
  }

  /** Switch from the opening-shot gap to the gameplay chase (keeps the gap continuous). */
  beginRun() {
    this.timer = 0;
  }

  startRescue(player) {
    this.mode = HorseMode.APPROACH;
    this.timer = 0;
    this.x = player.x;
    this.z = player.z + this.cfg.rescue.startDistance;
    this.speed = this.cfg.rescue.speed;
    this.model.root.visible = true;
    this._place(0);
  }

  /** `chasing` is true once the gameplay camera has arrived (starts the 5 s chase clock). */
  update(dt, player, chasing = true) {
    switch (this.mode) {
      case HorseMode.CHASE:
        this._chase(dt, player, chasing);
        break;
      case HorseMode.APPROACH:
        this._approach(dt, player);
        break;
      case HorseMode.CARRY:
        this._carry(dt);
        break;
      default:
        break;
    }
  }

  _chase(dt, player, chasing) {
    const c = this.cfg;
    if (chasing) this.timer += dt;
    const t = this.timer;
    if (t < c.chaseSeconds) {
      const target = (chasing ? c.chaseGap : c.startGap) + Math.sin(performance.now() * 0.004) * c.wobble;
      this.gap = damp(this.gap, target, 3, dt);
    } else {
      this.gap += dt * (2 + (t - c.chaseSeconds) * c.fallBackAccel); // left behind
      if (this.gap > c.hideGap) {
        this.mode = HorseMode.HIDDEN;
        this.model.root.visible = false;
        return;
      }
    }
    this.x = damp(this.x, player.x, c.followDamping, dt);
    this.z = player.z + this.gap;
    this.model.animate(dt, 1);
    this._place(0);
  }

  _approach(dt, player) {
    const r = this.cfg.rescue;
    // race in, easing off as it nears so the arrival is visible
    this.speed = Math.min(r.speed, Math.max(r.minApproachSpeed, (this.z - player.z) * r.approachEase));
    this.z -= this.speed * dt;
    this.x = damp(this.x, player.x, 6, dt);
    this.model.animate(dt, 1.3);
    this._place(0);
    if (this.z - player.z <= r.grabDistance) {
      this.mode = HorseMode.CARRY;
      this.timer = 0;
      this.speed = r.carrySpeed;
      this.carried = player;
      this.speed = r.carrySpeed * 0.5;
      player.attachTo(this.model.root, r.carryHeight / this.cfg.scale, r.carryRoll, r.carryScale / this.cfg.scale);
    }
  }

  _carry(dt) {
    const r = this.cfg.rescue;
    this.timer += dt;
    this.speed = Math.min(r.carrySpeed, this.speed + dt * r.carryAccel); // gallops off, picking up speed
    this.z -= this.speed * dt;
    this.model.animate(dt, 1.2);
    this._place(0);
    if (this.timer >= r.carrySeconds) this.mode = HorseMode.DONE;
  }

  _place() {
    this.model.root.position.set(this.x, 0, this.z);
  }

  shiftOrigin(dz) {
    this.z += dz;
    this.model.root.position.z += dz;
  }

  dispose() {
    this.scene.remove(this.model.root);
    this.model.dispose();
  }
}
