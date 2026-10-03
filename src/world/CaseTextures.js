import * as THREE from 'three';
import { Rng } from '../utils/rng.js';
import { circle, css, cameraPlate } from './CaseDraw.js';
import { drawCheetah, drawCharm } from './CasePatterns.js';

function lemon(ctx, x, y, len, angle, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.bezierCurveTo(-len * 0.45, -len * 0.42, len * 0.3, -len * 0.45, len / 2, 0);
  ctx.bezierCurveTo(len * 0.3, len * 0.45, -len * 0.45, len * 0.42, -len / 2, 0);
  ctx.fill();
  ctx.restore();
}

function leaf(ctx, x, y, len, angle, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(0, -len * 0.3, len / 2, 0);
  ctx.quadraticCurveTo(0, len * 0.3, -len / 2, 0);
  ctx.fill();
  ctx.restore();
}

function drawLemon(ctx, w, h, c, seed) {
  ctx.fillStyle = css(c.base);
  ctx.fillRect(0, 0, w, h);
  const rng = new Rng(seed);
  for (let i = 0; i < 13; i++) {
    const x = rng.range(0.05, 0.95) * w;
    const y = rng.range(0.22, 1.0) * h;
    const a = rng.range(-0.7, 0.7);
    if (rng.next() < 0.6) lemon(ctx, x, y, w * rng.range(0.4, 0.62), a, css(c.fruit));
    else leaf(ctx, x, y, w * rng.range(0.28, 0.4), a + 0.5, css(c.fruit));
  }
  cameraPlate(ctx, w, h, c);
  ctx.fillStyle = css(c.text);
  ctx.font = `italic 600 ${Math.round(w * 0.11)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Darlingg', w * 0.5, h * 0.93);
}

function drawStripes(ctx, w, h, c) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = css(i % 2 === 0 ? c.a : c.b);
    ctx.fillRect((i * w) / n, 0, w / n + 1, h);
  }
  cameraPlate(ctx, w, h, c);
}

function drawCherry(ctx, w, h, c) {
  const n = 6;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = css(i % 2 === 0 ? c.a : c.b);
    ctx.fillRect((i * w) / n, 0, w / n + 1, h);
  }
  cameraPlate(ctx, w, h, c);
  ctx.save();
  ctx.translate(w * 0.12, h * 0.25); // stickers sit below the camera plate
  ctx.scale(0.76, 0.76);
  // stem
  ctx.strokeStyle = css(c.stem);
  ctx.lineWidth = w * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.53, h * 0.62);
  ctx.bezierCurveTo(w * 0.6, h * 0.48, w * 0.5, h * 0.34, w * 0.42, h * 0.24);
  ctx.stroke();
  // bow
  const bx = w * 0.5;
  const by = h * 0.4;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(side, 1);
    ctx.fillStyle = css(c.bow);
    ctx.beginPath();
    ctx.ellipse(w * 0.19, -h * 0.025, w * 0.17, h * 0.05, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(c.bowDark);
    ctx.beginPath();
    ctx.ellipse(w * 0.2, -h * 0.025, w * 0.09, h * 0.026, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(c.bow);
    ctx.beginPath();
    ctx.moveTo(w * 0.03, h * 0.02);
    ctx.lineTo(w * 0.2, h * 0.12);
    ctx.lineTo(w * 0.11, h * 0.14);
    ctx.lineTo(w * 0.05, h * 0.05);
    ctx.fill();
    ctx.restore();
  }
  circle(ctx, bx, by, w * 0.045, css(c.bow));
  // cherry
  const cx = w * 0.5;
  const cy = h * 0.7;
  const r = w * 0.3;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, css(c.fruit));
  g.addColorStop(1, css(c.a));
  circle(ctx, cx, cy, r, g);
  ctx.strokeStyle = css(c.shine);
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = w * 0.025;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, Math.PI * 1.05, Math.PI * 1.35);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

const DESIGNS = ['lemon', 'stripes', 'cherry', 'cheetah', 'charm'];

/** Texture for one phone-case design (index into DESIGNS). */
export function makeCaseTexture(config, index, anisotropy) {
  const sc = config.scenery.cases;
  const pal = config.visual.cases;
  const w = sc.texturePx;
  const inner = { w: sc.width - 2 * sc.bevel, h: sc.height - 2 * sc.bevel };
  const h = Math.round((w * inner.h) / inner.w);
  const seed = config.world.seed;
  const draws = {
    lemon: (ctx) => drawLemon(ctx, w, h, pal.lemon, seed),
    stripes: (ctx) => drawStripes(ctx, w, h, pal.stripes),
    cherry: (ctx) => drawCherry(ctx, w, h, pal.cherry),
    cheetah: (ctx) => drawCheetah(ctx, w, h, pal.cheetah, seed),
    charm: (ctx) => drawCharm(ctx, w, h, pal.charm),
  };
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draws[DESIGNS[index]](canvas.getContext('2d'));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  // extruded cap UVs are the outline's x/y in world units: map them onto 0..1
  tex.repeat.set(1 / inner.w, 1 / inner.h);
  tex.offset.set(0.5, -sc.bevel / inner.h);
  return tex;
}

export const CASE_DESIGN = Object.freeze({ LEMON: 0, STRIPES: 1, CHERRY: 2, CHEETAH: 3, CHARM: 4 });

export function makeCaseTextures(config, renderer) {
  const aniso = Math.min(config.world.maxAnisotropy, renderer.capabilities.getMaxAnisotropy());
  return DESIGNS.map((_, i) => makeCaseTexture(config, i, aniso));
}
