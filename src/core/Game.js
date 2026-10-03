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
import { Action } from '../input/Action.js';

export const GameState = Object.freeze({
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  CRASHED: 'crashed', // just hit something: camera swings round before the game-over screen
  GAMEOVER: 'gameover',
});

// Composition root: owns every system and runs the per-frame update order.
export class Game {
  constructor(container) {
    this.config = Config;
    this.bus = new EventBus();
    this.state = GameState.READY;
    this.stateTime = 0;

    this.view = new Renderer(container, Config);
    this.lanes = new LaneSystem(Config);
    this.world = new WorldManager(this.view.scene, Config, this.lanes, this.view.renderer);
    this.player = new Player(Config, this.bus, this.lanes);
    this.view.scene.add(this.player.group);
    this.cameraRig = new CameraRig(this.view.camera, Config);
    this.input = new InputManager(this.view.renderer.domElement, Config);

    // gameplay systems (audio is still a stub)
    this.obstacles = new ObstacleManager(Config, this.bus);
    this.coins = new CoinManager(Config, this.bus);
    this.collision = new CollisionManager(Config, this.bus);
    this.score = new ScoreManager(Config, this.bus);
    this.audio = new AudioManager(Config, this.bus);
    this.managers = [this.obstacles, this.coins, this.collision, this.score];

    this.loop = new GameLoop(Config, (dt) => this.frame(dt));
    this._onAction = (action) => this.handleAction(action);
    this._onVisibility = () => (document.hidden ? this.pause() : this.resume());
    document.addEventListener('visibilitychange', this._onVisibility);

    this.obstacles.init(this.view.scene, this.lanes);
    this.coins.init(this.view.scene, this.lanes);
    this.collision.init(this.obstacles, this.coins);
    this.score.init();
    this.audio.init();
    this.ui = new UIManager(Config, this.bus);
    this.ui.bindScore(this.score);
    this.bus.on('playerHit', () => this.gameOver());

    this.enterReady();
  }

  start() {
    this.loop.start();
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
    this.bus.emit('stateChanged', state);
  }

  /** Opening shot: the flamingo runs on a cinematic camera, waiting for a tap. */
  enterReady() {
    this.resetRun();
    this.cameraRig.setCinematic(true);
    this.setState(GameState.READY);
  }

  /** Puts everything back at the start line (also used for restart). */
  resetRun() {
    this.player.reset();
    this.world.reset();
    this.managers.forEach((m) => m.reset());
    this.cameraRig.reset();
    this.world.update(this.player.z);
    this.syncPresentation(0);
    this.input.clear();
  }

  handleAction(action) {
    if (this.state === GameState.RUNNING) {
      this.player.handleAction(action);
    } else if (action === Action.TAP || action === Action.JUMP) {
      this.tryStart();
    }
  }

  tryStart() {
    if (this.state === GameState.READY) {
      // the flamingo is already running: begin a fresh run from here and ease into the game camera
      const p = this.player;
      this.obstacles.reset(p.z);
      this.coins.reset();
      this.score.reset();
      p.distance = 0;
      p.speed = this.config.player.baseSpeed;
      this.cameraRig.beginIntro();
    } else if (this.state === GameState.GAMEOVER) {
      if (this.stateTime < this.config.game.restartDelay) return;
      this.resetRun();
      this.cameraRig.setCinematic(false);
    } else {
      return;
    }
    this.setState(GameState.RUNNING);
  }

  gameOver() {
    if (this.state !== GameState.RUNNING) return;
    this.player.die();
    this.bus.emit('gameOver', this.score.score); // ScoreManager finalises the best first
    this.cameraRig.beginOutro(); // swing round to the outro angle
    this.setState(GameState.CRASHED);
  }

  pause() {
    if (this.state !== GameState.RUNNING) return;
    this.state = GameState.PAUSED;
    this.input.clear();
    this.bus.emit('paused');
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.RUNNING;
    this.stateTime = 0;
    this.input.clear();
    this.loop.resetClock();
    this.bus.emit('resumed');
  }

  frame(dt) {
    this.stateTime += dt;
    switch (this.state) {
      case GameState.RUNNING:
        this.update(dt);
        break;
      case GameState.READY:
        this.input.drain(this._onAction); // start tap
        this.updateReady(dt);
        break;
      case GameState.CRASHED:
        this.updateCrashed(dt);
        break;
      case GameState.GAMEOVER:
        this.input.drain(this._onAction); // restart tap
        this.updateCrash(dt);
        break;
      default:
        break;
    }
    this.render();
  }

  // Order: input -> player (speed, lanes, jump/slide) -> world -> managers
  // (spawn, collision, score) -> camera -> sky/light -> UI.
  update(dt) {
    const player = this.player;
    this.input.drain(this._onAction);
    if (this.state !== GameState.RUNNING) return; // an action may have changed state
    player.update(dt);

    if (-player.z > this.config.world.originShiftThreshold) this.shiftOrigin();
    this.world.update(player.z);

    for (let i = 0; i < this.managers.length; i++) this.managers[i].update(dt, player);

    this.syncPresentation(dt);
    this.ui.update(dt, this);
  }

  /** Opening shot: the world scrolls and the flamingo runs towards the cinematic camera. */
  updateReady(dt) {
    const player = this.player;
    player.update(dt);
    player.speed = this.config.player.baseSpeed;
    if (-player.z > this.config.world.originShiftThreshold) this.shiftOrigin();
    this.world.update(player.z);
    this.syncPresentation(dt);
    this.ui.update(dt, this);
  }

  /** The flamingo finishes its stumble while the camera swings round; then the game-over screen. */
  updateCrashed(dt) {
    this.player.update(dt);
    this.coins.burst.update(dt);
    this.syncPresentation(dt);
    if (this.stateTime >= this.config.game.crashSeconds) this.setState(GameState.GAMEOVER);
  }

  /** Game-over screen: the world is still; the camera holds the outro angle. */
  updateCrash(dt) {
    this.player.update(dt);
    this.coins.burst.update(dt);
    this.syncPresentation(dt);
  }

  syncPresentation(dt) {
    const player = this.player;
    this.cameraRig.update(dt, player, player.speedRatio, this.view.aspect);
    this.world.sky.follow(this.view.camera);
    this.view.followLight(player.x, 0, player.z);
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
