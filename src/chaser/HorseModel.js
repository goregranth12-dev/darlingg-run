import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paint, ellipsoid } from '../utils/geometry.js';
import { disposeObject } from '../utils/dispose.js';

const ARC_RADIUS = 1.3; // rocker arc; the whole horse pivots about the arc centre

function rocker(x, silver) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const phi = -0.6 + (1.2 * i) / 12;
    pts.push(new THREE.Vector3(x, ARC_RADIUS - ARC_RADIUS * Math.cos(phi) + 0.03, ARC_RADIUS * Math.sin(phi)));
  }
  return paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.05, 8, false), silver);
}

/** Brown rocking-horse unicorn with silver horn, mane, saddle studs and rockers (faces -Z). */
export function buildHorseGeometry(p) {
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));
  const B = p.body;
  const S = p.silver;

  add(ellipsoid(0.25, 0.25, 0.52, 0, 0.64, 0.02, 16), B); // body
  add(ellipsoid(0.17, 0.3, 0.19, 0, 1.0, -0.4, 14, -0.5), B); // neck
  add(ellipsoid(0.18, 0.2, 0.32, 0, 1.27, -0.66, 14, -0.25), B); // head
  add(ellipsoid(0.045, 0.09, 0.035, -0.1, 1.46, -0.52, 8), B); // ears
  add(ellipsoid(0.045, 0.09, 0.035, 0.1, 1.46, -0.52, 8), B);
  add(new THREE.ConeGeometry(0.05, 0.34, 10).rotateX(-0.45).translate(0, 1.6, -0.68), S); // horn
  add(ellipsoid(0.03, 0.03, 0.03, -0.155, 1.3, -0.74, 8), p.dark); // eyes
  add(ellipsoid(0.03, 0.03, 0.03, 0.155, 1.3, -0.74, 8), p.dark);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    add(ellipsoid(0.1 - t * 0.02, 0.055, 0.06, 0, 1.42 - t * 0.5, -0.5 + t * 0.3, 8), S); // mane discs
  }
  add(ellipsoid(0.12, 0.2, 0.12, 0, 0.85, 0.58, 12, 0.6), B); // tail
  for (const [lx, lz, tilt] of [[-0.16, -0.32, -0.12], [0.16, -0.32, -0.12], [-0.16, 0.34, 0.12], [0.16, 0.34, 0.12]]) {
    add(ellipsoid(0.1, 0.22, 0.11, lx, 0.27, lz, 10, tilt), B); // stubby legs
  }
  add(new RoundedBoxGeometry(0.36, 0.05, 0.4, 2, 0.02).translate(0, 0.9, 0.06), S); // saddle
  for (let i = 0; i < 9; i++) {
    add(ellipsoid(0.028, 0.028, 0.028, -0.1 + (i % 3) * 0.1, 0.94, -0.06 + Math.floor(i / 3) * 0.12, 6), p.stones);
  }
  add(rocker(-0.2, S), S);
  add(rocker(0.2, S), S);

  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

// The horse as a Group: `rock` pivots about the rocker arc centre so the gallop is a
// rolling rock; `root` is what the chaser positions in the world.
export class HorseModel {
  constructor(config) {
    this.cfg = config.horse;
    this.geometry = buildHorseGeometry(config.visual.horse);
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.22 });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.y = -ARC_RADIUS;
    mesh.castShadow = true;
    this.rock = new THREE.Group();
    this.rock.position.y = ARC_RADIUS;
    this.rock.add(mesh);
    this.root = new THREE.Group();
    this.root.add(this.rock);
    this.root.scale.setScalar(this.cfg.scale);
    this.root.visible = false;
    this.phase = 0;
  }

  /** Advance the gallop; `intensity` scales how hard it rocks (0 = standing). */
  animate(dt, intensity) {
    this.phase += dt * this.cfg.gallopRate * (0.6 + 0.4 * intensity);
    this.rock.rotation.x = Math.sin(this.phase) * this.cfg.rockAmount * intensity;
    this.rock.position.y = ARC_RADIUS + Math.abs(Math.sin(this.phase * 0.5)) * this.cfg.bobHeight * intensity;
  }

  dispose() {
    disposeObject(this.root);
  }
}
