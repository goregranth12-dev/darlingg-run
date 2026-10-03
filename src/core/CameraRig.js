import * as THREE from 'three';
import { clamp, damp, inverseLerp, lerp, smoothstep } from '../utils/math.js';

// Third-person chase camera (damped follow, lane sway/roll, speed FOV) plus a cinematic
// shot for the opening: `blend` 0 = cinematic, 1 = gameplay, eased over introSeconds.
// All state is preallocated; update() never allocates.
export class CameraRig {
  constructor(camera, config) {
    this.camera = camera;
    this.config = config;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.cinePos = new THREE.Vector3();
    this.cineLook = new THREE.Vector3();
    this.mixPos = new THREE.Vector3();
    this.mixLook = new THREE.Vector3();
    this.fov = config.camera.fov;
    this.roll = 0;
    this.snap = true;
    this.blend = 1;
    this.target = 1; // blend goal: 0 cinematic, 1 gameplay
    this.focus = null; // {x, z} the cinematic shot frames (defaults to the player)
    this.behind = false; // rescue shot: camera behind/beside the action looking forward
    this.time = 0;
  }

  get arrived() {
    return this.blend >= 0.999;
  }

  /** Cut to the cinematic shot (opening) or straight to gameplay. */
  setCinematic(on) {
    this.focus = null;
    this.behind = false;
    this.target = on ? 0 : 1;
    this.blend = on ? 0 : 1;
    this.snap = true;
  }

  /** Start easing from the cinematic shot into the gameplay view. */
  beginIntro() {
    this.target = 1;
  }

  /** Ease back out to the cinematic shot (the horse rescue). */
  beginOutro() {
    this.behind = true;
    this.target = 0;
  }

  /** speedRatio: 0 at baseSpeed .. 1 at maxSpeed. */
  update(dt, player, speedRatio, aspect) {
    const c = this.config.camera;
    this.time += dt;
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

    const baseFov = lerp(c.fov, c.portraitFov, portrait);
    const fovTarget = baseFov + c.fovBoost * speedRatio;
    this.fov = damp(this.fov, fovTarget, c.fovDamping, dt);

    const cam = this.camera;
    let e = 1; // eased blend
    if (this.blend < this.target) this.blend = Math.min(this.target, this.blend + dt / c.introSeconds);
    else if (this.blend > this.target) this.blend = Math.max(this.target, this.blend - dt / c.introSeconds);
    if (this.blend < 1) {
      const f = this.focus || player;
      e = smoothstep(this.blend);
      const k = this.behind ? c.outro : c.cinematic;
      const a = k.angle + Math.sin(this.time * k.orbitSpeed) * k.orbit;
      const dir = this.behind ? 1 : -1; // opening: ahead of the flamingo; rescue: behind it
      this.cinePos.set(f.x + Math.sin(a) * k.distance, k.height, f.z + dir * Math.cos(a) * k.distance);
      this.cineLook.set(f.x, k.lookHeight, f.z - dir * k.lookBack);
      this.mixPos.lerpVectors(this.cinePos, this.pos, e);
      this.mixLook.lerpVectors(this.cineLook, this.look, e);
      cam.position.copy(this.mixPos);
      cam.lookAt(this.mixLook);
      const fov = lerp(k.fov, this.fov, e);
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }
      return;
    }

    cam.position.copy(this.pos);
    cam.lookAt(this.look);
    const rollTarget = (player.x - player.targetX) * c.sway;
    this.roll = damp(this.roll, rollTarget, c.swayDamping, dt);
    cam.rotateZ(this.roll);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }

  /** Jump straight to the follow position on the next update (restart). */
  reset() {
    this.snap = true;
    this.roll = 0;
  }

  shiftOrigin(dz) {
    this.pos.z += dz;
    this.look.z += dz;
  }
}
