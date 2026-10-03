import { Rng } from '../utils/rng.js';
import { circle, css, roundRect, cameraPlate } from './CaseDraw.js';

function cherryPair(ctx, x, y, r, c) {
  ctx.strokeStyle = css(c.stem);
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, y - r * 0.2);
  ctx.quadraticCurveTo(x - r * 0.6, y - r * 2.1, x + r * 0.1, y - r * 2.3);
  ctx.moveTo(x + r * 0.9, y);
  ctx.quadraticCurveTo(x + r * 0.5, y - r * 2, x + r * 0.1, y - r * 2.3);
  ctx.stroke();
  for (const dx of [-0.95, 0.95]) {
    const g = ctx.createRadialGradient(x + dx * r - r * 0.3, y - r * 0.3, r * 0.1, x + dx * r, y, r);
    g.addColorStop(0, '#ff4a5e');
    g.addColorStop(1, css(c.cherry ?? c.red));
    circle(ctx, x + dx * r, y, r, g);
    circle(ctx, x + dx * r - r * 0.35, y - r * 0.35, r * 0.2, 'rgba(255,255,255,0.65)');
  }
}

// A sitting cheetah seen from the side: body, chest, head with ears, tail and spots.
function cheetah(ctx, x, y, s, c, rng) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = css(c.fur);
  ctx.beginPath();
  ctx.ellipse(0, 0.2, 0.34, 0.5, 0.1, 0, Math.PI * 2); // body
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.12, 0.62, 0.3, 0.2, 0, 0, Math.PI * 2); // haunch + feet
  ctx.fill();
  ctx.strokeStyle = css(c.fur);
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.3, 0.6);
  ctx.bezierCurveTo(0.6, 0.7, 0.55, 0.3, 0.38, 0.35); // tail
  ctx.stroke();
  ctx.fillStyle = css(c.cream);
  ctx.beginPath();
  ctx.ellipse(-0.12, 0.05, 0.13, 0.34, 0.1, 0, Math.PI * 2); // chest
  ctx.fill();
  ctx.fillStyle = css(c.fur);
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.42, 0.2, 0.17, 0, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.52);
  ctx.lineTo(0.06, -0.68);
  ctx.lineTo(0.12, -0.5);
  ctx.fill(); // ear
  ctx.fillStyle = css(c.spot);
  circle(ctx, -0.2, -0.45, 0.025, css(c.spot));
  for (let i = 0; i < 22; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next());
    circle(ctx, 0.04 + Math.cos(a) * 0.26 * rr, 0.2 + Math.sin(a) * 0.46 * rr, 0.028, css(c.spot));
  }
  ctx.restore();
}

export function drawCheetah(ctx, w, h, c, seed) {
  ctx.fillStyle = css(c.base);
  ctx.fillRect(0, 0, w, h);
  const rng = new Rng(seed + 7);
  const cats = [[0.5, 0.52, 0.34], [0.8, 0.4, 0.22], [0.16, 0.3, 0.2], [0.14, 0.72, 0.2], [0.8, 0.84, 0.22], [0.5, 0.97, 0.12]];
  for (const [fx, fy, fs] of cats) cheetah(ctx, w * fx, h * fy, w * fs, c, rng);
  for (const [fx, fy] of [[0.5, 0.31], [0.1, 0.56], [0.86, 0.6], [0.5, 0.86]]) cherryPair(ctx, w * fx, h * fy, w * 0.055, c);
  cameraPlate(ctx, w, h, c);
}

function dice(ctx, x, y, s, c) {
  roundRect(ctx, x, y, s, s, s * 0.2, '#fbfaf5');
  for (const [px, py] of [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]]) circle(ctx, x + s * px, y + s * py, s * 0.07, '#1a1a1f');
}

