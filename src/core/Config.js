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
    jumpVelocity: 10.5,
    gravity: 32,
    fastFallVelocity: -24, // downward speed when pressing down mid-air
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
    roadLineWidth: 0.12,
    roadTexturePxPerUnit: 24,
    maxAnisotropy: 8,
  },

  scenery: {
    buildingsPerSide: { min: 3, max: 5 },
    buildingWidth: { min: 5, max: 9 },
    buildingDepth: { min: 6, max: 12 },
    buildingHeight: { min: 6, max: 26 },
    buildingGap: 1.2, // between sidewalk and building
    signChance: 0.7,
    signSize: { w: 3, h: 0.5, d: 0.2 },
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

  obstacles: {
    seed: 0, // 0 = random every run
    startDistance: 70, // first row this far ahead of the start
    spawnAhead: 125, // rows spawn this far in front of the player
    despawnBehind: 14, // and are recycled this far behind
    poolPerType: 30, // pooled instances per obstacle type
    gapSeconds: { start: 1.9, min: 1.05 }, // time between rows, shrinks with speed
    wideGateChance: 0.14, // chance a row is a full-width jump/slide gate
    passLaneEmptyChance: 0.45, // the guaranteed-passable lane is empty this often
    fill: { start: 0.5, end: 0.85 }, // chance each other lane holds an obstacle
    typeWeights: { low: 0.3, high: 0.3, block: 0.4 },
    types: {
      // jump over: player feet must be above `height`
      low: { width: 1.9, height: 0.85, depth: 0.6, capHeight: 0.1 },
      // slide under: gap below the beam is `clearance`, shorter than standing, taller than sliding
      high: { width: 2.0, clearance: 1.15, beamHeight: 1.1, depth: 0.7, pylonWidth: 0.18, pylonHeight: 2.6 },
      // dodge by changing lane
      block: { width: 1.9, height: 3.0, depth: 2.2 },
    },
    visual: {
      lowStripeA: 0xffc93c,
      lowStripeB: 0x2a2838,
      lowCap: 0xff8a3c,
      highBeam: 0xff5fa2,
      highPylon: 0x2a2838,
      block: 0xe8584f,
      blockRib: 0x9c2f3a,
      texturePx: 64,
    },
  },

  coins: {
    spawnChance: 0.8, // chance a gap between rows holds a coin pattern
    maxActive: 160,
    radius: 0.42,
    thickness: 0.1,
    height: 0.95, // coin centre above the road
    spacing: 2.0, // between coins in a pattern
    margin: 4, // keep coins this far from obstacle rows
    spinSpeed: 3.2, // rad/sec
    arcCoins: 6, // coins in the jump-arc pattern
    arcScale: 0.85, // arc height relative to the real jump arc (forgiving)
    patternWeights: { line: 0.45, step: 0.25, arc: 0.3 }, // arc only after a low obstacle
    color: 0xffc93c,
    emissive: 0xb8741a,
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
    ground: 0x211a30,
    road: 0x2c2d3d,
    roadLine: 0xf2eedd,
    sidewalk: 0x5d5a74,
    buildings: [0x3b3f63, 0x4a3f6b, 0x2f4d6b, 0x5a4570, 0x35546a, 0x483a5e],
    signs: [0x32e6c8, 0xff5fa2, 0xffd25a, 0x7a8cff],
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
