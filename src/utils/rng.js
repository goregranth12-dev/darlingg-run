// Seedable PRNG (mulberry32). One instance can be re-seeded and reused,
// so chunk recycling never allocates.

export class Rng {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  seed(seed) {
    this.state = seed >>> 0;
    return this;
  }

  /** Float in [0, 1). */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

/** Mixes a base seed with an index into a well-distributed 32-bit seed. */
export const hashSeed = (seed, index) =>
  Math.imul(seed ^ Math.imul(index + 0x9e3779b9, 0x85ebca6b), 0xc2b2ae35) >>> 0;
