# Package layout

TeEngine is structured as an **npm workspace monorepo**: a publishable library plus runnable examples.

```
teengine-js/
├── packages/
│   └── teengine/              # npm package — import as `teengine`
│       ├── package.json
│       ├── tsup.config.ts
│       └── src/
│           ├── index.ts       # public API surface
│           ├── engine/        # game loop, fixed timestep
│           ├── ecs/           # World, Entity, systems
│           ├── graphics/      # cameras, layers, draw API
│           ├── gpu/           # internal WebGPU (not exported)
│           ├── input/
│           ├── physics/
│           ├── assets/        # Atlas types + JSON loader
│           └── math/
├── examples/
│   └── demo/                  # Vite app — `npm run dev`
│       └── src/
│           ├── main.ts
│           ├── DemoScene.ts
│           └── createDemoAtlas.ts
├── docs/
├── legacy/
└── package.json               # workspace root
```

## Design principles

| Concern | Where it lives |
|---------|----------------|
| **Reusable engine** | `packages/teengine` |
| **Game-specific logic** | `examples/*` (PlayerController, demo atlas, scenes) |
| **GPU internals** | `packages/teengine/src/gpu` — private, not exported |
| **Editor / UI** | Out of scope — use your own UI framework in the app |

## Public API (`teengine`)

Single entry point today:

```ts
import {
  Engine,
  World,
  Graphics,
  PhysicsBridge,
  PhysicsWorld,
  Layers,
  loadAtlasFromJson,
  SpinSystem,
  CameraFollowSystem,
  WorldEntityRenderSystem,
} from "teengine";
```

### Future subpath exports (optional)

If the API grows, add without breaking the main entry:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./systems": "./dist/systems/index.js",
    "./physics": "./dist/physics/index.js"
  }
}
```

Only split when consumers need tree-shaking or clearer boundaries — not required yet.

## Consuming the package

### In this repo (workspace)

```json
{
  "dependencies": {
    "teengine": "workspace:*"
  }
}
```

### Published (npm)

```bash
npm install teengine
```

Bundlers must handle Rapier's WASM (`@dimforge/rapier2d`). Vite example:

```ts
optimizeDeps: { exclude: ["@dimforge/rapier2d"] },
assetsInclude: ["**/*.wasm"],
```

## Build

```bash
npm install
npm run build          # builds packages/teengine → dist/
npm run dev            # builds engine + runs examples/demo
```

## What not to put in the package

- Demo scenes and game systems
- Procedural demo assets (`createDemoAtlas`)
- Editor UI
- App entry points (`main.ts`, `index.html`)

These belong in `examples/` or the consumer's app.

## Versioning

- `packages/teengine` is versioned and published
- Root `teengine-js` stays `private: true`
- Examples are never published
