import * as THREE from 'three';

const dummy = new THREE.Object3D();
const color = new THREE.Color();

const place = (mesh, i, x, y, z, sx, sy, sz, ry = 0) => {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, ry, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
};

const tint = (mesh, i, hex) => mesh.setColorAt(i, color.setHex(hex));
const kitThickness = (cs) => cs.depth + 2 * cs.bevel;

/** Instance capacities needed per chunk, derived from Config. */
export function instanceCaps(config) {
  const s = config.scenery;
  const lamps = Math.ceil(config.world.chunkLength / s.lampSpacing) * 2;
  return {
    cases: s.maxInstancesPerSide * 2,
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
  const cs = s.cases;
  const cases = [m.caseA, m.caseB, m.caseC];
  const used = [0, 0, 0];
  for (let side = -1; side <= 1; side += 2) {
    const n = rng.int(s.buildingsPerSide.min, s.buildingsPerSide.max);
    const slot = L / n;
    for (let i = 0; i < n; i++) {
      const scale = Math.min(rng.range(cs.scale.min, cs.scale.max), (slot * 0.95) / cs.width);
      const spare = slot - cs.width * scale;
      const z = -L / 2 + (i + 0.5) * slot + rng.range(-1, 1) * spare * 0.5;
      const v = rng.int(0, 2);
      // +z face (the printed back) turns toward the road
      const x = side * (edge + (kitThickness(cs) * scale) / 2);
      place(cases[v], used[v]++, x, 0, z, scale, scale, scale, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
  }
  for (let v = 0; v < 3; v++) cases[v].count = used[v];

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
