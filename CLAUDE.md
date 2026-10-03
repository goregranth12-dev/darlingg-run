# Darlingg Run

3D endless runner. Vanilla JS (ES modules) + Three.js (pinned `0.186.1`) + Vite. No frameworks, no TypeScript.
All art is procedural geometry / canvas textures. The one shipped image is the supplied loading-screen art (`public/loading.webp`).

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

Game states (`Game.state`): `ready` (cinematic opening: the flamingo runs towards a cinematic camera, world scrolling, no obstacles)
-> `running` (camera eases from the cinematic shot to the chase cam over `camera.introSeconds`) <-> `paused` (tab hidden) ->
`crashed` (the flamingo topples while the camera swings to the `camera.outro` angle for `game.crashSeconds`) -> `gameover` ->
`running` (restart, `Game.resetRun()`). Start/restart is any TAP (tap/click/Enter) or JUMP action; restart is locked for
`game.restartDelay`.

- `core/`: Config (ALL tunables, deep-frozen), EventBus (sync, 2-arg emit), GameLoop (rAF, dt clamp, FPS),
  Renderer (renderer/scene/camera/lights/resize), CameraRig (chase cam), Game.
- `player/`: Player (physics, lanes, bump), PlayerStateMachine (state + jump buffer/coyote/slide timers), PlayerModel (procedural flamingo-in-platform-heels character from the supplied character sheet; wings flap in the air, crouch on slide).
- Loading screen: `index.html` shows `public/loading.webp` (inline CSS, paints before the bundle) and `main.js` removes it once
  the Game is built and `MIN_LOADING_MS` has passed. Roadside props (instead of trees): pink hand-fan tree and the "made to be
  noticed" signboard (`world/PropGeometry.js`, 4 instanced meshes per chunk, turned like the cases).
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
  vertex-coloured), HIGH (slide under: the pink upside-down-U Darlingg arch, opening `types.high.clearance` high (taller than the slide, shorter than the standing flamingo), with pearls, hearts and bows, ArchGeometry; its collision reaches above the jump apex so it cannot be hopped), BLOCK (change lane;
  a standing phone case, cherry or player design, taller than the jump apex). Obstacle `variant` is chosen at spawn. Keep `types.high` / `types.block` heights above the jump apex (`v^2 / 2g`) if you tune the jump. Every row has a guaranteed passable "pass lane"
  (never a BLOCK; consecutive pass lanes differ by <= 1) and rows are >= `gapSeconds.min` apart, so a run is always survivable.
  Full-width LOW/HIGH "gates" are also generated. Emits `obstacleRow` (reused payload object).
- `collectibles/`: CoinManager (pooled instanced spinning "gg" logo coins: CoinGeometry builds the orange-yellow coin with a warm-white face and the gg monogram embossed on both sides; patterns line/step/arc are laid out `coins.spacing` apart in the gap after each
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

## Android APK
Capacitor wraps the Vite build (`capacitor.config.json`, id `com.darlingg.run`, portrait, icon in `android/app/src/main/res/mipmap-*`).
- `npm run android:apk` builds `android/app/build/outputs/apk/debug/app-debug.apk` (needs JDK 17+ and the Android SDK).
- `.github/workflows/android-apk.yml` builds it on every push and publishes `darlingg-run.apk` to the `apk-latest` release.
- After web changes: `npm run android:sync` copies `dist/` into the Android project.

## Web install (iPhone / any phone)
`.github/workflows/pages.yml` deploys `dist/` to GitHub Pages (once Settings > Pages > Source is set to "GitHub Actions"):
https://goregranth12-dev.github.io/darlingg-run/ . iPhones cannot install APKs; open that link in Safari and use Share > Add to
Home Screen (manifest + apple-touch-icon are in `public/`).
