import * as THREE from 'three';
import { Rng, hashSeed } from '../utils/rng.js';
import { instanceCaps, populateChunk } from './ChunkBuilder.js';

// One pooled slice of road + scenery. Never created/destroyed in-game; the
// WorldManager recycles it via reset(). Transforms are static (matrixAutoUpdate off).
export class GroundChunk {
  constructor(kit, config, lanes) {
    this.config = config;
    this.lanes = lanes;
    this.index = 0;
    this.rng = new Rng();
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;

    const caps = instanceCaps(config);
    const road = new THREE.Mesh(kit.roadGeo, kit.roadMat);
    road.receiveShadow = true;
    road.matrixAutoUpdate = false;
    this.group.add(road);

    const inst = (geo, mat, count, colored) => {
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.matrixAutoUpdate = false;
      if (colored) mesh.setColorAt(0, new THREE.Color(0xffffff));
      this.group.add(mesh);
      return mesh;
    };
    this.meshes = {
      sidewalks: inst(kit.boxGeo, kit.sidewalkMat, 2),
      caseA: inst(kit.caseGeo, kit.caseMats[0], caps.cases),
      caseB: inst(kit.caseGeo, kit.caseMats[1], caps.cases),
      caseC: inst(kit.caseGeo, kit.caseMats[2], caps.cases),
      caseD: inst(kit.caseGeo, kit.caseMats[3], caps.cases),
      caseE: inst(kit.caseGeo, kit.caseMats[4], caps.cases),
      poles: inst(kit.poleGeo, kit.poleMat, caps.lamps),
      heads: inst(kit.boxGeo, kit.lampMat, caps.lamps),
      trunks: inst(kit.poleGeo, kit.trunkMat, caps.trees),
      crowns: inst(kit.coneGeo, kit.crownMat, caps.trees, true),
    };
    this.group.visible = false;
  }

  /** Re-seeds the scenery for an absolute chunk index and positions it. */
  reset(index, baseIndex) {
    this.index = index;
    this.rng.seed(hashSeed(this.config.world.seed, index));
    populateChunk(this, this.rng, this.config, this.lanes);
    this.place(baseIndex);
    this.group.visible = true;
  }

  place(baseIndex) {
    this.group.position.z = -(this.index - baseIndex + 0.5) * this.config.world.chunkLength;
    this.group.updateMatrix();
  }

  release() {
    this.group.visible = false;
  }

  dispose() {
    for (const key in this.meshes) this.meshes[key].dispose(); // instance buffers; shared geo/mats belong to the kit
  }
}
