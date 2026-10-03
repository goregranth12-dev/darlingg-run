import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { damp } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';
import { PlayerState } from './PlayerStateMachine.js';

// Procedural 3D flamingo in platform heels (see the character sheet): raspberry body,
// S-curved neck, black-tipped beak, scalloped wings with pale trim, fluffy heels with
// gold ankle rings. Feet at y=0, facing -Z. Poses blend by damping joint angles.

const HIP_Y = 1.15; // leg pivot height
const LEG_LENGTH = 0.86; // hip to ankle
const SHOULDER = { x: 0.3, y: 1.62, z: 0.02 };
const NECK_BASE = { y: 1.6, z: -0.22 };
const NECK_POINTS = [[0, 0, 0], [0, 0.12, -0.1], [0, 0.28, -0.04], [0, 0.44, -0.1], [0, 0.54, -0.22]];

function wingShape(inset) {
  const s = new THREE.Shape();
  const k = 1 - inset;
  s.moveTo(0, 0.16 * k);
  s.quadraticCurveTo(0.35 * k, 0.28 * k, 0.72 * k, 0.1 * k);
  s.quadraticCurveTo(0.8 * k, -0.05 * k, 0.68 * k, -0.12 * k);
  s.quadraticCurveTo(0.64 * k, -0.3 * k, 0.5 * k, -0.28 * k);
  s.quadraticCurveTo(0.44 * k, -0.45 * k, 0.3 * k, -0.4 * k);
  s.quadraticCurveTo(0.2 * k, -0.52 * k, 0.08 * k, -0.36 * k);
  s.lineTo(0, -0.2 * k);
  return s;
}

export class PlayerModel {
  constructor(config) {
    this.cfg = config;
    const pal = config.visual.player;
    const mat = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
    this.m = {
      body: mat(pal.body),
      edge: mat(pal.edge),
      beak: mat(pal.beak),
      tip: mat(pal.beakTip, { roughness: 0.4 }),
      eye: mat(pal.eyeWhite, { roughness: 0.3 }),
      pupil: mat(pal.pupil, { roughness: 0.2 }),
      shoe: mat(pal.shoe, { roughness: 0.55 }),
      sole: mat(pal.sole),
      fur: mat(pal.fur, { roughness: 1 }),
      gold: mat(pal.gold, { roughness: 0.3, metalness: 0.5 }),
      wing: mat(pal.body, { side: THREE.DoubleSide }),
      wingEdge: mat(pal.edge, { side: THREE.DoubleSide }),
    };
    this.geos = [];
    this.root = new THREE.Group(); // squash / lean / roll
    this.body = new THREE.Group(); // bob
    this.root.add(this.body);

    this._buildBody();
    this._buildNeck();
    this._buildWings();
    this._buildLegs();

    this.root.traverse((n) => {
      if (n.isMesh) n.castShadow = true;
    });
    this.scaleY = 1;
    this.t = 0;
  }

  _geo(geometry) {
    this.geos.push(geometry);
    return geometry;
  }

