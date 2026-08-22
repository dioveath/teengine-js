# Research-Driven Engine Upgrades

Sources reviewed and the upgrades they motivated. All additions are genre-neutral core capabilities.

## Sources

1. Nystrom, *Game Programming Patterns* (gameprogrammingpatterns.com) — Event Queue, Spatial Partition, Object Pool, Update Method, Component, Data Locality chapters.
2. Fiedler, "Fix Your Timestep!" (Gaffer On Games) — fixed-timestep accumulator loop, interpolation alpha, spiral-of-death clamping.
3. Martin, "Entity Systems are the future of MMOG development" (t-machine.org, 2007); West, "Evolve Your Hierarchy" (Cowboy Programming, 2007) — entities as opaque ids, components as data in per-type stores, systems own logic.
4. Fabian, *Data-Oriented Design* (free online edition); Acton, "Data-Oriented Design and C++" (CppCon 2014) — avoid per-frame allocations in hot paths, iterate contiguous data.
5. Penner, *Easing Equations* (public domain) — standard tween curves.

## Audit findings → upgrades

| Principle | Source | Status before | Upgrade |
|---|---|---|---|
| Fixed timestep + alpha + clamp | Fiedler | already correct | none needed |
| Update method | GPP | `FixedUpdateSystem`/`RenderSystem` | none needed |
| Event Queue | GPP ch.14 | missing | `ecs/Events.ts` — `EventBus`, queued dispatch drained at one point in `World.fixedUpdate`; re-entrant emits deferred |
| Spatial Partition | GPP ch.16 | missing | `ecs/SpatialGrid.ts` — uniform grid, circle/rect queries, reusable output buffers |
| Object Pool | GPP ch.6 | missing | `utils/index.ts` — `Pool<T>` with factory/reset |
| Components as data | Martin/West | hardcoded optional fields only | `ecs/ComponentStore.ts` — generic string-keyed stores on `World.components`, auto-cleaned on entity remove |
| DOD hot loops | Fabian/Acton | `getAll()` allocated per call | `World.forEachActive()` allocation-free iteration |
| Determinism | replay/test needs | `Math.random` only | `math/random.ts` — seeded mulberry32 `Rng` (int/range/pick/shuffle/weighted) |
| Game feel | Swink/Penner | missing | `utils/index.ts` — `Easing`, `Tween`, `TweenRunner`; `Camera2D.shake()` decaying shake in view matrix |
| Text rendering | essential 2D capability | missing | `graphics/text/GlyphAtlas.ts` — shelf-packed single-texture glyph atlas, Canvas2D rasterizer, `Graphics.drawText()` batches as sprite quads on every backend |
| Audio | essential 2D capability | missing | `audio/AudioSystem.ts` — WebAudio synth SFX, decoded buffer/music channels, gesture-gated `unlock()` |

## Deliberately not added

- Archetype/SoA entity storage: current Map-based layout is sufficient at demo scale; revisiting requires profiling evidence.
- Dirty-flag transform caching: draw cost is dominated by batching, not matrix math.
- Service locator: `Inspector` covers the debugging need without global mutable state.

## Verification

- `packages/core`: 54 vitest cases covering EventBus semantics (ordering, once, re-entrancy), SpatialGrid queries/packing, Pool reuse, Rng determinism/bounds, Tween lifecycle, GlyphAtlas packing/growth/fallback, plus pre-existing suites.
- `bun run typecheck` across all workspace packages; `bun run build`; physics suite green.
