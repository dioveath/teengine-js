# TeEngine

Simple **2D TypeScript game engine** using **WebGPU** and **Rapier** physics.

Ships as the **`teengine`** npm package. This repo is a monorepo: library in `packages/teengine`, demo in `examples/demo`.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 — a Steam-style store page listing all demo games.

## Demos

| Game | Description | Controls |
|------|-------------|----------|
| **Space Invaders** | Classic arcade shooter with marching formations | Arrow / A D move, Space fire |
| **Platformer Prototype** | Physics sandbox with coins and enemies | WASD / Arrows move, Space jump |

Each demo opens in its own page. Use **← Store** to return to the launcher.

## Use in your project

```bash
npm install teengine
```

```ts
import { Engine, World, PhysicsBridge, PhysicsWorld, Layers, Color } from "teengine";

const engine = await Engine.create({ canvas });
const physics = new PhysicsBridge(await PhysicsWorld.create());
const world = new World(physics);
// … register layers, spawn entities, add systems
```

See [docs/PACKAGE.md](./docs/PACKAGE.md) for monorepo layout and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for engine design.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build engine + run demo |
| `npm run build` | Build `teengine` package |
| `npm run build:demo` | Build engine + demo |
| `npm run typecheck` | Typecheck all workspaces |

## Package layout

```
packages/teengine/   → publishable library (`teengine`)
examples/demo/       → Vite demo store + game pages
docs/                → architecture + package docs
legacy/              → original Canvas 2D prototype
```

## License

MIT — personal learning project by @dioveath.
