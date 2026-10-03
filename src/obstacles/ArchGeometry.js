import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../utils/rng.js';
import { paint, ellipsoid } from '../utils/geometry.js';

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

// The pink "Darlingg" flower arch used as the slide-under obstacle. Built in real units
// (base on y=0, centred on x/z, the decorated face towards +Z).

/** Extruded inverted-U arch body: two posts, a rounded top and a low opening. */
export function buildArchBody(a) {
  const hw = a.width / 2;
  const hi = hw - a.post;
  const r = Math.min(a.corner, hi);
  const s = new THREE.Shape();
  s.moveTo(-hw, 0);
  s.lineTo(-hi, 0);
  s.lineTo(-hi, a.clearance - r);
  s.absarc(-hi + r, a.clearance - r, r, Math.PI, Math.PI / 2, true);
  s.lineTo(hi - r, a.clearance);
  s.absarc(hi - r, a.clearance - r, r, Math.PI / 2, 0, true);
  s.lineTo(hi, 0);
  s.lineTo(hw, 0);
  s.lineTo(hw, a.height - hw);
  s.absarc(0, a.height - hw, hw, 0, Math.PI, false);
  s.lineTo(-hw, 0);
  return new THREE.ExtrudeGeometry(s, {
    depth: a.depth,
    bevelEnabled: true,
    bevelThickness: a.bevel,
    bevelSize: a.bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 14,
  }).translate(0, 0, -a.depth / 2);
}

/** Gold script "Darlingg" on a transparent plane, placed on the arch face above the opening. */
export function buildArchText(a, pal) {
  const w = a.width * 0.86;
  const h = w * 0.3;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = Math.round(640 * 0.3);
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const family = "'Brush Script MT', 'Snell Roundhand', 'Apple Chancery', Georgia, 'Times New Roman', serif";
  let size = Math.round(canvas.height * 0.82);
  ctx.font = `italic 700 ${size}px ${family}`;
  const fit = (canvas.width * 0.92) / ctx.measureText('Darlingg').width; // whatever font loads, keep it inside the plane
  if (fit < 1) {
    size = Math.floor(size * fit);
    ctx.font = `italic 700 ${size}px ${family}`;
  }
  const x = canvas.width / 2;
  const y = canvas.height * 0.52;
  ctx.fillStyle = css(pal.textShade);
  ctx.fillText('Darlingg', x + 4, y + 5);
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#fff2c8');
  g.addColorStop(0.5, css(pal.text));
  g.addColorStop(1, css(pal.textShade));
  ctx.fillStyle = g;
  ctx.fillText('Darlingg', x, y);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(w, h).translate(0, a.clearance + (a.height - a.clearance) * 0.42, a.depth / 2 + a.bevel + 0.012);
  return { geo, map };
}

/** Clusters of roses, hydrangeas, leaves and baby's-breath on the posts and shoulders. */
export function buildArchFlowers(a, pal, seed) {
  const rng = new Rng(seed + 31);
  const front = a.depth / 2 + a.bevel;
  const hw = a.width / 2;
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));
  const clusters = [
    [-hw + a.post * 0.45, a.height - 1.25, 1.0],
    [-hw + a.post * 0.45, 0.95, 1.15],
    [hw - a.post * 0.45, a.height - 1.6, 0.95],
    [hw - a.post * 0.45, 0.7, 0.9],
  ];
  for (const [cx, cy, k] of clusters) {
    for (let i = 0; i < 7; i++) {
      const x = cx + rng.range(-0.28, 0.28) * k;
      const y = cy + rng.range(-0.5, 0.5) * k;
      const r = rng.range(0.12, 0.2) * k;
      const z = front + r * 0.55;
      if (i % 3 === 0) {
        add(ellipsoid(r * 1.1, r * 1.1, r * 0.7, x, y, z, 8), rng.pick(pal.rose));
        add(new THREE.TorusGeometry(r * 0.55, r * 0.22, 5, 10).translate(x, y, z + r * 0.45), rng.pick(pal.rose));
      } else {
        add(ellipsoid(r, r, r * 0.85, x, y, z, 7), rng.pick(pal.hydrangea));
      }
    }
    for (let i = 0; i < 3; i++) {
      add(ellipsoid(0.1 * k, 0.04 * k, 0.02, cx + rng.range(-0.35, 0.35) * k, cy + rng.range(-0.55, 0.55) * k, front + 0.03, 6, rng.range(-1, 1)), pal.leaf);
    }
    for (let i = 0; i < 14; i++) {
      add(ellipsoid(0.028, 0.028, 0.028, cx + rng.range(-0.4, 0.4) * k, cy + rng.range(-0.65, 0.65) * k, front + rng.range(0.05, 0.16), 4), pal.gyp);
    }
  }
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}
