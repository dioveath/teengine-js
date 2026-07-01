# TeEngine Architecture

TeEngine is a **simple 2D TypeScript game engine** with **WebGPU** rendering.

## Layer stack

```
Game code (main.ts)
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
  engine/       Game loop
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
- [ ] JSON atlas loader (TexturePacker / Aseprite)
- [ ] Entity system + fixed timestep
- [ ] Rapier 2D physics
