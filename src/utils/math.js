// Small math helpers. Pure functions, no allocations.

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const lerp = (a, b, t) => a + (b - a) * t;

export const inverseLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));

/** Frame-rate independent exponential smoothing (lambda = responsiveness, 1/sec). */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
