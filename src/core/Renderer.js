import * as THREE from 'three';

// Owns the WebGLRenderer, scene, camera, lights and resize handling.
export class Renderer {
  constructor(container, config) {
    this.config = config;
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.renderer.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.lighting.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(config.visual.fogColor, config.world.fogNear, config.world.fogFar);

    const cam = config.camera;
    this.camera = new THREE.PerspectiveCamera(cam.fov, 1, cam.near, cam.far);
    this.aspect = 1;

    this._buildLights();

    this._resizePending = false;
    this._onResize = () => this._scheduleResize();
    this.resizeObserver = new ResizeObserver(this._onResize);
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this._applySize();
  }

  _buildLights() {
    const { lighting, visual } = this.config;
    this.hemi = new THREE.HemisphereLight(visual.hemiSky, visual.hemiGround, lighting.hemiIntensity);
    this.scene.add(this.hemi);

    const mobile = window.matchMedia('(pointer: coarse)').matches;
    const mapSize = mobile ? lighting.mobileShadowMapSize : lighting.shadowMapSize;
    this.sun = new THREE.DirectionalLight(visual.sunLight, lighting.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(mapSize, mapSize);
    this.sun.shadow.bias = lighting.shadowBias;
    this.sun.shadow.radius = lighting.shadowRadius;
    const s = this.sun.shadow.camera;
    const e = lighting.shadowExtent;
    s.left = -e;
    s.right = e;
    s.top = e;
    s.bottom = -e;
    s.near = lighting.shadowNear;
    s.far = lighting.shadowFar;
    this.scene.add(this.sun, this.sun.target);
  }

  /** Keeps the shadow-casting sun centred on the player. */
  followLight(x, y, z) {
    const o = this.config.lighting.sunPosition;
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x + o.x, y + o.y, z + o.z);
  }

  shiftOrigin(dz) {
    this.sun.position.z += dz;
    this.sun.target.position.z += dz;
  }

  _scheduleResize() {
    if (this._resizePending) return;
    this._resizePending = true;
    requestAnimationFrame(() => {
      this._resizePending = false;
      this._applySize();
    });
  }

  _applySize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.config.renderer.maxPixelRatio));
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
