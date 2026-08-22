# TeEngine

2D TypeScript game engine: WebGPU, systems ECS, optional Rapier. **Bun** workspaces.

```bash
bun install
bun run dev
```

Open http://localhost:5173

```ts
import { createEngine, World, Layers, Color } from "teengine";

const engine = await createEngine({ canvas });
```

Packages: `@teengine/core` (document + ECS + loop), `@teengine/physics`, `@teengine/renderer-webgpu`, `@teengine/renderer-canvas2d`, `@teengine/storage`, `@teengine/ai`, `@teengine/editor`. `teengine` is the WebGPU barrel.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
