// Shared canvas helpers for the phone-case textures.

export const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

export function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// Camera module with three lenses and a flash (lemon + stripes cases).
export function cameraPlate(ctx, w, h, c) {
  roundRect(ctx, w * 0.1, h * 0.035, w * 0.8, h * 0.225, w * 0.07, css(c.plate));
  const lens = [[0.27, 0.085], [0.5, 0.135], [0.27, 0.19]];
  for (const [fx, fy] of lens) {
    circle(ctx, w * fx, h * fy, w * 0.105, css(c.ring));
    circle(ctx, w * fx, h * fy, w * 0.088, css(c.lens));
    circle(ctx, w * fx - w * 0.025, h * fy - w * 0.025, w * 0.016, 'rgba(255,255,255,0.45)');
  }
  circle(ctx, w * 0.78, h * 0.075, w * 0.04, css(c.flash));
  circle(ctx, w * 0.78, h * 0.12, w * 0.012, css(c.lens));
}
