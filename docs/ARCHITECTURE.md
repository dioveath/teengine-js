# Architecture

TeEngine is a 2D engine with a **document** (JSON) and a **runtime** (ECS + loop). Gameplay systems stay in the game.

```
Game / studio / agent
    ↓ commands (Project)
GameProject          Zod schema, scenes, entities, assets, input
    ↓ hydrate
World                 entities, systems, inspection
    ↓
Engine                fixed timestep + input; renderer injected
    ↓
Graphics              layers, cameras, draw facade
    ↓ RenderQueue       SoA records, stable sort by (layer, z)
    ↓ FrameRenderer     render(width, height, clearColor, cameras, queue)
WebGPU | Canvas2D | Headless
```

Physics is an optional `PhysicsAdapter` (`@teengine/physics`).

Core has no Rapier and no WebGPU.

## Rendering pipeline

The CPU side (`RenderQueue`) stores draws as flat typed-array records — no per-frame
allocations after warmup. `finalize()` stable-sorts records by `(layer rank, z)` with a
table-free bottom-up merge sort over preallocated index arrays. Backends consume the sorted
order directly; sorting and layer grouping never leak into backends.

The WebGPU backend (`@teengine/renderer-webgpu`) packs sorted records into per-instance
scratch buffers and uploads once per frame through a growable ring buffer (single GPUBuffer,
256-byte aligned regions, high-water tracked):

- **Sprites** — instanced quads (`draw(4, n)`, triangle-strip), 13 floats per instance;
  up to 8 textures batch in one draw via `binding_array`, so texture changes rarely break a
  batch. Camera matrices live in per-view uniform bind groups, not in vertices.
- **Shapes** — one instanced SDF pipeline: box/circle/capsule evaluated analytically in the
  fragment shader with `fwidth` anti-aliasing; circles cost the same as rects.
- **Resources** — `GpuCache` owns textures and bind groups (cached by texture-set key);
  pipelines use auto layouts so binding-array counts come from the shaders.

See `docs/RENDERING_PLAN.md` for the research base and design rationale.
