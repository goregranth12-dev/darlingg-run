import * as THREE from 'three';

function roundedRect(w, h, r, y0) {
  const s = new THREE.Shape();
  const x = -w / 2;
  s.moveTo(x + r, y0);
  s.lineTo(x + w - r, y0);
  s.absarc(x + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y0 + h - r);
  s.absarc(x + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y0 + h);
  s.absarc(x + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y0 + r);
  s.absarc(x + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * A rounded, bevelled phone-case slab: base on y=0, centred on x/z, the printed back
 * face towards +Z. Group 0 = printed caps, group 1 = edge. Shared by buildings and obstacles.
 */
export function buildCaseGeometry(config) {
  const c = config.scenery.cases;
  const outline = roundedRect(c.width - 2 * c.bevel, c.height - 2 * c.bevel, c.corner, c.bevel);
  return new THREE.ExtrudeGeometry(outline, {
    depth: c.depth,
    bevelEnabled: true,
    bevelThickness: c.bevel,
    bevelSize: c.bevel,
    bevelSegments: c.bevelSegments,
    curveSegments: 8,
  }).translate(0, 0, -c.depth / 2);
}

/** Full slab thickness including the bevel on both sides. */
export const caseThickness = (config) => config.scenery.cases.depth + 2 * config.scenery.cases.bevel;
