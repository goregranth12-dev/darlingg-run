import * as THREE from 'three';
import { Rng } from '../utils/rng.js';
import { clamp, lerp } from '../utils/math.js';

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

// Pink fur road: Voronoi "giraffe" patches in two pinks with fuzzy beige seams,
// raised-looking light-pink lane dashes and pink edge rails. Tiles along the road.
export function makeRoadTexture(config, lanes, anisotropy) {
  const { world, visual } = config;
  const v = visual.road;
  const ppu = world.roadTexturePxPerUnit;
  const w = Math.round(lanes.roadWidth * ppu);
  const h = Math.round(world.chunkLength * ppu);
  const rng = new Rng(world.seed + 99);

  // seed points, repeated one tile above and below so the pattern tiles in z
  const pts = [];
  for (let i = 0; i < world.roadCells; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    for (const off of [-h, 0, h]) pts.push(x, y + off);
  }
  const radius = Math.sqrt((w * h) / world.roadCells) * 0.6;
  const pink = rgb(v.pink);
  const dark = rgb(v.pinkDark);
  const light = rgb(v.pinkLight);
  const beige = rgb(v.beige);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const seam = world.roadSeamWidth;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let d1 = 1e9;
      let d2 = 1e9;
      for (let i = 0; i < pts.length; i += 2) {
        const dx = x - pts[i];
        const dy = y - pts[i + 1];
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      d1 = Math.sqrt(d1);
      d2 = Math.sqrt(d2);
      const noise = rng.next() - 0.5;
      const edge = (d2 - d1) * 0.5 + noise * seam * 1.2; // ~distance to the seam
      const beigeAmt = clamp(1 - edge / seam, 0, 1);
      const t = clamp(d1 / radius, 0, 1);
      const shade = noise * 0.22;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const base = t < 0.5 ? lerp(dark[c], pink[c], t * 2) : lerp(pink[c], light[c], (t - 0.5) * 2);
        const fur = base * (1 + shade);
        img.data[o + c] = clamp(lerp(fur, beige[c] * (1 + shade * 0.5), beigeAmt), 0, 255);
      }
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // fur: short strokes mostly along the road
  ctx.lineWidth = 1;
  for (let i = 0; i < world.roadHairs; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const a = Math.PI / 2 + rng.range(-0.9, 0.9);
    const len = rng.range(3, 8);
    ctx.strokeStyle = rng.next() < 0.5 ? 'rgba(255,236,214,0.28)' : 'rgba(190,50,100,0.22)';
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
