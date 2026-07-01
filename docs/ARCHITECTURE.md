# TeEngine Architecture

TeEngine is a **simple 2D TypeScript game engine** with **WebGPU** rendering.

## Layer stack

```
Game code (main.ts)
    ↓
World                 entities, fixed update, render → Graphics
    ↓
Engine                fixed timestep (1/60s) + render loop
    ↓
Graphics API          cameras, layers, drawSprite, debug draws
    ↓
DrawQueue             collects commands per frame
    ↓
FrameRenderer         sorts per layer, submits GPU passes
    ├── SpriteBatcher  textured quads (primary)
    └── DebugBatcher   lines/rects (debug)
    ↓
WebGPUContext
```

## Game loop

```ts
engine.setLoop({
  fixedUpdate: ({ dt, tick, time }) => {
    world.update(dt); // always 1/60s
  },
  render: ({ graphics, alpha, width, height }) => {
    world.render(graphics);
    graphics.endFrame();
  },
});
```

Simulation runs at a fixed **60 Hz** with spiral-of-death protection (`maxFrameSteps = 5`). Rendering runs every frame; `alpha` is available for interpolation later.

## Graphics API

```ts
graphics.registerLayer("world", { camera: worldCam, sort: "y" });
graphics.registerLayer("ui", { camera: uiCam, sort: "z" });

graphics.beginFrame(clearColor);
graphics.beginLayer("world");
graphics.drawSprite(atlas.player, { x, y, rotation });
graphics.endLayer();
graphics.endFrame();
```

### Conventions (agreed defaults)

| Topic | Choice |
|-------|--------|
| World coords | Y-down, top-left style |
| Camera anchor | `(x,y)` = world point at viewport center |
| Resolution | Dynamic — canvas fills window |
| Atlas v1 | Manual `AtlasRegion` + demo atlas; JSON loader later |
| Layers | Must `registerLayer()` at startup |
| World sort | Y-sort (higher y draws on top) |

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Directory layout

```
src/
  engine/       Fixed timestep game loop
  ecs/          World, Entity, Transform
  graphics/     Graphics, Camera2D, DrawQueue, LayerRegistry
  gpu/          WebGPU, SpriteBatcher, DebugBatcher, FrameRenderer
  assets/       Atlas types, texture loading, demo atlas
  math/         Color, Mat3
docs/
  ARCHITECTURE.md
  PHYSICS.md
legacy/         Original Canvas 2D prototype
```

## Roadmap

- [x] WebGPU swapchain
- [x] Camera2D + layers + draw queue
- [x] Textured sprite batching
- [x] Entity system + fixed timestep
- [ ] JSON atlas loader (TexturePacker / Aseprite)
- [ ] Rapier 2D physics
