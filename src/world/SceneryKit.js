import * as THREE from 'three';
import { Rng } from '../utils/rng.js';
import { disposeAll } from '../utils/dispose.js';

const unit = (geo) => geo.translate(0, 0.5, 0); // base on y=0 so instances scale up from the ground

// Geometry/materials/textures shared by every ground chunk (created once).
export class SceneryKit {
  constructor(config, lanes, renderer) {
    const { world, visual } = config;
    this.roadGeo = new THREE.PlaneGeometry(lanes.roadWidth, world.chunkLength).rotateX(-Math.PI / 2);
    this.roadMat = new THREE.MeshStandardMaterial({
      map: this._roadTexture(config, lanes, renderer),
      roughness: 0.92,
    });

    this.boxGeo = unit(new THREE.BoxGeometry(1, 1, 1));
    this.poleGeo = unit(new THREE.CylinderGeometry(1, 1, 1, 6));
    this.coneGeo = unit(new THREE.ConeGeometry(1, 1, 7));

    this.sidewalkMat = new THREE.MeshStandardMaterial({ color: visual.sidewalk, roughness: 0.95 });
    this.buildingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
    this.signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.poleMat = new THREE.MeshStandardMaterial({ color: visual.lampPole, roughness: 0.7 });
    this.lampMat = new THREE.MeshBasicMaterial({ color: visual.lampLight });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: visual.trunk, roughness: 1 });
    this.crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });

    this.groundMat = new THREE.MeshStandardMaterial({ color: visual.ground, roughness: 1 });
    this.groundGeo = new THREE.PlaneGeometry(world.groundSize, world.groundSize).rotateX(-Math.PI / 2);
  }

  // Procedural asphalt with dashed lane dividers and solid edge lines.
  _roadTexture(config, lanes, renderer) {
    const { world, visual } = config;
    const ppu = world.roadTexturePxPerUnit;
    const w = Math.round(lanes.roadWidth * ppu);
    const h = Math.round(world.chunkLength * ppu);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = hex(visual.road);
    ctx.fillRect(0, 0, w, h);

    const rng = new Rng(world.seed);
    for (let i = 0; i < 2200; i++) {
      const v = rng.int(0, 1);
      ctx.fillStyle = v ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 3), rng.range(1, 3));
    }

    ctx.fillStyle = hex(visual.roadLine);
    const lw = world.roadLineWidth * ppu;
    ctx.fillRect(lw, 0, lw, h);
    ctx.fillRect(w - lw * 2, 0, lw, h);
    const period = (world.roadDash + world.roadDashGap) * ppu;
    for (let l = 1; l < lanes.count; l++) {
      const x = l * lanes.width * ppu - lw / 2;
      for (let y = 0; y < h; y += period) ctx.fillRect(x, y, lw, world.roadDash * ppu);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(world.maxAnisotropy, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  dispose() {
    disposeAll([
      this.roadGeo, this.roadMat, this.boxGeo, this.poleGeo, this.coneGeo,
      this.sidewalkMat, this.buildingMat, this.signMat, this.poleMat, this.lampMat,
      this.trunkMat, this.crownMat, this.groundMat, this.groundGeo,
    ]);
  }
}
