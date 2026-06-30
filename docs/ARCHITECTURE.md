# TeEngine Architecture

TeEngine is being rebuilt as a **simple 2D TypeScript game engine** with **WebGPU** rendering.

## Layer stack

```
┌─────────────────────────────────────┐
│  Game / Demo (src/main.ts)          │
├─────────────────────────────────────┤
│  Graphics API (src/graphics/)       │  Canvas-like draw calls, transform stack
├─────────────────────────────────────┤
│  Renderer (src/gpu/Renderer.ts)     │  Vertex batching, frame submission
├─────────────────────────────────────┤
│  WebGPUContext (src/gpu/)           │  Device, swapchain, resize
├─────────────────────────────────────┤
│  WGSL shaders (src/gpu/shaders.ts)  │  Colored 2D shape pipeline
└─────────────────────────────────────┘
```

## What changed from Canvas 2D

| Before (2017) | Now |
|---------------|-----|
| `canvas.getContext("2d")` | `canvas.getContext("webgpu")` |
| Immediate-mode Canvas API | Batched GPU geometry per frame |
| `main.js` + global scripts | TypeScript modules + Vite |
| `particle.js` custom physics | Planned: Rapier 2D (see `docs/PHYSICS.md`) |
| `utils.js` math helpers | `src/math/` (ported incrementally) |

## Graphics API (current)

The `Graphics` class provides a familiar 2D API:

- `beginFrame(clearColor)` / `endFrame()` — frame lifecycle
- `save()` / `restore()` / `translate()` / `rotate()` / `scale()` — transform stack
- `fillRect()`, `fillCircle()`, `strokeLine()` — primitives

Planned extensions:

- Textured quads / sprite batching
- Image/sprite atlas support
- Blend modes and scissor rects
- Render layers / z-order

## Development

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run typecheck
npm run build
```

WebGPU requires a supported browser and `localhost` (or HTTPS).

## Directory layout

```
src/
  engine/       Game loop, resize handling
  gpu/          WebGPU device, renderer, shaders
  graphics/     Public Graphics API
  math/         Vectors, matrices, color
  main.ts       Demo entry point
docs/
  ARCHITECTURE.md
  PHYSICS.md
legacy/         Original Canvas 2D prototype (archived)
```
