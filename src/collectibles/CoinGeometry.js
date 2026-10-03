import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function ring(cx, cy, rx, ry, irx, iry) {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(cx, cy, irx, iry, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

// One script "g": upper bowl, lower loop, joining stem and a small ear.
function glyph(ox, oy, k) {
  const shapes = [ring(ox, oy + 0.28 * k, 0.26 * k, 0.22 * k, 0.14 * k, 0.1 * k), ring(ox, oy - 0.22 * k, 0.32 * k, 0.2 * k, 0.18 * k, 0.085 * k)];
  const stem = new THREE.Shape();
  const x = ox + 0.16 * k;
  stem.moveTo(x, oy - 0.08 * k);
  stem.lineTo(x + 0.1 * k, oy - 0.08 * k);
  stem.lineTo(x + 0.1 * k, oy + 0.32 * k);
  stem.lineTo(x, oy + 0.32 * k);
  shapes.push(stem);
  const ear = new THREE.Shape();
  ear.moveTo(ox + 0.2 * k, oy + 0.42 * k);
  ear.quadraticCurveTo(ox + 0.34 * k, oy + 0.56 * k, ox + 0.46 * k, oy + 0.5 * k);
  ear.lineTo(ox + 0.3 * k, oy + 0.4 * k);
  shapes.push(ear);
  return shapes;
}

/**
 * The "gg" monogram as a thin extruded, bevelled medallion, centred on the origin and
 * facing +Z. `size` is the overall width.
 */
export function buildCoinGeometry(size, thickness) {
  const shapes = [...glyph(-0.2, -0.02, 1), ...glyph(0.14, 0.05, 1.06)];
  const parts = shapes.map((shape) =>
    new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: thickness * 0.2,
      bevelSize: 0.012,
      bevelSegments: 1,
      curveSegments: 10,
    }),
  );
  const geo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const c = box.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z);
  const s = size / (box.max.x - box.min.x);
  geo.scale(s, s, s);
  return geo;
}
