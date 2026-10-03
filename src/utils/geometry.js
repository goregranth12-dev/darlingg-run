import * as THREE from 'three';

const color = new THREE.Color();

/** Returns a non-indexed copy of the geometry with a flat vertex colour (for merging). */
export function paint(geometry, hex) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  color.setHex(hex);
  for (let i = 0; i < n; i++) color.toArray(colors, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Ellipsoid centred at (x, y, z) with the given radii. */
export function ellipsoid(rx, ry, rz, x, y, z, segments = 14) {
  return new THREE.SphereGeometry(1, segments, Math.max(6, segments - 4)).scale(rx, ry, rz).translate(x, y, z);
}
