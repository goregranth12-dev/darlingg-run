import * as THREE from 'three';
import { ObstacleType } from './ObstacleTypes.js';
import { disposeAll } from '../utils/dispose.js';
import { buildFanGeometry } from './FanGeometry.js';
import { buildBearGeometry } from './BearGeometry.js';
import { buildArchBody, buildArchText, buildArchFlowers } from './ArchGeometry.js';
import { buildCaseGeometry } from '../world/CaseGeometry.js';
import { makeCaseTexture, CASE_DESIGN } from '../world/CaseTextures.js';

const dummy = new THREE.Object3D();

// Draws every obstacle as instanced meshes (a handful of draw calls total).
// Each type owns a fixed slot pool; unused slots are zero-scaled. A slot's `variant`
// picks the look: LOW = orange fan / purple fan / bear, BLOCK = cherry / player phone case.
// HIGH is always the pink Darlingg flower arch (body + gold lettering + flowers).
export class ObstacleRenderer {
  constructor(scene, config, anisotropy = 4) {
    this.scene = scene;
    this.cfg = config.obstacles;
    const { types, poolPerType: cap } = this.cfg;
    this.t = types;
    this.cap = cap;
    this.dirty = false;
    const vis = config.visual;

    const text = buildArchText(types.high, vis.arch);
    this.geos = [
      buildFanGeometry(vis.fans.orange, vis.fans.dark, types.low.thickness),
      buildFanGeometry(vis.fans.purple, vis.fans.dark, types.low.thickness),
      buildBearGeometry(vis.bear),
      buildArchBody(types.high),
      text.geo,
      buildArchFlowers(types.high, vis.arch, config.world.seed),
      buildCaseGeometry(config),
    ];
    const [fanA, fanB, bear, archBody, archText, archFlowers, caseGeo] = this.geos;

    this.textures = [text.map, ...[CASE_DESIGN.CHERRY, CASE_DESIGN.CHARM].map((d) => makeCaseTexture(config, d, anisotropy))];
    const edges = [vis.cases.cherry.edge, vis.cases.charm.edge];
    this.caseMats = this.textures.slice(1).map((map, i) => [
      new THREE.MeshStandardMaterial({ map, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: edges[i], roughness: 0.45 }),
    ]);
    const toy = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.08 });
    const arch = vis.arch;
    this.materials = [
      toy(),
      toy(),
      toy(),
      new THREE.MeshStandardMaterial({ color: arch.pink, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({
        map: text.map, transparent: true, alphaTest: 0.35, roughness: 0.3, metalness: 0.35, emissive: arch.text, emissiveIntensity: 0.5,
      }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }),
    ];
    const [mFanA, mFanB, mBear, mArch, mText, mFlowers] = this.materials;

    // a LOW slot draws in exactly one of these three meshes (the others hold a zero-scale matrix)
    this.lowMeshes = [this._mesh(fanA, mFanA, cap), this._mesh(fanB, mFanB, cap), this._mesh(bear, mBear, cap)];
    this.blockMeshes = this.caseMats.map((mat) => this._mesh(caseGeo, mat, cap));
    this.archMeshes = [this._mesh(archBody, mArch, cap), this._mesh(archText, mText, cap), this._mesh(archFlowers, mFlowers, cap)];
    this.blockScale = types.block.height / config.scenery.cases.height; // case slab scaled to block size
    this.lowScale = types.low.height;
    this.all = [...this.lowMeshes, ...this.blockMeshes, ...this.archMeshes];

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

  _put(mesh, i, x, y, z, s) {
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  _write(type, slot, x, z, hidden, variant) {
    if (type === ObstacleType.LOW) {
      for (let k = 0; k < 3; k++) this._put(this.lowMeshes[k], slot, x, 0, z, !hidden && k === variant ? this.lowScale : 0);
    } else if (type === ObstacleType.HIGH) {
      for (const m of this.archMeshes) this._put(m, slot, x, 0, z, hidden ? 0 : 1);
    } else {
      for (let k = 0; k < 2; k++) this._put(this.blockMeshes[k], slot, x, 0, z, !hidden && k === variant ? this.blockScale : 0);
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
    this.lowMeshes.forEach((m) => (m.count = hi[ObstacleType.LOW]));
    this.archMeshes.forEach((m) => (m.count = hi[ObstacleType.HIGH]));
    this.blockMeshes.forEach((m) => (m.count = hi[ObstacleType.BLOCK]));
  }

  dispose() {
    for (const m of this.all) {
      this.scene.remove(m);
      m.dispose();
    }
    disposeAll([...this.geos, ...this.materials, ...this.caseMats.flat(), ...this.textures]);
  }
}
