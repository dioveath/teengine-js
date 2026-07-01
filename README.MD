# TeEngine

Simple **2D TypeScript game engine** using **WebGPU** for rendering, **Rapier** for physics, and a built-in **editor panel**.

Originally a Canvas 2D learning project (2017); now rebuilt with a modern GPU pipeline, systems-based ECS, and in-browser editing.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in a WebGPU-capable browser (Chrome 113+, Edge 113+).

Click the canvas to focus. Use the editor panel on the left to inspect entities and pause/play.

## Controls (demo)

| Input | Action |
|-------|--------|
| Arrow / WASD | Move player |
| Space / Up | Jump |
| Mouse | Draw debug circle in world |

## Project structure

- `src/ecs/` — World, Entity, systems (PlayerController, Spin, Render, CameraFollow)
- `src/engine/` — Fixed timestep game loop with pause
- `src/editor/` — Hierarchy, inspector, play/pause UI
- `src/scene/` — DemoScene setup
- `src/graphics/` — Camera-first Graphics API, typed `Layers`
- `src/physics/` — PhysicsWorld + PhysicsBridge (decoupled handles, interpolation)
- `src/assets/` — Demo atlas + JSON atlas loader
- `docs/ARCHITECTURE.md` — Engine design
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
- [x] Entity system + fixed timestep + systems
- [x] Input system (keyboard actions + mouse)
- [x] Rapier 2D physics + PhysicsBridge
- [x] Render interpolation
- [x] Editor UI (hierarchy, inspector, play/pause)
- [x] JSON atlas loader
- [ ] Collision events / sensors
- [ ] Editor: viewport picking, add/remove entities

## License

See repository history — personal learning project by @dioveath.
