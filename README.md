# TeEngine

Minimal 2D TypeScript game engine — WebGPU, systems ECS, Rapier physics. Published as **`teengine`**.

## Quick start

```bash
npm install
npm run dev          # build engine + run examples/demo → http://localhost:5173
```

```ts
import { Engine, World, PhysicsBridge, PhysicsWorld, Color } from "teengine";

const physics = new PhysicsBridge(await PhysicsWorld.create({ gravityY: 980 }));
const world = new World(physics);
const engine = await Engine.create({ canvas });

engine.setLoop({
  fixedUpdate: (ctx) => world.fixedUpdate({ ...ctx, physics }),
  render: (ctx) => {
    engine.graphics.beginFrame(Color.hex("#0d1117"));
    world.render({ ...ctx, physics });
    engine.graphics.endFrame();
  },
});
engine.start();
```

## Repo layout

```
packages/teengine/src/   publishable library — public API is index.ts only
examples/demo/           reference game (copy systems from here)
legacy/                  old Canvas 2D prototype (ignore)
```

## Scope

The **`teengine`** package provides **run, draw, simulate, input** only. Gameplay (movement, AI, scenes, animation) belongs in **your code** or **`examples/demo/`** — never in the package.

| In engine | Not in engine |
|-----------|---------------|
| Loop, graphics, ECS, input, physics bridge | Character controller, scene manager, tilemaps, audio |

## Physics (minimal)

Spawn with separate `collider`, `collision`, and `rigidBody` components. Pass `PhysicsBridge` to `World`. Call `world.fixedUpdate({ ...ctx, physics })` — do not call `physics.step()` yourself. Movement uses `physics.setLinearVelocity` / `applyImpulse` on entity ids. See `examples/demo/src/PlayerControllerSystem.ts`.

Vite needs Rapier WASM handling:

```ts
optimizeDeps: { exclude: ["@dimforge/rapier2d"] },
assetsInclude: ["**/*.wasm"],
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build engine + run demo |
| `npm run build` | Build `teengine` → `dist/` |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (teengine package) |

## Consume elsewhere

```bash
npm install teengine
```

In this monorepo, use `"teengine": "*"` in workspace `package.json`.

MIT — @dioveath
