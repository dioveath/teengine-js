# TeEngine

Simple **2D TypeScript game engine** using **WebGPU** for rendering.

Originally a Canvas 2D learning project (2017); now being rebuilt with a modern GPU pipeline, typed modules, and planned Rapier 2D physics.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in a WebGPU-capable browser (Chrome 113+, Edge 113+).

## Project structure

- `src/gpu/` — WebGPU device, renderer, WGSL shaders
- `src/graphics/` — Canvas-style Graphics API (`fillRect`, `fillCircle`, transforms)
- `src/engine/` — Game loop and resize handling
- `src/math/` — Colors, matrices, helpers
- `docs/ARCHITECTURE.md` — Engine design
- `docs/PHYSICS.md` — Rapier 2D research & integration plan
- `legacy/` — Original Canvas 2D prototype

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | TypeScript only |

## Roadmap

- [x] WebGPU rendering with camera + layers
- [x] Sprite batching (`drawSprite`, atlas regions)
- [ ] JSON atlas loader
- [ ] Entity system
- [ ] Rapier 2D physics

## License

See repository history — personal learning project by @dioveath.
