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

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0.25, 0.25);
  s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  s.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  return s;
}

/** Puffy glossy heart centred on (x, y), facing +Z, about `size` tall. */
function heart(x, y, z, size) {
  const g = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.1, bevelSegments: 2, curveSegments: 8 });
  g.translate(-0.25, -0.47, -0.11);
  g.scale(size, size, size);
  return g.translate(x, y, z);
}

/** Small ribbon bow: two loops, a knot and two tails. */
function bow(add, x, y, z, k, hex) {
  const blob = (rx, ry, rz, dx, dy, dz, roll) =>
    new THREE.SphereGeometry(1, 8, 6).scale(rx * k, ry * k, rz * k).rotateZ(roll).translate(x + dx * k, y + dy * k, z + dz);
  for (const side of [-1, 1]) {
    add(blob(0.1, 0.065, 0.04, side * 0.1, 0.02, 0, side * 0.4), hex); // loops
    add(blob(0.03, 0.1, 0.025, side * 0.05, -0.1, 0, side * -0.35), hex); // tails
  }
  add(blob(0.045, 0.045, 0.045, 0, 0, 0.02, 0), hex); // knot
}

/**
 * Pearls, puffy hearts, ribbon bows and tiny beads stacked up the posts and over the
 * shoulders, like the reference arch. Vertex-coloured, deterministic from the seed.
 */
export function buildArchFlowers(a, pal, seed) {
  const rng = new Rng(seed + 31);
  const front = a.depth / 2 + a.bevel;
  const hw = a.width / 2;
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));

  const column = (side, y0, y1) => {
    for (let y = y0; y < y1; y += rng.range(0.3, 0.46)) {
      const x = side * (hw - a.post * 0.5) + rng.range(-0.14, 0.14) + side * 0.04;
      const roll = rng.next();
      if (roll < 0.5) {
        const r = rng.range(0.13, 0.22);
        add(ellipsoid(r, r, r, x, y, front + r * 0.6, 12), rng.pick(pal.pearls));
      } else if (roll < 0.72) {
        parts.push(paint(heart(x, y, front + 0.06, rng.range(0.34, 0.46)), rng.pick(pal.hearts)));
      } else if (roll < 0.84) {
        bow(add, x, y, front + 0.04, rng.range(0.9, 1.2), pal.bow);
      } else {
        for (let i = 0; i < 3; i++) add(ellipsoid(0.05, 0.05, 0.05, x + rng.range(-0.15, 0.15), y + rng.range(-0.12, 0.12), front + 0.05, 8), rng.pick(pal.beads));
      }
    }
  };
  column(-1, 0.25, a.height - 1.3);
  column(1, 0.25, a.height - 1.7);
  // shoulders: a little crown of pearls and hearts either side of the lettering
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI * (0.08 + i * 0.1) * (side < 0 ? -1 : 1) + (side < 0 ? Math.PI : 0);
      const x = Math.cos(ang) * (hw - 0.12);
      const y = a.height - hw + Math.sin(ang) * (hw - 0.12);
      if (i % 2 === 0) add(ellipsoid(0.16, 0.16, 0.16, x, y, front + 0.1, 12), rng.pick(pal.pearls));
      else parts.push(paint(heart(x, y, front + 0.06, 0.38), rng.pick(pal.hearts)));
    }
  }
  for (let i = 0; i < 26; i++) {
    const side = rng.next() < 0.5 ? -1 : 1;
    add(ellipsoid(0.035, 0.035, 0.035, side * (hw - 0.1) + rng.range(-0.18, 0.18), rng.range(0.15, a.height - 0.6), front + 0.04, 6), rng.pick(pal.beads));
  }
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}
