import * as THREE from 'three';

const dummy = new THREE.Object3D();

const place = (mesh, i, x, y, z, sx, sy, sz, ry = 0) => {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, ry, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
};

const kitThickness = (cs) => cs.depth + 2 * cs.bevel;

/** Instance capacities needed per chunk, derived from Config. */
export function instanceCaps(config) {
  const s = config.scenery;
  const lamps = Math.ceil(config.world.chunkLength / s.lampSpacing) * 2;
  return {
    cases: s.maxInstancesPerSide * 2,
    props: s.maxInstancesPerSide * 2,
    lamps,
  };
}

// Fills a chunk's instanced meshes with seeded, per-chunk scenery.
// Chunk-local space: z in [-L/2, L/2], x=0 is the road centre.
export function populateChunk(chunk, rng, config, lanes) {
  const { world, scenery: s } = config;
  const L = world.chunkLength;
  const roadHalf = lanes.roadWidth / 2;
  const m = chunk.meshes;

  place(m.sidewalks, 0, -(roadHalf + world.sidewalkWidth / 2), 0, 0, world.sidewalkWidth, world.sidewalkHeight, L);
  place(m.sidewalks, 1, roadHalf + world.sidewalkWidth / 2, 0, 0, world.sidewalkWidth, world.sidewalkHeight, L);
  m.sidewalks.instanceMatrix.needsUpdate = true;

  const edge = roadHalf + world.sidewalkWidth + s.buildingGap;
  const cs = s.cases;
  const thick = kitThickness(cs);
  const cases = [m.caseA, m.caseB, m.caseC, m.caseD, m.caseE];
  const used = [0, 0, 0, 0, 0];
  // Each chunk shows 3 of the 5 case designs: variety along the road, fewer draw calls.
  const first = rng.int(0, cases.length - 1);
  const picks = [first, (first + rng.int(1, 4)) % cases.length, (first + 2 + rng.int(0, 2)) % cases.length];
  for (let side = -1; side <= 1; side += 2) {
    const n = rng.int(s.buildingsPerSide.min, s.buildingsPerSide.max);
    const slot = L / n;
    for (let i = 0; i < n; i++) {
      // face turned `turn` rad from the road towards the oncoming player
      const sinT = Math.sin(cs.turn);
      const cosT = Math.cos(cs.turn);
      const alongZ = cs.width * cosT + thick * sinT; // footprint along the road at scale 1
      const scale = Math.min(rng.range(cs.scale.min, cs.scale.max), (slot * 0.95) / alongZ);
      const z = -L / 2 + (i + 0.5) * slot + rng.range(-1, 1) * (slot - alongZ * scale) * 0.5;
      const v = picks[rng.int(0, picks.length - 1)];
      const x = side * (edge + scale * ((cs.width / 2) * sinT + (thick / 2) * cosT));
      const ry = side * -(Math.PI / 2 - cs.turn);
      place(cases[v], used[v]++, x, 0, z, scale, scale, scale, ry);
    }
  }
  for (let v = 0; v < cases.length; v++) {
    cases[v].count = used[v];
    cases[v].visible = used[v] > 0; // skip the draw call for unused designs
  }

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

  // Roadside props on the sidewalk, between the lamps: hand-fan trees and signboards, turned like the cases.
  let fans = 0;
  let signs = 0;
  for (let side = -1; side <= 1; side += 2) {
    const n = Math.min(rng.int(s.propsPerSide.min, s.propsPerSide.max), slots);
    const start = rng.int(0, slots - 1);
    for (let k = 0; k < n; k++) {
      const z = -L / 2 + (((start + k) % slots) + 0.75) * s.lampSpacing + rng.range(-1, 1);
      const x = side * (roadHalf + world.sidewalkWidth * 0.6);
      const ry = side * -(Math.PI / 2 - cs.turn);
      if (rng.next() < 0.5) {
        const sc = rng.range(s.fanTree.scale.min, s.fanTree.scale.max);
        place(m.fanBody, fans, x, 0, z, sc, sc, sc, ry);
        place(m.fanCanopy, fans, x, 0, z, sc, sc, sc, ry);
        fans++;
      } else {
        const sc = rng.range(s.sign.scale.min, s.sign.scale.max);
        place(m.signBoard, signs, x, 0, z, sc, sc, sc, ry);
        place(m.signPost, signs, x, 0, z, sc, sc, sc, ry);
        signs++;
      }
    }
  }
  m.fanBody.count = m.fanCanopy.count = fans;
  m.signBoard.count = m.signPost.count = signs;
  for (const mesh of [m.fanBody, m.fanCanopy]) mesh.visible = fans > 0;
  for (const mesh of [m.signBoard, m.signPost]) mesh.visible = signs > 0;

  for (const key in m) {
    const mesh = m[key];
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
}
