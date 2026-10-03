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
    standHeight: 2.0, // used by collision in M2
    runLean: -0.12, // forward lean (rad)
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
    // TODO(M2): spawnInterval, minGap, difficultyRamp, variants
  },

  coins: {
    // TODO(M3): spawnFrequency, patterns
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
      suit: 0xff5fa2,
      limbs: 0x3a2f6b,
      skin: 0xf4c9a5,
      scarf: 0xffd25a,
      visor: 0x32e6c8,
      shoe: 0xf2eedd,
    },
  },
});
