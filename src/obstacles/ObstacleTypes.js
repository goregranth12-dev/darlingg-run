// Obstacle variants and their collision volumes (derived from Config).
export const ObstacleType = Object.freeze({
  LOW: 0, // jump over
  HIGH: 1, // slide under
  BLOCK: 2, // change lane
});

const NAMES = ['low', 'high', 'block'];

/** Collision extents per type: [halfW, halfD, yMin, yMax]. */
export function buildBounds(config) {
  const t = config.obstacles.types;
  return [
    { halfW: t.low.width / 2, halfD: t.low.depth / 2, yMin: 0, yMax: t.low.height },
    { halfW: t.high.width / 2, halfD: t.high.depth / 2 + t.high.bevel, yMin: t.high.clearance, yMax: t.high.height },
    { halfW: t.block.width / 2, halfD: t.block.depth / 2, yMin: 0, yMax: t.block.height },
  ];
}

export const typeName = (type) => NAMES[type];
