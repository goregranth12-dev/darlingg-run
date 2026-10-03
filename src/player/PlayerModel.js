import * as THREE from 'three';
import { damp } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';
import { PlayerState } from './PlayerStateMachine.js';

// Procedural stylised runner: capsule limbs/torso, sphere head, visor, scarf.
// Feet at y=0, facing -Z. Poses are blended by damping limb angles.
export class PlayerModel {
  constructor(config) {
    this.cfg = config;
    const pal = config.visual.player;
    const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, ...extra });
    const suit = mat(pal.suit);
    const limbs = mat(pal.limbs);
    const skin = mat(pal.skin);
    const scarf = mat(pal.scarf);
    const shoe = mat(pal.shoe);
    const visor = mat(pal.visor, { emissive: pal.visor, emissiveIntensity: 0.8 });

    this.root = new THREE.Group(); // squash/lean applied here
    this.body = new THREE.Group(); // run bob applied here
    this.root.add(this.body);

    const part = (geo, material, parent, x, y, z) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    part(new THREE.CapsuleGeometry(0.25, 0.35, 4, 10), suit, this.body, 0, 1.2, 0);
    part(new THREE.SphereGeometry(0.22, 14, 12), skin, this.body, 0, 1.85, 0);
    part(new THREE.BoxGeometry(0.34, 0.1, 0.12), visor, this.body, 0, 1.88, -0.19);
    part(new THREE.TorusGeometry(0.2, 0.06, 6, 12), scarf, this.body, 0, 1.6, 0).rotation.x = Math.PI / 2;
    this.scarfTail = new THREE.Group();
    this.scarfTail.position.set(0, 1.6, 0.18);
    this.body.add(this.scarfTail);
    part(new THREE.BoxGeometry(0.14, 0.05, 0.5), scarf, this.scarfTail, 0, 0, 0.25);

    this.legs = [this._limb(0.17, 0.78, 0.13, 0.5, 0.36, limbs, shoe, true), this._limb(-0.17, 0.78, 0.13, 0.5, 0.36, limbs, shoe, true)];
    this.arms = [this._limb(0.36, 1.5, 0.09, 0.4, 0.28, suit, skin, false), this._limb(-0.36, 1.5, 0.09, 0.4, 0.28, suit, skin, false)];

    this.root.traverse((n) => {
      if (n.isMesh) n.receiveShadow = false;
    });
    this.scaleY = 1;
  }

  _limb(x, y, radius, length, drop, material, endMaterial, shoe) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material);
    mesh.position.y = -drop;
    mesh.castShadow = true;
    pivot.add(mesh);
    const end = new THREE.Mesh(shoe ? new THREE.BoxGeometry(0.2, 0.1, 0.32) : new THREE.SphereGeometry(0.1, 8, 8), endMaterial);
    end.position.set(0, -drop - length / 2 - radius + (shoe ? 0.05 : 0), shoe ? -0.05 : 0);
    end.castShadow = true;
    pivot.add(end);
    this.body.add(pivot);
    return pivot;
  }

  /**
   * @param runPhase  run-cycle radians
   * @param state     PlayerState
   * @param lateral   x error (targetX - x) for roll
   */
  update(dt, runPhase, state, lateral) {
    const p = this.cfg.player;
    const k = p.poseDamping;
    const swing = Math.sin(runPhase);
    let leg0 = swing * 0.95;
    let leg1 = -swing * 0.95;
    let arm0 = -swing * 0.8;
    let arm1 = swing * 0.8;
    let lean = p.runLean;
    let bob = Math.abs(Math.cos(runPhase)) * p.bobHeight;
    let scaleTarget = 1;

    if (state === PlayerState.JUMPING) {
      leg0 = -0.9;
      leg1 = 0.45;
      arm0 = -2.3;
      arm1 = -2.3;
      lean = -0.05;
      bob = 0;
    } else if (state === PlayerState.SLIDING) {
      leg0 = -1.25;
      leg1 = -1.0;
      arm0 = 0.9;
      arm1 = 0.9;
      lean = this.cfg.slide.slideLean;
      bob = 0;
      scaleTarget = this.cfg.slide.slideHeightScale;
    }

    this.legs[0].rotation.x = damp(this.legs[0].rotation.x, leg0, k, dt);
    this.legs[1].rotation.x = damp(this.legs[1].rotation.x, leg1, k, dt);
    this.arms[0].rotation.x = damp(this.arms[0].rotation.x, arm0, k, dt);
    this.arms[1].rotation.x = damp(this.arms[1].rotation.x, arm1, k, dt);
    this.body.position.y = damp(this.body.position.y, bob, k, dt);
    this.root.rotation.x = damp(this.root.rotation.x, lean, k, dt);
    this.root.rotation.z = damp(this.root.rotation.z, -lateral * p.laneLean, k, dt);
    this.scaleY = damp(this.scaleY, scaleTarget, this.cfg.slide.squashDamping, dt);
    this.root.scale.y = this.scaleY;
    this.scarfTail.rotation.x = -0.25 + Math.sin(runPhase * 2) * 0.12;
  }

  dispose() {
    disposeObject(this.root);
  }
}
