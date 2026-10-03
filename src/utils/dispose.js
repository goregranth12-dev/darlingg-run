// Helpers for releasing GPU resources.

const TEXTURE_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];

export function disposeMaterial(material) {
  if (!material) return;
  for (let i = 0; i < TEXTURE_KEYS.length; i++) {
    const tex = material[TEXTURE_KEYS[i]];
    if (tex) tex.dispose();
  }
  material.dispose();
}

/** Disposes every geometry and material under root (including root). */
export function disposeObject(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      if (Array.isArray(node.material)) node.material.forEach(disposeMaterial);
      else disposeMaterial(node.material);
    }
    if (node.isInstancedMesh) node.dispose();
  });
}

/** Disposes a flat list of geometries / materials / textures. */
export function disposeAll(resources) {
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    if (r.isMaterial) disposeMaterial(r);
    else r.dispose();
  }
}
