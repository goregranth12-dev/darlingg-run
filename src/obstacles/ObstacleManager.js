import { ObjectPool } from '../utils/ObjectPool.js';
import { Rng } from '../utils/rng.js';
import { clamp, lerp } from '../utils/math.js';
import { ObstacleRenderer } from './ObstacleRenderer.js';
import { ObstacleType, buildBounds } from './ObstacleTypes.js';

const NONE = -1;

// Spawns rows of obstacles ahead of the player and recycles them behind it.
// Every row has a "pass lane" that is never a full block, so a run is always
// survivable (and consecutive pass lanes differ by at most one lane).
export class ObstacleManager {
  constructor(config, bus) {
    this.config = config;
    this.cfg = config.obstacles;
    this.bus = bus;
    this.bounds = buildBounds(config);
    this.active = [];
    this.pool = new ObjectPool(() => ({
      type: 0, variant: 0, lane: 0, slot: 0, x: 0, z: 0, halfW: 0, halfD: 0, yMin: 0, yMax: 0,
    }), this.cfg.poolPerType * 3);
    this.rng = new Rng();
    // Reused payload for the 'obstacleRow' event (read by CoinManager).
    this.row = { z: 0, gap: 0, speed: 0, passLane: 0, passType: NONE };
    this.nextRowZ = 0;
    this.passLane = 0;
    this.renderer = null;
    this.lanes = null;
  }

  init(scene, lanes) {
    this.lanes = lanes;
    this.renderer = new ObstacleRenderer(scene, this.config);
    this.reset();
  }

  reset() {
    while (this.active.length > 0) this._remove(this.active.length - 1);
    this.rng.seed(this.cfg.seed || (Math.random() * 0xffffffff) >>> 0);
    this.nextRowZ = -this.cfg.startDistance;
    this.passLane = this.lanes.centerLane;
    this.renderer.flush();
  }

  update(dt, player) {
    const c = this.cfg;
    const limit = player.z - c.spawnAhead;
    while (this.nextRowZ > limit) this._spawnRow(player.speedRatio, player.speed);

    const behind = player.z + c.despawnBehind;
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].z > behind) this._remove(i);
    }
    this.renderer.flush();
  }

  _spawnRow(ratio, speed) {
    const c = this.cfg;
    const rng = this.rng;
    const count = this.lanes.count;
    const row = this.row;
    const z = this.nextRowZ;

    if (rng.next() < c.wideGateChance) {
      const type = rng.next() < 0.5 ? ObstacleType.LOW : ObstacleType.HIGH;
      for (let lane = 0; lane < count; lane++) this._spawn(type, lane, z);
      row.passType = type;
    } else {
      const pass = clamp(this.passLane + rng.int(-1, 1), 0, count - 1);
      this.passLane = pass;
      const fill = lerp(c.fill.start, c.fill.end, ratio);
      row.passType = NONE;
      for (let lane = 0; lane < count; lane++) {
        let type = NONE;
        if (lane === pass) {
          if (rng.next() >= c.passLaneEmptyChance) type = rng.next() < 0.5 ? ObstacleType.LOW : ObstacleType.HIGH;
          row.passType = type;
        } else if (rng.next() < fill) {
          type = this._pickType();
        }
        if (type !== NONE) this._spawn(type, lane, z);
      }
    }

    row.z = z;
    row.speed = speed;
    row.passLane = this.passLane;
    row.gap = lerp(c.gapSeconds.start, c.gapSeconds.min, ratio) * speed;
    this.nextRowZ = z - row.gap;
    this.bus.emit('obstacleRow', row);
  }

  _pickType() {
    const w = this.cfg.typeWeights;
    const r = this.rng.next() * (w.low + w.high + w.block);
    if (r < w.low) return ObstacleType.LOW;
    return r < w.low + w.high ? ObstacleType.HIGH : ObstacleType.BLOCK;
  }

  _spawn(type, lane, z) {
    const slot = this.renderer.acquire(type);
    if (slot < 0) return; // pool exhausted: skipping only makes the row easier
    const o = this.pool.acquire();
    const b = this.bounds[type];
    o.type = type;
    o.variant = type === ObstacleType.LOW ? this.rng.int(0, 1) : 0; // fan colour
    o.lane = lane;
    o.slot = slot;
    o.x = this.lanes.xOf(lane);
    o.z = z;
    o.halfW = b.halfW;
    o.halfD = b.halfD;
    o.yMin = b.yMin;
    o.yMax = b.yMax;
    this.renderer.set(type, slot, o.x, z, o.variant);
    this.active.push(o);
  }

  _remove(index) {
    const o = this.active[index];
    this.renderer.release(o.type, o.slot, o.variant);
    const last = this.active.pop();
    if (index < this.active.length) this.active[index] = last;
    this.pool.release(o);
  }

  shiftOrigin(dz) {
    this.nextRowZ += dz;
    for (let i = 0; i < this.active.length; i++) {
      const o = this.active[i];
      o.z += dz;
      this.renderer.set(o.type, o.slot, o.x, o.z, o.variant);
    }
    this.renderer.flush();
  }

  dispose() {
    this.renderer?.dispose();
  }
}
