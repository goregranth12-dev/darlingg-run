import * as THREE from 'three';
import { Rng } from '../utils/rng.js';

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

const rgba = (hex, a) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`;

// Soft round blob (radial gradient) used to build fuzzy fur spots.
function blob(ctx, x, y, r, hex, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, alpha));
  g.addColorStop(0.65, rgba(hex, alpha * 0.9));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// One cheetah/leopard rosette: a ring of dark-pink lobes around a lighter pink core.
function rosette(ctx, x, y, r, rng, v) {
  const lobes = rng.int(5, 7);
  const spin = rng.range(0, Math.PI * 2);
  for (let i = 0; i < lobes; i++) {
    const a = spin + (i / lobes) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const d = r * rng.range(0.5, 0.65);
    blob(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, r * rng.range(0.34, 0.46), v.pinkDark, 0.95);
  }
  blob(ctx, x, y, r * 0.5, v.pink, 0.9);
}

// Cheetah-skin road: beige fur with pink rosettes and dots, light-pink lane dashes and
// pink edge rails. Tiles along the road (spots are drawn again one tile up/down).
export function makeRoadTexture(config, lanes, anisotropy) {
  const { world, visual } = config;
  const v = visual.road;
  const ppu = world.roadTexturePxPerUnit;
  const w = Math.round(lanes.roadWidth * ppu);
  const h = Math.round(world.chunkLength * ppu);
  const rng = new Rng(world.seed + 99);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = css(v.beige);
  ctx.fillRect(0, 0, w, h);
  // soft tonal variation so the beige is not flat
  for (let i = 0; i < 90; i++) blob(ctx, rng.range(0, w), rng.range(0, h), rng.range(30, 90), rng.next() < 0.5 ? v.beigeDark : v.pinkLight, 0.16);

  // jittered grid of rosettes (+ small dots in the gaps)
  const spacing = world.roadSpotSpacing * ppu;
  const cols = Math.max(1, Math.round(w / spacing));
  const rows = Math.max(1, Math.round(h / spacing));
  const cw = w / cols;
  const ch = h / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5 + (j % 2) * 0.5 + rng.range(-0.3, 0.3)) * cw;
      const y = (j + 0.5 + rng.range(-0.3, 0.3)) * ch;
      const r = world.roadSpotRadius * ppu * rng.range(0.7, 1.15);
      for (const off of [-h, 0, h]) {
        rosette(ctx, x, y + off, r, rng, v);
        rosette(ctx, x - w, y + off, r, rng, v); // keeps spots crossing the left edge whole
      }
      for (let k = 0; k < 2; k++) {
        const dx = (rng.next() - 0.5) * cw * 0.9 + cw * 0.5;
        const dy = (rng.next() - 0.5) * ch * 0.9 + ch * 0.5;
        for (const off of [-h, 0, h]) blob(ctx, i * cw + dx, j * ch + dy + off, r * 0.22, v.pinkDark, 0.9);
      }
    }
  }

  // fur: short strokes mostly along the road
  ctx.lineWidth = 1;
  for (let i = 0; i < world.roadHairs; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const a = Math.PI / 2 + rng.range(-0.9, 0.9);
    const len = rng.range(3, 8);
    ctx.strokeStyle = rng.next() < 0.5 ? 'rgba(255,248,236,0.3)' : 'rgba(176,60,108,0.2)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // lane dashes with a soft drop shadow
  const lw = world.roadLineWidth * ppu;
  const period = (world.roadDash + world.roadDashGap) * ppu;
  const dashLen = world.roadDash * ppu;
  for (let l = 1; l < lanes.count; l++) {
    const x = l * lanes.width * ppu - lw / 2;
    for (let y = period / 2 - dashLen / 2; y < h; y += period) {
      ctx.fillStyle = css(v.dashShadow);
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 3, lw, dashLen, lw / 2);
      ctx.fill();
      ctx.fillStyle = css(v.dash);
      ctx.beginPath();
      ctx.roundRect(x, y, lw, dashLen, lw / 2);
      ctx.fill();
    }
  }

  // edge rails
  const rail = world.roadRailWidth * ppu;
  for (const x of [0, w - rail]) {
    ctx.fillStyle = css(v.rail);
    ctx.fillRect(x, 0, rail, h);
    ctx.fillStyle = css(v.railLight);
    ctx.fillRect(x + (x === 0 ? rail * 0.55 : rail * 0.15), 0, rail * 0.25, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}
