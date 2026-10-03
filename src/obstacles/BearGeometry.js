import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paint, ellipsoid } from '../utils/geometry.js';

/**
 * A puffy leather bear charm with a gold ring on top, facing +Z, 1 unit tall
 * (scale it). Base on y=0, centred on x/z=0, vertex-coloured (one draw call).
 */
export function buildBearGeometry(p) {
  const T = 0.2; // puffiness (z depth)
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));

  add(ellipsoid(0.1, 0.13, T * 0.5, -0.1, 0.12, 0), p.leather); // legs
  add(ellipsoid(0.1, 0.13, T * 0.5, 0.1, 0.12, 0), p.leather);
  add(ellipsoid(0.17, 0.2, T * 0.5, 0, 0.34, 0), p.leather); // body
  add(ellipsoid(0.12, 0.06, T * 0.4, -0.27, 0.42, 0), p.leather); // arms
  add(ellipsoid(0.12, 0.06, T * 0.4, 0.27, 0.42, 0), p.leather);
  add(new RoundedBoxGeometry(0.42, 0.34, T * 1.1, 3, 0.1).translate(0, 0.66, 0), p.leather); // head
  add(ellipsoid(0.08, 0.08, T * 0.3, -0.19, 0.82, 0), p.leather); // ears
  add(ellipsoid(0.08, 0.08, T * 0.3, 0.19, 0.82, 0), p.leather);
  add(new RoundedBoxGeometry(0.12, 0.14, 0.03, 2, 0.02).translate(0, 0.62, T * 0.56), p.snout);
  add(new THREE.ConeGeometry(0.035, 0.04, 3).rotateZ(Math.PI).translate(0, 0.655, T * 0.58), p.dark); // nose
  add(ellipsoid(0.02, 0.02, 0.02, -0.075, 0.71, T * 0.56, 8), p.dark); // eyes
  add(ellipsoid(0.02, 0.02, 0.02, 0.075, 0.71, T * 0.56, 8), p.dark);
  add(new RoundedBoxGeometry(0.05, 0.08, 0.03, 2, 0.01).translate(0, 0.87, 0), p.leather); // strap
  add(new THREE.TorusGeometry(0.07, 0.014, 6, 18).translate(0, 0.93, 0), p.gold); // ring

  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}
