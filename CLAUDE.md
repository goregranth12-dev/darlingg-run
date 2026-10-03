# Darlingg Run

3D endless runner. Vanilla JS (ES modules) + Three.js (pinned `0.186.1`) + Vite. No frameworks, no TypeScript.
All art is original procedural placeholder geometry; no external assets.

## Commands
- `npm install`
- `npm run dev`      Vite dev server, exposed on LAN (`--host`). Debug overlay: `?debug=1` or backtick key.
- `npm run build`    production build to `dist/` (run before declaring any milestone done)
- `npm run preview`  serve the build, also on LAN

## Architecture
`Game` (src/core/Game.js) is the composition root: it owns every system and runs the frame.

Frame order (`Game.update`): input drain -> `Player.update` (speed ramp, lanes, jump/slide) -> origin shift check ->
`WorldManager.update` (recycle chunks) -> stub managers (obstacles, coins, collision, score) -> `CameraRig` ->
sky/light follow -> UI. Render happens after update, even while paused.

- `core/`: Config (ALL tunables, deep-frozen), EventBus (sync, 2-arg emit), GameLoop (rAF, dt clamp, FPS),
  Renderer (renderer/scene/camera/lights/resize), CameraRig (chase cam), Game.
- `player/`: Player (physics, lanes, bump), PlayerStateMachine (state + jump buffer/coyote/slide timers), PlayerModel (procedural mesh/poses).
- `input/`: InputManager (ring-buffer action queue), KeyboardInput, SwipeInput (pointer events), Action enum.
- `world/`: WorldManager (chunk pool, origin shift, ground), GroundChunk (road + instanced scenery),
  ChunkBuilder (seeded scenery placement), SceneryKit (shared geometry/materials/road texture), LaneSystem, Sky.
- `obstacles/ collectibles/ collision/ score/ audio/`: stubs with the final public interface (`init/update/shiftOrigin/reset/dispose`).
- `ui/`: UIManager (minimal), DebugOverlay.
- `utils/`: ObjectPool, math (clamp/lerp/damp), rng (seeded mulberry32), dispose helpers.

### World approach
Player moves along -Z; chunks (`chunkLength`) are pooled and recycled ahead of the player. When `|z|` exceeds
`world.originShiftThreshold`, `Game.shiftOrigin` moves everything back by a whole number of chunks (player, camera,
chunks, light, and every manager's `shiftOrigin(dz)` hook). Chunk scenery is seeded by `hash(world.seed, absoluteChunkIndex)`.
Any new spawner (obstacles, coins) MUST implement `shiftOrigin(dz)`.

## Conventions
- No magic numbers: every tunable goes in `src/core/Config.js`, grouped and commented.
- Files stay under ~300 lines; one responsibility per module.
- No allocations in per-frame code (`update`): preallocate vectors/scratch objects, pool anything spawned repeatedly.
- Frame-rate independent: use `dt` and `damp()`; `dt` is clamped to `game.maxDeltaTime`.
- Dispose geometries/materials/textures via `utils/dispose.js`. Shared resources are owned (and disposed) by their kit.
- Modules talk through direct calls from Game downward and `EventBus` events sideways
  (`jump slide land laneChange laneBump paused resumed`; reserved: `coinCollected gameOver`).
- Dev only: `window.__game` is exposed by `main.js` under `import.meta.env.DEV`.
- Three.js notes: `PCFSoftShadowMap` was removed in r18x (use `PCFShadowMap`).

## Roadmap
- [x] M1 playable core (this)
- [ ] M2 obstacles (low/high/full-block), pooling, collision, game over + restart
- [ ] M3 coins + patterns, score, difficulty ramp, coin particles
- [ ] M4 start screen, HUD, pause, game-over screen, high score (localStorage)
- [ ] M5 polish: screen shake, camera effects, materials, audio, post-processing
- [ ] M6 final original character/environment assets
