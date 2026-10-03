import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../utils/rng.js';
import { paint } from '../utils/geometry.js';

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

function sector(r, a0, a1) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
  s.absarc(0, 0, r, a0, a1, false);
  s.lineTo(0, 0);
  return s;
}

function canopyTexture(pal, seed, anisotropy) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = css(pal.fanBase);
  ctx.fillRect(0, 0, w, h);
  const rng = new Rng(seed + 5);
  ctx.fillStyle = css(pal.fanSpot);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5 + (j % 2) * 0.5 + rng.range(-0.15, 0.15)) * (w / 5.5);
      const y = (j + 0.5 + rng.range(-0.15, 0.15)) * (h / 4);
      const r = rng.range(26, 36);
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const rr = r * rng.range(0.8, 1.15);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

/**
 * The pink hand-fan "tree": a wrapped wooden handle with a gold knob, a wooden guard and a
 * big cheetah-pattern pink fan on top. Base on y=0, the fan faces +Z.
 * Returns { body (vertex-coloured), canopy (textured), texture }.
 */
export function buildFanTree(c, pal, seed, anisotropy) {
  const H = c.trunkHeight;
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));

  add(new THREE.CylinderGeometry(0.1, 0.15, H, 8).translate(0, H / 2, 0), pal.trunk);
  add(new THREE.CylinderGeometry(0.24, 0.36, 0.3, 8).translate(0, 0.15, 0), pal.trunk);
  const helix = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const a = t * Math.PI * 2 * 3;
    const r = 0.17 - t * 0.04;
    helix.push(new THREE.Vector3(Math.cos(a) * r, 0.5 + t * H * 0.72, Math.sin(a) * r));
  }
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 72, 0.032, 5, false), pal.trunkWrap);
  add(new THREE.IcosahedronGeometry(0.11, 0).translate(0, H + 0.02, 0.02), pal.knob);
  const guard = new THREE.ExtrudeGeometry(sector(c.fanRadius * 0.5, c.fanFrom, c.fanTo), { depth: c.fanThickness * 1.6, bevelEnabled: false });
  add(guard.translate(0, H, 0.03), pal.rib);
  const body = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());

  const R = c.fanRadius;
  const canopy = new THREE.ExtrudeGeometry(sector(R, c.fanFrom, c.fanTo), { depth: c.fanThickness, bevelEnabled: false }).translate(0, H, -0.04);
  const texture = canopyTexture(pal, seed, anisotropy);
  texture.repeat.set(1 / (2 * R), 1 / R); // cap UVs are the sector's x/y in world units
  texture.offset.set(0.5, 0);
  return { body, canopy, texture };
}

function chamferShape(w, h, ch) {
  const x = w / 2;
  const y = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-x + ch, -y);
  s.lineTo(x - ch, -y);
  s.lineTo(x, -y + ch);
  s.lineTo(x, y - ch);
  s.lineTo(x - ch, y);
  s.lineTo(-x + ch, y);
  s.lineTo(-x, y - ch);
  s.lineTo(-x, -y + ch);
  s.closePath();
  return s;
}

function signTexture(c, pal, anisotropy) {
  const w = c.texturePx;
  const h = Math.round((w * c.height) / c.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = css(pal.signBoard);
  ctx.fillRect(0, 0, w, h);
  // black chamfered border
  const m = w * 0.035;
  const ch = w * 0.04;
  ctx.strokeStyle = css(pal.signInk);
  ctx.lineWidth = w * 0.014;
  ctx.beginPath();
  ctx.moveTo(m + ch, m);
  ctx.lineTo(w - m - ch, m);
  ctx.lineTo(w - m, m + ch);
  ctx.lineTo(w - m, h - m - ch);
  ctx.lineTo(w - m - ch, h - m);
  ctx.lineTo(m + ch, h - m);
  ctx.lineTo(m, h - m - ch);
  ctx.lineTo(m, m + ch);
  ctx.closePath();
  ctx.stroke();
  // bolts
  for (const fy of [0.14, 0.86]) {
    ctx.fillStyle = css(pal.bolt);
    ctx.beginPath();
    ctx.arc(w / 2, h * fy, w * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  // lettering, shrunk to fit
  const family = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
  let size = Math.round(h * 0.34);
  ctx.font = `800 ${size}px ${family}`;
  const fit = (w * 0.84) / ctx.measureText(c.text).width;
  size = Math.floor(size * Math.min(1, fit));
  ctx.font = `800 ${size}px ${family}`;
  ctx.fillStyle = css(pal.signInk);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.text, w / 2, h * 0.52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.repeat.set(1 / c.width, 1 / c.height);
  tex.offset.set(0.5, 0.5);
  return tex;
}

/**
 * The yellow "made to be noticed" signboard on a dark post. Base on y=0, the board faces +Z.
 * Returns { board (extruded, cap + edge materials), post (vertex-coloured), texture }.
 */
export function buildSign(c, pal, anisotropy) {
  const board = new THREE.ExtrudeGeometry(chamferShape(c.width, c.height, c.chamfer), { depth: c.depth, bevelEnabled: false })
    .translate(0, c.postHeight + c.height / 2, -c.depth / 2);
  const parts = [];
  const add = (geo, hex) => parts.push(paint(geo, hex));
  add(new THREE.BoxGeometry(c.postWidth, c.postHeight, c.postWidth).translate(0, c.postHeight / 2, 0), pal.post);
  add(new THREE.CylinderGeometry(0.2, 0.36, 0.3, 6).translate(0, 0.15, 0), pal.postBase);
  const post = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return { board, post, texture: signTexture(c, pal, anisotropy) };
}
