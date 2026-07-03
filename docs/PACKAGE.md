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

See [MODULES.md](./MODULES.md) for the engine boundary.

| Concern | Where it lives |
|---------|----------------|
| **Engine** | `packages/teengine` — run, draw, simulate, input |
| **Reference implementations** | `examples/*` (player controller, pickup, scenes) — copy and adapt |
| **Your game** | Your app — systems, content, feel |
| **GPU internals** | `packages/teengine/src/gpu` — private, not exported |
| **Editor / UI** | Out of scope — use your own UI framework |

## Public API (`teengine`)

Single entry point today:

```ts
import {
  Engine,
  World,
  PhysicsBridge,
  PhysicsWorld,
  Layers,
  layers,
  loadAtlasFromJson,
  uploadRgbaTexture,
  CameraFollowSystem,
  WorldEntityRenderSystem,
} from "teengine";

// Tags and collision layer bits are game-defined — see examples/demo/src/demoConstants.ts
world.spawn({
  tags: ["player"],
  collision: { response: "solid", layers: layers(MY_PLAYER_LAYER, MY_GROUND_LAYER) },
});

const atlas = await loadAtlasFromJson(engine, "/assets/sprites.json");
const procedural = uploadRgbaTexture(engine, pixels, width, height);
```

Single entry point. No subpath exports unless the core API genuinely outgrows one bundle.

## Consuming the package

### In this repo (workspace)

```json
{
  "dependencies": {
    "teengine": "*"
  }
}
```

(`"*"` resolves to the local `packages/teengine` workspace package under npm workspaces.)

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
