import * as THREE from 'three';
import { clamp, damp, inverseLerp, lerp } from '../utils/math.js';

// Third-person chase camera: damped follow, lane sway/roll, speed-based FOV.
// All smoothing state is preallocated; update() never allocates.
export class CameraRig {
  constructor(camera, config) {
    this.camera = camera;
    this.config = config;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.fov = config.camera.fov;
    this.roll = 0;
    this.snap = true;
  }

  /** speedRatio: 0 at baseSpeed .. 1 at maxSpeed. */
  update(dt, player, speedRatio, aspect) {
    const c = this.config.camera;
    const portrait = clamp(inverseLerp(1, 1 - c.portraitBlendRange, aspect), 0, 1);
    const pullback = c.speedPullback * speedRatio + c.offset.z * c.portraitPullback * portrait;

    const targetX = player.x * c.laneFollow + c.offset.x;
    const targetY = c.offset.y + player.y * 0.35 + portrait * 0.8;
    const lookX = player.x * (0.5 + c.laneFollow * 0.5);

    if (this.snap) {
      this.pos.set(targetX, targetY, 0);
      this.look.set(lookX, c.lookHeight, 0);
      this.fov = c.fov;
      this.snap = false;
    }

    this.pos.x = damp(this.pos.x, targetX, c.followDamping, dt);
    this.pos.y = damp(this.pos.y, targetY, c.followDamping, dt);
    this.pos.z = player.z + c.offset.z + pullback; // locked: no forward lag at high speed
    this.look.x = damp(this.look.x, lookX, c.followDamping, dt);
    this.look.y = damp(this.look.y, c.lookHeight + player.y * 0.5, c.followDamping, dt);
    this.look.z = player.z - c.lookAhead;

    const cam = this.camera;
    cam.position.copy(this.pos);
    cam.lookAt(this.look);

    const rollTarget = (player.x - player.targetX) * c.sway;
    this.roll = damp(this.roll, rollTarget, c.swayDamping, dt);
    cam.rotateZ(this.roll);

    const baseFov = lerp(c.fov, c.portraitFov, portrait);
    const fovTarget = baseFov + c.fovBoost * speedRatio;
    this.fov = damp(this.fov, fovTarget, c.fovDamping, dt);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }

  shiftOrigin(dz) {
    this.pos.z += dz;
    this.look.z += dz;
  }
}
