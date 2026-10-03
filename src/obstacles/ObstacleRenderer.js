import * as THREE from 'three';
import { ObstacleType } from './ObstacleTypes.js';
import { disposeAll } from '../utils/dispose.js';
import { buildFanGeometry } from './FanGeometry.js';

const dummy = new THREE.Object3D();

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Draws every obstacle as instanced boxes (a handful of draw calls total).
// Each type owns a fixed slot pool; unused slots are zero-scaled.
export class ObstacleRenderer {
  constructor(scene, config) {
    this.scene = scene;
    this.cfg = config.obstacles;
    const { types, visual: v, poolPerType: cap } = this.cfg;
    this.cap = cap;
    this.dirty = false;

    const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    this.geometry = box;
    const ribs = canvasTexture(v.texturePx, (ctx, s) => {
      ctx.fillStyle = hex(v.block);
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = hex(v.blockRib);
      for (let i = 0; i < 4; i++) ctx.fillRect(i * (s / 4), 0, s / 16, s);
    });
    const fans = config.visual.fans;
    this.fanGeos = [
      buildFanGeometry(fans.orange, fans.dark, types.low.thickness),
      buildFanGeometry(fans.purple, fans.dark, types.low.thickness),
    ];
    const fanMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1 });
    this.materials = [
      fanMat(),
      fanMat(),
      new THREE.MeshStandardMaterial({ color: v.highBeam, emissive: v.highBeam, emissiveIntensity: 0.45, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: v.highPylon, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: ribs, roughness: 0.75 }),
    ];
    this.textures = [ribs];
    const [mFanA, mFanB, mBeam, mPylon, mBlock] = this.materials;

    this.meshes = {
      fanOrange: this._mesh(mFanA, cap, this.fanGeos[0]),
      fanPurple: this._mesh(mFanB, cap, this.fanGeos[1]),
      highBeam: this._mesh(mBeam, cap),
      highPylons: this._mesh(mPylon, cap * 2),
      block: this._mesh(mBlock, cap),
    };
    this.t = types;

    this.inUse = [new Uint8Array(cap), new Uint8Array(cap), new Uint8Array(cap)];
    this.free = [[], [], []];
    for (let type = 0; type < 3; type++) for (let i = cap - 1; i >= 0; i--) this.free[type].push(i);
    this.hideAll();
    this.dirty = true;
    this.flush();
  }

  _mesh(material, count, geometry = this.geometry) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  hideAll() {
    dummy.position.set(0, -1000, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (const key in this.meshes) {
      const m = this.meshes[key];
      for (let i = 0; i < m.count; i++) m.setMatrixAt(i, dummy.matrix);
      m.instanceMatrix.needsUpdate = true;
    }
  }

  /** Returns a free slot for the type, or -1 when the pool is exhausted. */
  acquire(type) {
    const list = this.free[type];
    if (list.length === 0) return -1;
    const slot = list.pop();
    this.inUse[type][slot] = 1;
    return slot;
  }

  release(type, slot) {
    this._write(type, slot, 0, -1000, true);
    this.inUse[type][slot] = 0;
    this.free[type].push(slot);
  }

  /** Positions the obstacle in `slot` at lane x / world z. */
  set(type, slot, x, z) {
    this._write(type, slot, x, z, false);
  }

  _put(mesh, i, x, y, z, sx, sy, sz) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  _write(type, slot, x, z, hidden) {
    const k = hidden ? 0 : 1;
    const m = this.meshes;
    const t = this.t;
    if (type === ObstacleType.LOW) {
      const o = t.low;
      const flip = slot & 1 ? -1 : 1; // alternate which side the orange fan stands on
      const h = o.height * k;
      this._put(m.fanOrange, slot, x - o.pairOffset * flip, 0, z, h, h, h);
      this._put(m.fanPurple, slot, x + o.pairOffset * flip, 0, z, h, h, h);
    } else if (type === ObstacleType.HIGH) {
      const o = t.high;
      this._put(m.highBeam, slot, x, o.clearance, z, o.width * k, o.beamHeight * k, o.depth * k);
      const off = o.width / 2 - o.pylonWidth / 2;
      this._put(m.highPylons, slot * 2, x - off, 0, z, o.pylonWidth * k, o.pylonHeight * k, o.depth * 0.8 * k);
      this._put(m.highPylons, slot * 2 + 1, x + off, 0, z, o.pylonWidth * k, o.pylonHeight * k, o.depth * 0.8 * k);
    } else {
      const o = t.block;
      this._put(m.block, slot, x, 0, z, o.width * k, o.height * k, o.depth * k);
    }
    this.dirty = true;
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    for (const key in this.meshes) this.meshes[key].instanceMatrix.needsUpdate = true;
    // only draw up to the highest slot in use (idle slots are zero-scale but still cost GPU time)
    const m = this.meshes;
    const hi = this.inUse.map((used) => {
      let n = used.length;
      while (n > 0 && !used[n - 1]) n--;
      return n;
    });
    m.fanOrange.count = m.fanPurple.count = hi[ObstacleType.LOW];
    m.highBeam.count = hi[ObstacleType.HIGH];
    m.highPylons.count = hi[ObstacleType.HIGH] * 2;
    m.block.count = hi[ObstacleType.BLOCK];
  }

  dispose() {
    for (const key in this.meshes) {
      this.scene.remove(this.meshes[key]);
      this.meshes[key].dispose();
    }
    disposeAll([this.geometry, ...this.fanGeos, ...this.materials, ...this.textures]);
  }
}
