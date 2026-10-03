// Single source of truth for every tunable. Distances are in world units
// (~metres), time in seconds unless a key ends in Ms / Px. Deep-frozen.

const deepFreeze = (obj) => {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(obj);
};

export const Config = deepFreeze({
  player: {
    baseSpeed: 14, // units/sec at start
    maxSpeed: 34, // units/sec cap
    speedIncreasePerSecond: 0.12, // reaches max after ~170s
    strideRate: 0.55, // run-cycle radians per unit travelled
    bobHeight: 0.07, // vertical run bob
    standHeight: 2.2, // collision height while running/jumping (head tip is cosmetic)
    halfWidth: 0.25, // collision half extents (x / z)
    halfDepth: 0.3,
    runLean: -0.12, // forward lean (rad)
    deadLean: -1.35, // how far the runner topples forward after a crash (rad)
    laneLean: 0.05, // roll into lane switches (rad per unit of lateral error)
    poseDamping: 22, // how fast limbs blend between poses
  },

  lanes: {
    laneWidth: 2.4,
    laneCount: 3,
    laneSwitchSpeed: 13, // damping lambda for x movement (higher = snappier)
    bumpDistance: 0.35, // sideways nudge when pushing against the edge
    bumpDuration: 0.2,
    bumpTilt: 0.35, // roll (rad) during the bump
  },

  jump: {
    jumpVelocity: 16,
    gravity: 36,
    fastFallVelocity: -32, // downward speed when pressing down mid-air
    coyoteTimeMs: 90, // grace after leaving the ground
    inputBufferMs: 150, // jump pressed this long before landing still fires
  },

  slide: {
    slideDuration: 0.7,
    slideHeightScale: 0.45, // player height multiplier while sliding
    slideLean: -0.5,
    squashDamping: 28,
  },

  camera: {
    near: 0.3,
    far: 600,
    offset: { x: 0, y: 4.4, z: 7.6 }, // behind/above the player
    lookAhead: 9, // look-at distance in front of the player
    lookHeight: 1.1,
    followDamping: 7, // x/y smoothing lambda
    laneFollow: 0.55, // fraction of the player's x the camera tracks
    sway: 0.12, // camera roll per unit of lateral error
    swayDamping: 6,
    fov: 62,
    fovBoost: 12, // extra degrees at max speed
    fovDamping: 3,
    speedPullback: 1.4, // extra distance behind at max speed
    introSeconds: 2.2, // cinematic -> gameplay camera blend
    cinematic: {
      distance: 5.4, // from the flamingo, in front of it looking back at the chase
      height: 1.4,
      angle: 0.55, // radians off the running direction (front 3/4 view)
      orbit: 0.3, // slow sway amplitude (rad)
      orbitSpeed: 0.5,
      lookHeight: 1.3,
      lookBack: 0.3, // look-at point this far behind the flamingo
      fov: 52,
    },
    outro: { // game-over shot: the camera swings round behind and beside the fallen flamingo
      distance: 7,
      height: 2.5,
      angle: 0.75,
      orbit: 0.12,
      orbitSpeed: 0.5,
      lookHeight: 1.3,
      lookBack: 1.5, // look-at point this far ahead of the focus
      fov: 54,
    },
    portraitFov: 88, // used when the viewport is narrow
    portraitPullback: 0.45, // fractional extra distance in portrait
    portraitBlendRange: 0.5, // aspect span (below 1.0) over which portrait kicks in
  },

  world: {
    seed: 1337,
    chunkLength: 40,
    chunksAhead: 7,
    chunksBehind: 2,
    fogNear: 70,
    fogFar: 230,
    originShiftThreshold: 4000, // |player z| beyond which the world is re-centred
    sidewalkWidth: 2.2,
    sidewalkHeight: 0.15,
    groundSize: 600,
    roadDash: 2.5, // lane-dash length and gap (chunkLength must be a multiple of dash+gap)
    roadDashGap: 2.5,
    roadLineWidth: 0.24,
    roadRailWidth: 0.3, // pink edge rails
    roadTexturePxPerUnit: 40,
    roadSpotSpacing: 1.5, // cheetah rosettes on a jittered grid, this far apart
    roadSpotRadius: 0.5,
    roadHairs: 7000, // short fur strokes drawn over the fur
    maxAnisotropy: 8,
  },

  scenery: {
    buildingsPerSide: { min: 3, max: 5 },
    buildingGap: 1.2, // between sidewalk and building
    // Giant phone cases standing on edge, back (pattern + camera plate) facing the road.
    cases: {
      width: 4.4,
      height: 10,
      depth: 1.1, // flat thickness; bevel adds to both sides
      bevel: 0.3,
      bevelSegments: 2,
      corner: 1.1, // corner radius of the case outline
      scale: { min: 1.0, max: 2.0 }, // uniform, keeps phone proportions
      turn: 0.5, // radians the printed face is turned from the road towards the oncoming player
      texturePx: 384, // texture width in px (height follows the aspect ratio)
    },
    lampSpacing: 10,
    lampHeight: 4.6,
    lampArm: 0.9,
    lampRadius: 0.07,
    lampHeadSize: 0.5,
    treesPerSide: { min: 0, max: 2 },
    treeTrunkHeight: 1.2,
    treeCrownHeight: { min: 2, max: 3.4 },
    treeCrownRadius: { min: 0.9, max: 1.4 },
    maxInstancesPerSide: 6, // buffer size for instanced scenery (>= max counts above)
  },

  lighting: {
    sunIntensity: 2.4,
    sunPosition: { x: -14, y: 22, z: 10 }, // offset from the player
    hemiIntensity: 1.1,
    shadowMapSize: 2048,
    mobileShadowMapSize: 1024,
    shadowExtent: 14, // half-size of the orthographic shadow box
    shadowNear: 1,
    shadowFar: 70,
    shadowBias: -0.0005,
    shadowRadius: 3,
    exposure: 1.0,
  },

  renderer: {
    maxPixelRatio: 2,
  },

  collision: {
    graze: 0.22, // overlap shallower than this on any axis is a near-miss and does not count
  },

  obstacles: {
    seed: 0, // 0 = random every run
    startDistance: 70, // first row this far ahead of the start
    spawnAhead: 125, // rows spawn this far in front of the player
    despawnBehind: 14, // and are recycled this far behind
    poolPerType: 30, // pooled instances per obstacle type
    gapSeconds: { start: 2.2, min: 1.3 }, // time between rows, shrinks with speed
    wideGateChance: 0.14, // chance a row is a full-width jump/slide gate
    passLaneEmptyChance: 0.5, // the guaranteed-passable lane is empty this often
    fill: { start: 0.42, end: 0.78 }, // chance each other lane holds an obstacle
    typeWeights: { low: 0.3, high: 0.3, block: 0.4 },
    types: {
      // jump over: player feet must be above `height`
      low: { width: 1.3, height: 2.2, depth: 0.6, thickness: 0.22 }, // jump over: orange fan, purple fan or leather bear (random)
      // slide under: gap below the beam is `clearance`, shorter than standing, taller than sliding
      // slide under: the Darlingg flower arch. Opening is `clearance` high, so standing runners
      // hit it and sliders pass; the arch reaches above the jump apex so it cannot be hopped.
      high: { width: 2.2, clearance: 1.4, height: 4.2, depth: 0.5, post: 0.5, corner: 0.6, bevel: 0.1 },
      // dodge by changing lane
      block: { width: 1.8, height: 4.2, depth: 0.8 }, // standing phone case (cherry or player), taller than the jump apex
    },
  },

  coins: {
    spawnChance: 0.8, // chance a gap between rows holds a coin pattern
    maxActive: 160,
    radius: 0.8, // pickup radius
    thickness: 0.2,
    size: 1.6, // coin diameter (big and easy to see)
    height: 1.3, // coin centre above the road
    spacing: 3.6, // between coins in a pattern (coins are 1.6 wide, so there is clear space)
    margin: 4, // keep coins this far from obstacle rows
    spinSpeed: 3.2, // rad/sec
    maxArcCoins: 7, // cap for the jump-arc pattern (count follows the spacing)
    arcScale: 0.85, // arc height relative to the real jump arc (forgiving)
    patternWeights: { line: 0.45, step: 0.25, arc: 0.3 }, // arc only after a low obstacle
    color: 0xffc43c, // gold (sparkle colour)
    emissive: 0xff8a00, // keeps the yellow rich under the dusk light
    burst: { count: 10, speed: 4.5, life: 0.45, size: 0.22, gravity: 9, max: 80 },
  },

  score: {
    pointsPerUnit: 1, // distance points
    coinValue: 10,
    storageKey: 'darlinggRun.best',
  },

  input: {
    swipeThresholdPx: 28,
    swipeMaxTimeMs: 350,
  },

  game: {
    maxDeltaTime: 1 / 20, // dt clamp (tab switches, hitches)
    fpsSmoothing: 0.1,
    debugUpdateIntervalMs: 250,
    debugKey: 'Backquote',
    restartDelay: 0.7, // seconds before game over accepts a restart
    crashSeconds: 1.7, // crash stumble + camera swing before the game-over screen
  },

  // Original "neon dusk" palette.
  visual: {
    skyTop: 0x1a1446,
    skyMid: 0x7b3a92,
    skyHorizon: 0xf0846a,
    sunColor: 0xffc58b,
    sunRadius: 26,
    sunDistance: 420,
    sunHeight: 0.07, // fraction of distance above the horizon
    skyRadius: 500,
    fogColor: 0xd9788a,
    hemiSky: 0xa3a8ff,
    hemiGround: 0x3b2a4d,
    sunLight: 0xffd2a1,
    ground: 0x5c2748,
    road: { pink: 0xee7ba6, pinkDark: 0xcf3f7c, pinkLight: 0xf8a8c8, beige: 0xf7e6c6, beigeDark: 0xe9cfa6, dash: 0xffd9e6, dashShadow: 0xb8386a, rail: 0xf06a9a, railLight: 0xffa6c6 },
    sidewalk: 0xf3a9c3,
    cases: {
      lemon: { base: 0xfbeec2, fruit: 0xf6a81e, plate: 0xa9a2ab, lens: 0x1b1626, ring: 0xd9d6dc, flash: 0xfff0d0, text: 0xd9a56a, edge: 0xfbeec2 },
      stripes: { a: 0xd91f35, b: 0xff93a8, plate: 0xf0c9b4, lens: 0x15151a, ring: 0x3a3a42, flash: 0xfff3e0, edge: 0xd91f35 },
      cheetah: { base: 0x1b1c33, plate: 0xe9d1bd, lens: 0x101015, ring: 0xf0e0cf, flash: 0xffffff, fur: 0xe8b872, spot: 0x4a2a14, cream: 0xf6e3c2, cherry: 0xc4102a, stem: 0x5a3a24, edge: 0x1b1c33 },
      charm: { plate: 0xc9ccd2, lens: 0x14141a, ring: 0x8e9096, flash: 0xf4f4f6, base: 0xe9dcc6, edge: 0xe9dcc6, red: 0xd0102a, leaf: 0x4f9a2c, cup: 0xb9dc7a, cupDark: 0x8fc060, silver: 0xb9bcc4, tag: 0xff5fa2, tagLight: 0xffd0e0, croissant: 0xf0953c, croissantDark: 0xd77422, leopard: 0xe8a84a, spot: 0x3a2412, glass: 0x23232a },
      cherry: { plate: 0xc9ccd2, lens: 0x14141a, ring: 0x8e9096, flash: 0xf4f4f6, a: 0xe0304a, b: 0x9d0d20, fruit: 0xd01030, shine: 0xffd7de, stem: 0x8aa84a, bow: 0xf0506e, bowDark: 0xc23a56, edge: 0xb3162b },
    },
    coin: { face: 0xf1e9e2, rim: 0xffb01f, logo: 0xffb01f }, // orange-yellow rim and logo around a warm white face
    arch: {
      pink: 0xf15a98, text: 0xf5d6a0, textShade: 0xd9892a,
      pearls: [0xf6a9c8, 0xfdf1ea, 0xe83e8c, 0xf2c4d6, 0xfae3d8],
      hearts: [0xf0357f, 0xf783ad, 0xe8508f],
      bow: 0xf56aa0,
      beads: [0xe83e8c, 0xfbe9e2, 0xf6a9c8],
    },
    bear: { leather: 0xc0652b, snout: 0xf2e2c4, dark: 0x14110f, gold: 0xe6a77a },
    fans: {
      dark: 0x1c1b22,
      orange: { body: 0xff9a3c, ring: 0xf26a1b, hub: 0xffb35c, spoke: 0xf0a24a },
      purple: { body: 0xc79be8, ring: 0xa56ad6, hub: 0xd8b6f2, spoke: 0xe3a76c },
    },
    lampPole: 0x2a2838,
    lampLight: 0xffe3a8,
    trunk: 0x4a3a35,
    crowns: [0x2f8f6b, 0x3aa57a, 0x27795f],
    player: {
      body: 0xf5427a, // raspberry pink
      edge: 0xffb3cf, // pale pink feather trim
      beak: 0xffa5c0,
      beakTip: 0x1b1b24,
      eyeWhite: 0xfffaf5,
      pupil: 0x15151c,
      shoe: 0xd62856,
      sole: 0x7a1730,
      fur: 0xffc3d6,
      gold: 0xf2b632,
    },
  },
});