// Puffy "sticker" case: cherry, bubble tea, keychain, croissant, leopard triangle, sunglasses.
export function drawCharm(ctx, w, h, c) {
  ctx.fillStyle = css(c.base);
  ctx.fillRect(0, 0, w, h);
  cameraPlate(ctx, w, h, c);
  ctx.save();
  ctx.translate(w * 0.12, h * 0.27); // stickers sit below the camera plate
  ctx.scale(0.76, 0.76);
  // cherries with leaves
  ctx.strokeStyle = css(c.leaf);
  ctx.lineWidth = w * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.25, h * 0.17);
  ctx.quadraticCurveTo(w * 0.3, h * 0.08, w * 0.4, h * 0.06);
  ctx.moveTo(w * 0.52, h * 0.17);
  ctx.quadraticCurveTo(w * 0.42, h * 0.08, w * 0.4, h * 0.06);
  ctx.stroke();
  ctx.fillStyle = css(c.leaf);
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.06, w * 0.1, h * 0.022, 0.4, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, w * 0.2, h * 0.225, w * 0.13, css(c.red));
  circle(ctx, w * 0.42, h * 0.255, w * 0.13, css(c.red));
  circle(ctx, w * 0.16, h * 0.2, w * 0.03, 'rgba(255,255,255,0.7)');
  circle(ctx, w * 0.38, h * 0.23, w * 0.03, 'rgba(255,255,255,0.7)');
  // bubble tea
  roundRect(ctx, w * 0.67, h * 0.1, w * 0.2, h * 0.15, w * 0.03, css(c.cup));
  roundRect(ctx, w * 0.67, h * 0.1, w * 0.2, h * 0.04, w * 0.02, css(c.cupDark));
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(w * 0.77, h * 0.1, w * 0.1, Math.PI, 0);
  ctx.fill();
  roundRect(ctx, w * 0.75, h * 0.02, w * 0.025, h * 0.08, 3, css(c.leaf));
  // keychain: chain, heart, dice, tag
  ctx.strokeStyle = css(c.silver);
  ctx.lineWidth = w * 0.02;
  ctx.beginPath();
  ctx.moveTo(w * 0.78, h * 0.26);
  ctx.quadraticCurveTo(w * 0.72, h * 0.34, w * 0.52, h * 0.4);
  ctx.stroke();
  ctx.lineWidth = w * 0.03;
  ctx.beginPath();
  ctx.arc(w * 0.48, h * 0.41, w * 0.07, 0, Math.PI * 2);
  ctx.stroke();
  dice(ctx, w * 0.66, h * 0.31, w * 0.17, c);
  ctx.fillStyle = css(c.silver);
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.43);
  ctx.bezierCurveTo(w * 0.12, h * 0.4, w * 0.12, h * 0.5, w * 0.28, h * 0.57);
  ctx.bezierCurveTo(w * 0.44, h * 0.5, w * 0.44, h * 0.4, w * 0.28, h * 0.43);
  ctx.fill();
  ctx.save();
  ctx.translate(w * 0.72, h * 0.47);
  ctx.rotate(0.35);
  roundRect(ctx, -w * 0.15, -h * 0.03, w * 0.3, h * 0.06, w * 0.02, css(c.tag));
  roundRect(ctx, -w * 0.135, -h * 0.022, w * 0.27, h * 0.044, w * 0.015, css(c.tagLight));
  ctx.fillStyle = css(c.red);
  ctx.font = `italic 700 ${Math.round(w * 0.085)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Player', 0, h * 0.014);
  ctx.restore();
  // croissant
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(c.croissant);
  ctx.lineWidth = w * 0.13;
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.68, w * 0.17, Math.PI * 0.55, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = css(c.croissantDark);
  ctx.lineWidth = w * 0.018;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.8 + i * 0.18);
    ctx.beginPath();
    ctx.moveTo(w * 0.3 + Math.cos(a) * w * 0.1, h * 0.68 + Math.sin(a) * w * 0.1);
    ctx.lineTo(w * 0.3 + Math.cos(a) * w * 0.23, h * 0.68 + Math.sin(a) * w * 0.23);
    ctx.stroke();
  }
  // leopard triangle
  ctx.strokeStyle = css(c.leopard);
  ctx.lineWidth = w * 0.09;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.58, h * 0.6);
  ctx.lineTo(w * 0.88, h * 0.62);
  ctx.lineTo(w * 0.74, h * 0.8);
  ctx.closePath();
  ctx.stroke();
  const rng = new Rng(5);
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const px = w * (0.58 + 0.3 * Math.min(1, t * 3)) - (t > 0.33 ? (t - 0.33) * w * 0.2 : 0);
    circle(ctx, px + rng.range(-3, 3), h * (0.6 + 0.2 * t), w * 0.016, css(c.spot));
  }
  // sunglasses
  for (const fx of [0.22, 0.46]) {
    ctx.fillStyle = css(c.red);
    ctx.beginPath();
    ctx.ellipse(w * fx, h * 0.9, w * 0.12, h * 0.032, fx > 0.3 ? -0.15 : 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(c.glass);
    ctx.beginPath();
    ctx.ellipse(w * fx, h * 0.9, w * 0.095, h * 0.022, fx > 0.3 ? -0.15 : 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = css(c.red);
  ctx.lineWidth = w * 0.025;
  ctx.beginPath();
  ctx.moveTo(w * 0.33, h * 0.895);
  ctx.lineTo(w * 0.36, h * 0.895);
  ctx.stroke();
  ctx.restore();
}
