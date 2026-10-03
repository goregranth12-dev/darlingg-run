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
`WorldManager.update` (recycle chunks) -> managers in order (obstacles, coins, collision, score) -> `CameraRig` ->
sky/light follow -> UI. Render happens every frame in every state.

Game states (`Game.state`): `ready` (cinematic opening: the horse chases the flamingo on a cinematic camera, world scrolling,
no obstacles) -> `running` (camera eases from the cinematic shot to the chase cam over `camera.introSeconds`; the horse chases for
`horse.chaseSeconds` after the camera arrives, then is left behind) <-> `paused` (tab hidden) -> `caught` (crash: the horse races
in, scoops the flamingo and gallops off; the camera swings to the `camera.outro` shot) -> `gameover` -> `running` (restart,
`Game.resetRun()`). Start/restart is any TAP (tap/click/Enter) or JUMP action; restart is locked for `game.restartDelay`.

- `core/`: Config (ALL tunables, deep-frozen), EventBus (sync, 2-arg emit), GameLoop (rAF, dt clamp, FPS),
  Renderer (renderer/scene/camera/lights/resize), CameraRig (chase cam), Game.
- `player/`: Player (physics, lanes, bump), PlayerStateMachine (state + jump buffer/coyote/slide timers), PlayerModel (procedural flamingo-in-platform-heels character from the supplied character sheet; wings flap in the air, crouch on slide).
- `chaser/`: HorseChaser (modes hidden / chase / approach / carry / done: the opening shot, the first seconds of a run and the
  rescue), HorseModel (procedural brown rocking-horse unicorn with silver horn, mane, saddle studs and rockers; the gallop is a
  rolling rock about the rocker arc).
- `input/`: InputManager (ring-buffer action queue), KeyboardInput, SwipeInput (pointer events), Action enum.
- `world/`: WorldManager (chunk pool, origin shift, ground), GroundChunk (road + instanced scenery),
  ChunkBuilder (seeded scenery placement), SceneryKit (shared geometry/materials/road texture), LaneSystem, Sky,
  CaseTextures / CasePatterns / CaseDraw (canvas-drawn patterns). Buildings are giant phone cases (lemon, red/pink stripes,
  cherry + bow, cheetah + cherries, charm stickers) standing on edge with the printed back facing the road: one bevelled
  extruded slab (CaseGeometry), 5 textured instanced variants (each chunk shows 3 of them), uniform scale, turned
  `scenery.cases.turn` rad towards the oncoming player. The road is a procedural cheetah-skin texture (beige fur, pink
  rosettes), light-pink dashes and pink rails (RoadTexture).
- `obstacles/`: ObstacleManager (row spawning, pooled records), ObstacleRenderer (instanced meshes, slot pools), ObstacleTypes.
  Types: LOW (jump over, random variant: orange fan / purple fan / leather bear, 2.2 tall; FanGeometry + BearGeometry,
  vertex-coloured), HIGH (slide under: the pink Darlingg flower arch, ArchGeometry; its collision reaches above the jump apex so it cannot be hopped), BLOCK (change lane;
  a standing phone case, cherry or player design, taller than the jump apex). Obstacle `variant` is chosen at spawn. Keep `types.high` / `types.block` heights above the jump apex (`v^2 / 2g`) if you tune the jump. Every row has a guaranteed passable "pass lane"
  (never a BLOCK; consecutive pass lanes differ by <= 1) and rows are >= `gapSeconds.min` apart, so a run is always survivable.
  Full-width LOW/HIGH "gates" are also generated. Emits `obstacleRow` (reused payload object).
- `collectibles/`: CoinManager (pooled instanced spinning "gg" logo coins, CoinGeometry builds a gold coin with a white face and the gg monogram embossed on both sides; lays patterns line/step/arc in the gap after each
  `obstacleRow`), CoinBurst (pooled sparkle Points on pickup).
- `collision/`: CollisionManager (swept AABB vs obstacles -> `playerHit`; coin pickups -> `coinCollected`).
  Player collision height is state-based (standing / sliding), see `Player.height`. `collision.graze` forgives overlaps
  shallower than that on any axis (near-misses pass; clear contact ends the run).
- `score/`: ScoreManager (distance + coins, best score in localStorage under `score.storageKey`).
- `audio/`: AudioManager is still a stub (M5).
- `ui/`: UIManager (HUD, start + game-over screens, DOM only), DebugOverlay.
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
  (`jump slide land laneChange laneBump paused resumed obstacleRow playerHit coinCollected gameOver stateChanged`).
- Dev only: `window.__game` is exposed by `main.js` under `import.meta.env.DEV`.
- Three.js notes: `PCFSoftShadowMap` was removed in r18x (use `PCFShadowMap`).

## Roadmap
- [x] M1 playable core
- [x] M2 obstacles (low/high/full-block), pooling, collision, game over + restart
- [x] M3 coins + patterns, score, difficulty ramp (speed, row gap, fill), coin particles
- [x] M4 start screen, HUD, game-over screen, high score (localStorage). Pause is auto-only (tab hidden); no pause menu yet
- [ ] M5 polish: screen shake, camera effects, materials, audio, post-processing
- [ ] M6 final original character/environment assets
