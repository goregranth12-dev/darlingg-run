import * as THREE from 'three';

const dummy = new THREE.Object3D();
const color = new THREE.Color();

const place = (mesh, i, x, y, z, sx, sy, sz) => {
  dummy.position.set(x, y, z);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
};

const tint = (mesh, i, hex) => mesh.setColorAt(i, color.setHex(hex));

/** Instance capacities needed per chunk, derived from Config. */
export function instanceCaps(config) {
  const s = config.scenery;
  const lamps = Math.ceil(config.world.chunkLength / s.lampSpacing) * 2;
  return {
    buildings: s.maxInstancesPerSide * 2,
    signs: s.maxInstancesPerSide * 2,
    trees: s.maxInstancesPerSide * 2,
    lamps,
  };
}

// Fills a chunk's instanced meshes with seeded, per-chunk scenery.
// Chunk-local space: z in [-L/2, L/2], x=0 is the road centre.
export function populateChunk(chunk, rng, config, lanes) {
  const { world, scenery: s, visual } = config;
  const L = world.chunkLength;
  const roadHalf = lanes.roadWidth / 2;
  const m = chunk.meshes;

  place(m.sidewalks, 0, -(roadHalf + world.sidewalkWidth / 2), 0, 0, world.sidewalkWidth, world.sidewalkHeight, L);
  place(m.sidewalks, 1, roadHalf + world.sidewalkWidth / 2, 0, 0, world.sidewalkWidth, world.sidewalkHeight, L);
  m.sidewalks.instanceMatrix.needsUpdate = true;

  const edge = roadHalf + world.sidewalkWidth + s.buildingGap;
  let bi = 0;
  let si = 0;
  for (let side = -1; side <= 1; side += 2) {
    const n = rng.int(s.buildingsPerSide.min, s.buildingsPerSide.max);
    const slot = L / n;
    for (let i = 0; i < n; i++) {
      const along = Math.min(rng.range(s.buildingWidth.min, s.buildingWidth.max), slot * 0.95);
      const depth = rng.range(s.buildingDepth.min, s.buildingDepth.max);
      const h = rng.range(s.buildingHeight.min, s.buildingHeight.max);
      const z = -L / 2 + (i + 0.5) * slot + rng.range(-1, 1) * (slot - along) * 0.5;
      place(m.buildings, bi, side * (edge + depth / 2), 0, z, depth, h, along);
      tint(m.buildings, bi, rng.pick(visual.buildings));
      bi++;
      if (rng.next() < s.signChance) {
        const y = rng.range(2.5, Math.max(3, Math.min(h - 1, 9)));
        place(m.signs, si, side * (edge - s.signSize.d / 2), y, z, s.signSize.d, s.signSize.h, s.signSize.w);
        tint(m.signs, si, rng.pick(visual.signs));
        si++;
      }
    }
  }
  m.buildings.count = bi;
  m.signs.count = si;

  const slots = Math.floor(L / s.lampSpacing);
  let li = 0;
  for (let i = 0; i < slots; i++) {
    const z = -L / 2 + (i + 0.25) * s.lampSpacing;
    for (let side = -1; side <= 1; side += 2) {
      const px = side * (roadHalf + 0.4);
      place(m.poles, li, px, 0, z, s.lampRadius, s.lampHeight, s.lampRadius);
      place(m.heads, li, px - side * s.lampArm, s.lampHeight, z, s.lampHeadSize, s.lampHeadSize * 0.4, s.lampHeadSize);
      li++;
    }
  }
  m.poles.count = m.heads.count = li;

  let ti = 0;
  for (let side = -1; side <= 1; side += 2) {
    const n = Math.min(rng.int(s.treesPerSide.min, s.treesPerSide.max), slots);
    const start = rng.int(0, slots - 1);
    for (let k = 0; k < n; k++) {
      const z = -L / 2 + (((start + k) % slots) + 0.75) * s.lampSpacing + rng.range(-1, 1);
      const x = side * (roadHalf + world.sidewalkWidth * 0.6);
      const ch = rng.range(s.treeCrownHeight.min, s.treeCrownHeight.max);
      const cr = rng.range(s.treeCrownRadius.min, s.treeCrownRadius.max);
      place(m.trunks, ti, x, 0, z, 0.18, s.treeTrunkHeight, 0.18);
      place(m.crowns, ti, x, s.treeTrunkHeight * 0.8, z, cr, ch, cr);
      tint(m.crowns, ti, rng.pick(visual.crowns));
      ti++;
    }
  }
  m.trunks.count = m.crowns.count = ti;

  for (const key in m) {
    const mesh = m[key];
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
}
