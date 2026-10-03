import * as THREE from 'three';
import { disposeAll } from '../utils/dispose.js';
import { makeCaseTextures } from './CaseTextures.js';
import { makeRoadTexture } from './RoadTexture.js';
import { buildCaseGeometry, caseThickness } from './CaseGeometry.js';

const unit = (geo) => geo.translate(0, 0.5, 0); // base on y=0 so instances scale up from the ground

// Geometry/materials/textures shared by every ground chunk (created once).
export class SceneryKit {
  constructor(config, lanes, renderer) {
    const { world, visual } = config;
    this.roadGeo = new THREE.PlaneGeometry(lanes.roadWidth, world.chunkLength).rotateX(-Math.PI / 2);
    this.roadMat = new THREE.MeshStandardMaterial({
      map: makeRoadTexture(config, lanes, Math.min(world.maxAnisotropy, renderer.capabilities.getMaxAnisotropy())),
      roughness: 0.95,
    });

    this.boxGeo = unit(new THREE.BoxGeometry(1, 1, 1));
    this.poleGeo = unit(new THREE.CylinderGeometry(1, 1, 1, 6));
    this.coneGeo = unit(new THREE.ConeGeometry(1, 1, 7));

    this.sidewalkMat = new THREE.MeshStandardMaterial({ color: visual.sidewalk, roughness: 0.95 });
    this._buildCases(config, renderer);
    this.poleMat = new THREE.MeshStandardMaterial({ color: visual.lampPole, roughness: 0.7 });
    this.lampMat = new THREE.MeshBasicMaterial({ color: visual.lampLight });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: visual.trunk, roughness: 1 });
    this.crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });

    this.groundMat = new THREE.MeshStandardMaterial({ color: visual.ground, roughness: 1 });
    this.groundGeo = new THREE.PlaneGeometry(world.groundSize, world.groundSize).rotateX(-Math.PI / 2);
  }

  // Phone-case buildings: one rounded, bevelled slab shared by three patterned variants.
  // Material 0 = the printed back face (caps), material 1 = the case edge.
  _buildCases(config, renderer) {
    const pal = config.visual.cases;
    this.caseGeo = buildCaseGeometry(config);
    this.caseTextures = makeCaseTextures(config, renderer);
    const edges = [pal.lemon.edge, pal.stripes.edge, pal.cherry.edge, pal.cheetah.edge, pal.charm.edge];
    this.caseMats = this.caseTextures.map((map, i) => [
      new THREE.MeshStandardMaterial({ map, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: edges[i], roughness: 0.45 }),
    ]);
    this.caseThickness = caseThickness(config);
  }

  dispose() {
    disposeAll([
      this.roadGeo, this.roadMat, this.boxGeo, this.poleGeo, this.coneGeo,
      this.sidewalkMat, this.poleMat, this.lampMat, this.caseGeo, ...this.caseMats.flat(), ...this.caseTextures,
      this.trunkMat, this.crownMat, this.groundMat, this.groundGeo,
    ]);
  }
}
