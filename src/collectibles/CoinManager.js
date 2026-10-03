import * as THREE from 'three';
import { ObjectPool } from '../utils/ObjectPool.js';
import { Rng } from '../utils/rng.js';
import { clamp } from '../utils/math.js';
import { ObstacleType } from '../obstacles/ObstacleTypes.js';
import { CoinBurst } from './CoinBurst.js';
import { buildCoinGeometry } from './CoinGeometry.js';
import { disposeAll } from '../utils/dispose.js';

const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);
const pos = new THREE.Vector3();
const spinQ = new THREE.Quaternion();
const matrix = new THREE.Matrix4();

// Pooled, instanced spinning coins. Patterns are laid out in the gap after each
// obstacle row (listening for 'obstacleRow'), so coins never sit inside obstacles.
export class CoinManager {
  constructor(config, bus) {
    this.config = config;
    this.cfg = config.coins;
    this.bus = bus;
    this.rng = new Rng();
    this.active = [];
    this.pool = new ObjectPool(() => ({ x: 0, y: 0, z: 0 }), this.cfg.maxActive);
    this.spin = 0;
    this.mesh = null;
    this.burst = null;
    this.lanes = null;
  }

  init(scene, lanes) {
    const c = this.cfg;
    this.scene = scene;
    this.lanes = lanes;
    this.geometry = buildCoinGeometry(c.size, c.thickness);
    this.material = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.emissive, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.35,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, c.maxActive);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.burst = new CoinBurst(scene, this.config);
    this.unsubscribe = [
      this.bus.on('obstacleRow', (row) => this._onRow(row)),
      this.bus.on('coinCollected', (coin) => this.burst.emit(coin.x, coin.y, coin.z)),
    ];
    this.rng.seed((Math.random() * 0xffffffff) >>> 0);
  }

  reset() {
    while (this.active.length > 0) this.pool.release(this.active.pop());
    this.mesh.count = 0;
    this.burst.reset();
  }

  _add(x, y, z) {
    if (this.active.length >= this.cfg.maxActive) return;
    const coin = this.pool.acquire();
    coin.x = x;
    coin.y = y;
    coin.z = z;
    this.active.push(coin);
  }

  _onRow(row) {
    const c = this.cfg;
    if (this.rng.next() > c.spawnChance) return;
    const w = c.patternWeights;
    let r = this.rng.next() * (w.line + w.step + (row.passType === ObstacleType.LOW ? w.arc : 0));
    if (r < w.line) this._line(row, row.passLane);
    else if ((r -= w.line) < w.step) this._step(row);
    else this._arc(row);
  }

  _span(row) {
    const c = this.cfg;
    const len = row.gap - c.margin * 2;
    return len < c.spacing ? 0 : Math.floor(len / c.spacing) + 1;
  }

  _line(row, lane) {
    const c = this.cfg;
    const n = Math.min(this._span(row), 9);
    const x = this.lanes.xOf(lane);
    for (let i = 0; i < n; i++) this._add(x, c.height, row.z - c.margin - i * c.spacing);
  }

  // Run in the pass lane, then shift one lane over.
  _step(row) {
    const c = this.cfg;
    const n = Math.min(this._span(row), 9);
    const dir = row.passLane === 0 ? 1 : row.passLane === this.lanes.count - 1 ? -1 : this.rng.next() < 0.5 ? -1 : 1;
    const xa = this.lanes.xOf(row.passLane);
    const xb = this.lanes.xOf(clamp(row.passLane + dir, 0, this.lanes.count - 1));
    for (let i = 0; i < n; i++) this._add(i < n / 2 ? xa : xb, c.height, row.z - c.margin - i * c.spacing);
  }

  // Coins tracing the jump arc over a low obstacle in the pass lane.
  _arc(row) {
    const c = this.cfg;
    const j = this.config.jump;
    const air = (2 * j.jumpVelocity) / j.gravity;
    const x = this.lanes.xOf(row.passLane);
    for (let i = 0; i < c.arcCoins; i++) {
      const t = (i / (c.arcCoins - 1)) * air;
      const lift = (j.jumpVelocity * t - 0.5 * j.gravity * t * t) * c.arcScale;
      this._add(x, c.height + lift, row.z + (air * row.speed) / 2 - t * row.speed);
    }
  }

  /** Removes the coin at index (swap-remove) after it was collected. */
  collect(index) {
    const coin = this.active[index];
    this.bus.emit('coinCollected', coin);
    const last = this.active.pop();
    if (index < this.active.length) this.active[index] = last;
    this.pool.release(coin);
  }

  update(dt, player) {
    this.spin += dt * this.cfg.spinSpeed;
    spinQ.setFromAxisAngle(UP, this.spin);

    const behind = player.z + this.config.obstacles.despawnBehind;
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].z > behind) {
        const coin = this.active[i];
        const last = this.active.pop();
        if (i < this.active.length) this.active[i] = last;
        this.pool.release(coin);
      }
    }

    for (let i = 0; i < this.active.length; i++) {
      const coin = this.active[i];
      matrix.compose(pos.set(coin.x, coin.y, coin.z), spinQ, ONE);
      this.mesh.setMatrixAt(i, matrix);
    }
    this.mesh.count = this.active.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.burst.update(dt);
  }

  shiftOrigin(dz) {
    for (let i = 0; i < this.active.length; i++) this.active[i].z += dz;
    this.burst?.shiftOrigin(dz);
  }

  dispose() {
    this.unsubscribe?.forEach((off) => off());
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    disposeAll([this.geometry, this.material]);
    this.burst.dispose();
  }
}
