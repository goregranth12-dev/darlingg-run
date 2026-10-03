import * as THREE from 'three';
import { ObjectPool } from '../utils/ObjectPool.js';
import { GroundChunk } from './GroundChunk.js';
import { SceneryKit } from './SceneryKit.js';
import { Sky } from './Sky.js';

// Endless road: chunks along -Z are pooled and recycled to the front once
// they fall behind the player. The origin is periodically shifted back to 0
// (in whole chunks) to keep float precision healthy on long runs.
export class WorldManager {
  constructor(scene, config, lanes, glRenderer) {
    this.config = config;
    this.lanes = lanes;
    this.scene = scene;
    this.kit = new SceneryKit(config, lanes, glRenderer);
    this.sky = new Sky(scene, config);

    this.ground = new THREE.Mesh(this.kit.groundGeo, this.kit.groundMat);
    this.ground.position.y = -0.05;
    this.ground.matrixAutoUpdate = false;
    scene.add(this.ground);

    const w = config.world;
    this.pool = new ObjectPool(() => {
      const chunk = new GroundChunk(this.kit, config, lanes);
      scene.add(chunk.group);
      return chunk;
    }, w.chunksAhead + w.chunksBehind + 2);
    this.active = [];
    this.baseIndex = 0;
  }

  /** Index of the chunk the given z lies in. */
  chunkIndexAt(z) {
    return Math.floor(-z / this.config.world.chunkLength) + this.baseIndex;
  }

  update(playerZ) {
    const w = this.config.world;
    const idx = this.chunkIndexAt(playerZ);
    const lo = idx - w.chunksBehind;
    const hi = idx + w.chunksAhead;
    const active = this.active;

    while (active.length > 0 && active[0].index < lo) {
      const old = active.shift();
      old.release();
      this.pool.release(old);
    }
    while (active.length === 0 || active[active.length - 1].index < hi) {
      const chunk = this.pool.acquire();
      chunk.reset(active.length === 0 ? lo : active[active.length - 1].index + 1, this.baseIndex);
      active.push(chunk);
    }

    this.ground.position.z = playerZ;
    this.ground.updateMatrix();
  }

  /** Back to the starting stretch (restart). */
  reset() {
    while (this.active.length > 0) {
      const chunk = this.active.shift();
      chunk.release();
      this.pool.release(chunk);
    }
    this.baseIndex = 0;
  }

  /** dz must be a positive multiple of chunkLength. */
  shiftOrigin(dz) {
    this.baseIndex += dz / this.config.world.chunkLength;
    for (let i = 0; i < this.active.length; i++) this.active[i].place(this.baseIndex);
  }

  dispose() {
    this.pool.clear((chunk) => {
      this.scene.remove(chunk.group);
      chunk.dispose();
    });
    this.scene.remove(this.ground);
    this.sky.dispose();
    this.kit.dispose();
  }
}
