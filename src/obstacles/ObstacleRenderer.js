import * as THREE from 'three';
import { ObstacleType } from './ObstacleTypes.js';
import { disposeAll } from '../utils/dispose.js';
import { buildFanGeometry } from './FanGeometry.js';
import { buildBearGeometry } from './BearGeometry.js';
import { buildCaseGeometry, caseThickness } from '../world/CaseGeometry.js';
import { makeCaseTexture, CASE_DESIGN } from '../world/CaseTextures.js';

const dummy = new THREE.Object3D();

// Draws every obstacle as instanced meshes (a handful of draw calls total).
// Each type owns a fixed slot pool; unused slots are zero-scaled. A slot's `variant`
// picks the look: LOW = orange fan / purple fan / bear, BLOCK = cherry / player case.
export class ObstacleRenderer {
  constructor(scene, config, anisotropy = 4) {
    this.scene = scene;
    this.cfg = config.obstacles;
    const { types, visual: v, poolPerType: cap } = this.cfg;
    this.t = types;
    this.cap = cap;
    this.dirty = false;

    const fans = config.visual.fans;
    const th = types.low.thickness;
    this.geos = [
      buildFanGeometry(fans.orange, fans.dark, th),
      buildFanGeometry(fans.purple, fans.dark, th),
      buildBearGeometry(config.visual.bear),
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), // beam + pylons
      buildCaseGeometry(config),
    ];
    const [fanA, fanB, bear, box, caseGeo] = this.geos;
    const toy = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.08 });
    this.textures = [CASE_DESIGN.CHERRY, CASE_DESIGN.CHARM].map((d) => makeCaseTexture(config, d, anisotropy));
    this.caseMats = this.textures.map((map) => [
      new THREE.MeshStandardMaterial({ map, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: map === this.textures[0] ? config.visual.cases.cherry.edge : config.visual.cases.charm.edge, roughness: 0.45 }),
    ]);
    this.materials = [
      toy(),
      toy(),
      toy(),
      new THREE.MeshStandardMaterial({ color: v.highBeam, emissive: v.highBeam, emissiveIntensity: 0.45, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: v.highPylon, roughness: 0.6 }),
    ];
    const [mFanA, mFanB, mBear, mBeam, mPylon] = this.materials;
    // a LOW slot draws in exactly one of these three meshes (the others hold a zero-scale matrix)
    this.lowMeshes = [this._mesh(fanA, mFanA, cap), this._mesh(fanB, mFanB, cap), this._mesh(bear, mBear, cap)];
    this.blockMeshes = this.caseMats.map((mat) => this._mesh(caseGeo, mat, cap));
    this.meshes = {
      highBeam: this._mesh(box, mBeam, cap),
      highPylons: this._mesh(box, mPylon, cap * 2),
    };
    this.blockScale = types.block.height / config.scenery.cases.height; // case slab scaled to block size
    this.lowScale = types.low.height;
    this.all = [...this.lowMeshes, ...this.blockMeshes, ...Object.values(this.meshes)];

    this.inUse = [new Uint8Array(cap), new Uint8Array(cap), new Uint8Array(cap)];
    this.free = [[], [], []];
    for (let type = 0; type < 3; type++) for (let i = cap - 1; i >= 0; i--) this.free[type].push(i);
    this.hideAll();
    this.dirty = true;
    this.flush();
  }

  _mesh(geometry, material, count) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  hideAll() {
    dummy.position.set(0, -1000, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (const m of this.all) {
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

  release(type, slot, variant = 0) {
    this._write(type, slot, 0, -1000, true, variant);
    this.inUse[type][slot] = 0;
    this.free[type].push(slot);
  }

  /** Positions the obstacle in `slot` at lane x / world z. */
  set(type, slot, x, z, variant = 0) {
    this._write(type, slot, x, z, false, variant);
  }

  _put(mesh, i, x, y, z, sx, sy, sz) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  _write(type, slot, x, z, hidden, variant) {
    const t = this.t;
    if (type === ObstacleType.LOW) {
      for (let k = 0; k < 3; k++) {
        const s = !hidden && k === variant ? this.lowScale : 0;
        this._put(this.lowMeshes[k], slot, x, 0, z, s, s, s);
      }
    } else if (type === ObstacleType.HIGH) {
      const o = t.high;
      const k = hidden ? 0 : 1;
      this._put(this.meshes.highBeam, slot, x, o.clearance, z, o.width * k, o.beamHeight * k, o.depth * k);
      const off = o.width / 2 - o.pylonWidth / 2;
      this._put(this.meshes.highPylons, slot * 2, x - off, 0, z, o.pylonWidth * k, o.pylonHeight * k, o.depth * 0.8 * k);
      this._put(this.meshes.highPylons, slot * 2 + 1, x + off, 0, z, o.pylonWidth * k, o.pylonHeight * k, o.depth * 0.8 * k);
    } else {
      for (let k = 0; k < 2; k++) {
        const s = !hidden && k === variant ? this.blockScale : 0;
        this._put(this.blockMeshes[k], slot, x, 0, z, s, s, s);
      }
    }
    this.dirty = true;
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    for (const m of this.all) m.instanceMatrix.needsUpdate = true;
    // only draw up to the highest slot in use (idle slots are zero-scale but still cost GPU time)
    const hi = this.inUse.map((used) => {
      let n = used.length;
      while (n > 0 && !used[n - 1]) n--;
      return n;
    });
    const low = hi[ObstacleType.LOW];
    const block = hi[ObstacleType.BLOCK];
    this.lowMeshes.forEach((m) => (m.count = low));
    this.blockMeshes.forEach((m) => (m.count = block));
    this.meshes.highBeam.count = hi[ObstacleType.HIGH];
    this.meshes.highPylons.count = hi[ObstacleType.HIGH] * 2;
  }

  dispose() {
    for (const m of this.all) {
      this.scene.remove(m);
      m.dispose();
    }
    disposeAll([...this.geos, ...this.materials, ...this.caseMats.flat(), ...this.textures]);
  }
}
