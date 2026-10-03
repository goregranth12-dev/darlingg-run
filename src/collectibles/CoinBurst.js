import * as THREE from 'three';

// Small pooled sparkle burst for coin pickups (one Points draw call).
export class CoinBurst {
  constructor(scene, config) {
    this.scene = scene;
    this.cfg = config.coins.burst;
    this.color = new THREE.Color(config.coins.color);
    const n = this.cfg.max;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.next = 0;
    this.alive = 0;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: this.cfg.size,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.reset();
  }

  reset() {
    this.life.fill(0);
    this.colors.fill(0);
    this.positions.fill(-1000);
    this.alive = 0;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  emit(x, y, z) {
    const c = this.cfg;
    for (let k = 0; k < c.count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % c.max;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const s = c.speed * (0.4 + Math.random() * 0.6);
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = Math.random() * s + 1;
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.life[i] = c.life;
    }
  }

  update(dt) {
    const c = this.cfg;
    let alive = 0;
    for (let i = 0; i < c.max; i++) {
      const life = this.life[i];
      if (life <= 0) continue;
      alive++;
      const nl = life - dt;
      this.life[i] = nl;
      const j = i * 3;
      this.vel[j + 1] -= c.gravity * dt;
      this.positions[j] += this.vel[j] * dt;
      this.positions[j + 1] += this.vel[j + 1] * dt;
      this.positions[j + 2] += this.vel[j + 2] * dt;
      const f = Math.max(0, nl / c.life);
      this.colors[j] = this.color.r * f;
      this.colors[j + 1] = this.color.g * f;
      this.colors[j + 2] = this.color.b * f;
    }
    if (alive > 0 || this.alive > 0) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
    this.alive = alive;
  }

  shiftOrigin(dz) {
    for (let i = 0; i < this.cfg.max; i++) if (this.life[i] > 0) this.positions[i * 3 + 2] += dz;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
