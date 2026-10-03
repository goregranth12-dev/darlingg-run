import * as THREE from 'three';
import { smoothstep } from '../utils/math.js';
import { disposeObject } from '../utils/dispose.js';

// Gradient dusk dome + low sun. Follows the camera so it's always at infinity.
export class Sky {
  constructor(scene, config) {
    const v = config.visual;
    const geo = new THREE.SphereGeometry(v.skyRadius, 24, 16);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(v.skyTop);
    const mid = new THREE.Color(v.skyMid);
    const hor = new THREE.Color(v.skyHorizon);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / v.skyRadius);
      if (t < 0.3) c.copy(hor).lerp(mid, smoothstep(t / 0.3));
      else c.copy(mid).lerp(top, smoothstep((t - 0.3) / 0.7));
      c.toArray(colors, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.group = new THREE.Group();
    const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
    }));
    dome.renderOrder = -2;
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(v.sunRadius, 24, 16),
      new THREE.MeshBasicMaterial({ color: v.sunColor, fog: false, depthWrite: false }),
    );
    sun.position.set(-v.sunDistance * 0.2, v.sunDistance * v.sunHeight, -v.sunDistance);
    sun.renderOrder = -1;
    this.group.add(dome, sun);
    this.group.frustumCulled = false;
    dome.frustumCulled = false;
    sun.frustumCulled = false;
    scene.add(this.group);
    this.scene = scene;
  }

  follow(camera) {
    this.group.position.copy(camera.position);
  }

  dispose() {
    this.scene.remove(this.group);
    disposeObject(this.group);
  }
}
