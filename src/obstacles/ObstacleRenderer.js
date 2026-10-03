import * as THREE from 'three';
import { ObstacleType } from './ObstacleTypes.js';
import { disposeAll } from '../utils/dispose.js';

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
    const stripes = canvasTexture(v.texturePx, (ctx, s) => {
      ctx.fillStyle = hex(v.lowStripeA);
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = hex(v.lowStripeB);
      for (let i = -1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.5, 0);
        ctx.lineTo(i * s * 0.5 + s * 0.25, 0);
        ctx.lineTo(i * s * 0.5 + s * 0.75, s);
        ctx.lineTo(i * s * 0.5 + s * 0.5, s);
        ctx.fill();
      }
    });
    const ribs = canvasTexture(v.texturePx, (ctx, s) => {
      ctx.fillStyle = hex(v.block);
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = hex(v.blockRib);
      for (let i = 0; i < 4; i++) ctx.fillRect(i * (s / 4), 0, s / 16, s);
    });
    this.materials = [
      new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 }),
      new THREE.MeshBasicMaterial({ color: v.lowCap }),
      new THREE.MeshStandardMaterial({ color: v.highBeam, emissive: v.highBeam, emissiveIntensity: 0.45, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: v.highPylon, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: ribs, roughness: 0.75 }),
    ];
    this.textures = [stripes, ribs];
    const [mLow, mCap, mBeam, mPylon, mBlock] = this.materials;

    this.meshes = {
      lowBody: this._mesh(mLow, cap),
      lowCap: this._mesh(mCap, cap),
      highBeam: this._mesh(mBeam, cap),
      highPylons: this._mesh(mPylon, cap * 2),
      block: this._mesh(mBlock, cap),
    };
    this.t = types;

    this.free = [[], [], []];
    for (let type = 0; type < 3; type++) for (let i = cap - 1; i >= 0; i--) this.free[type].push(i);
    this.hideAll();
  }

  _mesh(material, count) {
    const mesh = new THREE.InstancedMesh(this.geometry, material, count);
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
    return list.length > 0 ? list.pop() : -1;
  }

  release(type, slot) {
    this._write(type, slot, 0, -1000, true);
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
      this._put(m.lowBody, slot, x, 0, z, o.width * k, o.height * k, o.depth * k);
      this._put(m.lowCap, slot, x, o.height, z, (o.width + 0.1) * k, o.capHeight * k, (o.depth + 0.1) * k);
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
  }

  dispose() {
    for (const key in this.meshes) {
      this.scene.remove(this.meshes[key]);
      this.meshes[key].dispose();
    }
    disposeAll([this.geometry, ...this.materials, ...this.textures]);
  }
}
