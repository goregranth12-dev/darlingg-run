import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const color = new THREE.Color();

function paint(geometry, hex) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  color.setHex(hex);
  for (let i = 0; i < n; i++) color.toArray(colors, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/**
 * A chunky handheld fan standing upright, facing +Z, 1 unit tall (scale it).
 * Vertex-coloured so one draw call per colourway. Base on y=0, centred on x/z=0.
 */
export function buildFanGeometry(palette, dark, thickness) {
  const T = thickness;
  const HY = 0.78; // head centre height
  const R = 0.22; // head radius
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));

  add(new THREE.CylinderGeometry(R, R, T, 20).rotateX(Math.PI / 2).translate(0, HY, 0), palette.body);
  add(new THREE.TorusGeometry(R * 0.93, 0.025, 5, 20).translate(0, HY, T / 2), palette.ring);
  add(new THREE.CylinderGeometry(R * 0.84, R * 0.84, 0.02, 20).rotateX(Math.PI / 2).translate(0, HY, T / 2 + 0.004), dark);
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 3; // top, bottom + four diagonals
    const len = R * 0.84 - 0.08;
    const mid = 0.08 + len / 2;
    add(
      new THREE.BoxGeometry(0.02, len, 0.03)
        .rotateZ(a - Math.PI / 2)
        .translate(Math.cos(a) * mid, HY + Math.sin(a) * mid, T / 2 + 0.012),
      palette.spoke,
    );
  }
  add(new RoundedBoxGeometry(0.235, 0.235, 0.05, 2, 0.06).translate(0, HY, T / 2 + 0.01), palette.spoke);
  add(new RoundedBoxGeometry(0.2, 0.2, 0.07, 2, 0.05).translate(0, HY, T / 2 + 0.03), palette.hub);
  add(new RoundedBoxGeometry(0.31, 0.62, T, 3, 0.06).translate(0, 0.31, 0), palette.body);
  add(new RoundedBoxGeometry(0.105, 0.105, 0.03, 2, 0.03).translate(0, 0.33, T / 2 + 0.002), palette.spoke);
  add(new RoundedBoxGeometry(0.075, 0.075, 0.04, 2, 0.025).translate(0, 0.33, T / 2 + 0.012), palette.hub);
  add(new THREE.BoxGeometry(0.5, 0.04, 0.34).translate(0, 0.02, 0), palette.ring);

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}