  _mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(this._geo(geometry), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  _buildBody() {
    const m = this.m;
    this._mesh(new THREE.SphereGeometry(1, 20, 16), m.body, this.body, 0, 1.38, 0.02).scale.set(0.4, 0.38, 0.55);
    // tail fan
    for (let i = -1; i <= 1; i++) {
      const f = this._mesh(new THREE.SphereGeometry(1, 10, 8), i === 0 ? m.edge : m.body, this.body, i * 0.09, 1.34, 0.56);
      f.scale.set(0.07, 0.035, 0.3);
      f.rotation.y = i * 0.35;
    }
  }

  _buildNeck() {
    const m = this.m;
    this.neck = new THREE.Group();
    this.neck.position.set(0, NECK_BASE.y, NECK_BASE.z);
    this.body.add(this.neck);
    const curve = new THREE.CatmullRomCurve3(NECK_POINTS.map((p) => new THREE.Vector3(...p)));
    this._mesh(new THREE.TubeGeometry(curve, 20, 0.08, 10, false), m.body, this.neck);

    const end = NECK_POINTS[NECK_POINTS.length - 1];
    this.head = new THREE.Group();
    this.head.position.set(end[0], end[1], end[2]);
    this.neck.add(this.head);
    this._mesh(new THREE.SphereGeometry(0.14, 16, 12), m.body, this.head);
    for (const side of [-1, 1]) {
      this._mesh(new THREE.SphereGeometry(0.055, 10, 8), m.eye, this.head, side * 0.105, 0.03, -0.07);
      this._mesh(new THREE.SphereGeometry(0.03, 8, 6), m.pupil, this.head, side * 0.14, 0.03, -0.085);
    }
    const base = this._mesh(new THREE.ConeGeometry(0.07, 0.24, 10), m.beak, this.head, 0, -0.03, -0.2);
    base.rotation.x = -Math.PI / 2;
    const tip = this._mesh(new THREE.ConeGeometry(0.05, 0.14, 10), m.tip, this.head, 0, -0.075, -0.34);
    tip.rotation.x = -Math.PI / 2 - 0.8;
  }

  _buildWings() {
    const m = this.m;
    const trim = this._geo(new THREE.ExtrudeGeometry(wingShape(0), { depth: 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2));
    const main = this._geo(new THREE.ExtrudeGeometry(wingShape(0.14), { depth: 0.03, bevelEnabled: false }).rotateX(-Math.PI / 2));
    this.wings = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
      const inner = new THREE.Group();
      inner.scale.x = side; // mirror the left wing
      const t = new THREE.Mesh(trim, m.wingEdge);
      const w = new THREE.Mesh(main, m.wing);
      w.position.set(0.01, 0.012, 0.01);
      inner.add(t, w);
      pivot.add(inner);
      this.body.add(pivot);
      this.wings.push(pivot);
    }
  }

  _buildLegs() {
    const m = this.m;
    const legGeo = this._geo(new THREE.CylinderGeometry(0.035, 0.03, LEG_LENGTH, 8));
    const heel = [
      new THREE.BoxGeometry(0.26, 0.09, 0.4).translate(0, 0.045, -0.02),
      new THREE.BoxGeometry(0.075, 0.2, 0.075).translate(0, 0.1, 0.15),
    ];
    const shoeGeo = this._geo(mergeGeometries(heel));
    const soleGeo = this._geo(new THREE.BoxGeometry(0.255, 0.02, 0.395).translate(0, 0.01, -0.02));
    const puffs = [[-0.07, 0.05, 0], [0.07, 0.05, 0], [0, 0.07, -0.08]].map(([x, y, z]) => new THREE.SphereGeometry(0.085, 8, 6).translate(x, y, z));
    const furGeo = this._geo(mergeGeometries(puffs));
    const ringGeo = this._geo(new THREE.TorusGeometry(0.055, 0.015, 6, 12).rotateX(Math.PI / 2));

    this.legs = [];
    this.shoes = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.16, HIP_Y, 0.04);
      this._mesh(legGeo, m.body, pivot, 0, -LEG_LENGTH / 2, 0);
      this._mesh(ringGeo, m.gold, pivot, 0, -LEG_LENGTH + 0.06, 0);
      const shoe = new THREE.Group();
      shoe.position.y = -LEG_LENGTH - 0.02;
      const s = new THREE.Mesh(shoeGeo, m.shoe);
      const sole = new THREE.Mesh(soleGeo, m.sole);
      const fur = new THREE.Mesh(furGeo, m.fur);
      fur.position.set(0, 0.1, -0.1);
      shoe.add(s, sole, fur);
      pivot.add(shoe);
      this.body.add(pivot);
      this.legs.push(pivot);
      this.shoes.push(shoe);
    }
  }

  /**
   * @param runPhase  run-cycle radians
   * @param state     PlayerState
   * @param lateral   x error (targetX - x) for roll
   */
  update(dt, runPhase, state, lateral) {
    const p = this.cfg.player;
    const k = p.poseDamping;
    this.t += dt;
    const swing = Math.sin(runPhase);
    let leg0 = swing * 0.9;
    let leg1 = -swing * 0.9;
    let fold = 1.38 + Math.sin(runPhase * 2) * 0.06; // wing angle: 1.2 hangs down, 0 is spread flat
    let lean = p.runLean;
    let bob = Math.abs(Math.cos(runPhase)) * p.bobHeight;
    let scaleTarget = 1;
    let neckBob = Math.sin(runPhase * 2) * 0.05;

    if (state === PlayerState.JUMPING) {
      leg0 = 0.75;
      leg1 = 0.45;
      fold = 0.15 + Math.sin(this.t * 14) * 0.22; // flapping
      lean = -0.08;
      bob = 0;
      neckBob = -0.12;
    } else if (state === PlayerState.DEAD) {
      leg0 = 0.5;
      leg1 = -0.5;
      fold = 0.1;
      lean = p.deadLean;
      bob = 0;
      neckBob = 0.3;
    } else if (state === PlayerState.SLIDING) {
      leg0 = 0.9;
      leg1 = -0.5;
      fold = 0.3;
      lean = this.cfg.slide.slideLean;
      bob = 0;
      scaleTarget = this.cfg.slide.slideHeightScale;
      neckBob = -0.2;
    }

    for (let i = 0; i < 2; i++) {
      const target = i === 0 ? leg0 : leg1;
      this.legs[i].rotation.x = damp(this.legs[i].rotation.x, target, k, dt);
      this.shoes[i].rotation.x = -this.legs[i].rotation.x * 0.6; // keep the heels roughly level
    }
    // right wing (+x) tilts clockwise, left counter-clockwise
    this.wings[0].rotation.z = damp(this.wings[0].rotation.z, -fold, k, dt);
    this.wings[1].rotation.z = damp(this.wings[1].rotation.z, fold, k, dt);
    this.neck.rotation.x = damp(this.neck.rotation.x, neckBob, k, dt);
    this.body.position.y = damp(this.body.position.y, bob, k, dt);
    this.root.rotation.x = damp(this.root.rotation.x, lean, k, dt);
    this.root.rotation.z = damp(this.root.rotation.z, -lateral * p.laneLean, k, dt);
    this.scaleY = damp(this.scaleY, scaleTarget, this.cfg.slide.squashDamping, dt);
    this.root.scale.y = this.scaleY;
  }

  reset() {
    this.root.rotation.set(0, 0, 0);
    this.root.scale.set(1, 1, 1);
    this.body.position.y = 0;
    this.scaleY = 1;
    this.wings.forEach((w, i) => (w.rotation.z = i === 0 ? -1.38 : 1.38));
  }

  dispose() {
    disposeObject(this.root);
    this.geos.forEach((g) => g.dispose());
  }
}
