import { Config } from './Config.js';
import { EventBus } from './EventBus.js';
import { GameLoop } from './GameLoop.js';
import { Renderer } from './Renderer.js';
import { CameraRig } from './CameraRig.js';
import { InputManager } from '../input/InputManager.js';
import { LaneSystem } from '../world/LaneSystem.js';
import { WorldManager } from '../world/WorldManager.js';
import { Player } from '../player/Player.js';
import { ObstacleManager } from '../obstacles/ObstacleManager.js';
import { CoinManager } from '../collectibles/CoinManager.js';
import { CollisionManager } from '../collision/CollisionManager.js';
import { ScoreManager } from '../score/ScoreManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';

export const GameState = Object.freeze({ RUNNING: 'running', PAUSED: 'paused' });

// Composition root: owns every system and runs the per-frame update order.
export class Game {
  constructor(container) {
    this.config = Config;
    this.bus = new EventBus();
    this.state = GameState.RUNNING;

    this.view = new Renderer(container, Config);
    this.lanes = new LaneSystem(Config);
    this.world = new WorldManager(this.view.scene, Config, this.lanes, this.view.renderer);
    this.player = new Player(Config, this.bus, this.lanes);
    this.view.scene.add(this.player.group);
    this.cameraRig = new CameraRig(this.view.camera, Config);
    this.input = new InputManager(this.view.renderer.domElement, Config);

    // stubs (M2/M3/M5)
    this.obstacles = new ObstacleManager(Config, this.bus);
    this.coins = new CoinManager(Config, this.bus);
    this.collision = new CollisionManager(Config, this.bus);
    this.score = new ScoreManager(Config, this.bus);
    this.audio = new AudioManager(Config, this.bus);
    this.managers = [this.obstacles, this.coins, this.collision, this.score];

    this.ui = new UIManager(Config, this.bus);
    this.loop = new GameLoop(Config, (dt) => this.frame(dt));
    this._onAction = (action) => this.player.handleAction(action);
    this._onVisibility = () => (document.hidden ? this.pause() : this.resume());
    document.addEventListener('visibilitychange', this._onVisibility);

    this.managers.forEach((m) => m.init());
    this.audio.init();
    this.world.update(this.player.z);
  }

  start() {
    this.loop.start();
  }

  pause() {
    if (this.state === GameState.PAUSED) return;
    this.state = GameState.PAUSED;
    this.input.clear();
    this.bus.emit('paused');
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.RUNNING;
    this.loop.resetClock();
    this.bus.emit('resumed');
  }

  frame(dt) {
    if (this.state === GameState.RUNNING) this.update(dt);
    this.render();
  }

  // Order: input -> player (speed, lanes, jump/slide) -> world -> managers
  // (spawn, collision, score) -> camera -> sky/light -> UI.
  update(dt) {
    const player = this.player;
    this.input.drain(this._onAction);
    player.update(dt);

    if (-player.z > this.config.world.originShiftThreshold) this.shiftOrigin();
    this.world.update(player.z);

    for (let i = 0; i < this.managers.length; i++) this.managers[i].update(dt, player);

    this.cameraRig.update(dt, player, player.speedRatio, this.view.aspect);
    this.world.sky.follow(this.view.camera);
    this.view.followLight(player.x, 0, player.z);
    this.ui.update(dt, this);
  }

  /** Re-centres the world near z=0 (whole chunks) so floats stay precise. */
  shiftOrigin() {
    const L = this.config.world.chunkLength;
    const dz = Math.floor(-this.player.z / L) * L;
    this.player.shiftOrigin(dz);
    this.cameraRig.shiftOrigin(dz);
    this.world.shiftOrigin(dz);
    this.view.shiftOrigin(dz);
    this.managers.forEach((m) => m.shiftOrigin(dz));
  }

  render() {
    this.view.render();
  }

  dispose() {
    this.loop.stop();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.input.dispose();
    this.managers.forEach((m) => m.dispose());
    this.audio.dispose();
    this.ui.dispose();
    this.player.dispose();
    this.world.dispose();
    this.view.dispose();
    this.bus.clear();
  }
}
