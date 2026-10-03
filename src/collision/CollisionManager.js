// Swept AABB tests of the player against obstacles and coins.
// Obstacles end the run ('playerHit'); coins are collected via CoinManager.
export class CollisionManager {
  constructor(config, bus) {
    this.config = config;
    this.bus = bus;
    this.obstacles = null;
    this.coins = null;
  }

  init(obstacles, coins) {
    this.obstacles = obstacles;
    this.coins = coins;
  }

  update(dt, player) {
    if (!player.sm.alive) return;
    const p = this.config.player;
    const g = this.config.collision.graze; // overlaps shallower than this are near-misses
    const px = player.x;
    const feet = player.y;
    const head = feet + player.height;
    // z extent swept this frame (z decreases), so high speed can't tunnel
    const zMin = player.z - p.halfDepth;
    const zMax = player.prevZ + p.halfDepth;

    const obs = this.obstacles.active;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.z + o.halfD - g < zMin || o.z - o.halfD + g > zMax) continue;
      if (Math.abs(px - o.x) >= p.halfWidth + o.halfW - g) continue;
      if (feet >= o.yMax - g || head <= o.yMin + g) continue;
      // Frontal hit: stop right in front of the obstacle instead of inside it.
      if (player.prevZ - p.halfDepth >= o.z + o.halfD - 0.001) player.z = o.z + o.halfD + p.halfDepth;
      this.bus.emit('playerHit', o);
      return;
    }

    const r = this.config.coins.radius;
    const coins = this.coins.active;
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (c.z + r < zMin || c.z - r > zMax) continue;
      if (Math.abs(px - c.x) >= p.halfWidth + r) continue;
      if (c.y - r >= head || c.y + r <= feet) continue;
      this.coins.collect(i);
    }
  }

  shiftOrigin(dz) {}

  reset() {}

  dispose() {}
}
