# teengine

Convenience barrel: `@teengine/core` + Rapier physics + WebGPU renderer.

```ts
import { createEngine, World, Layers, Color } from "teengine";

const engine = await createEngine({ canvas });
```

Use `@teengine/core` alone when you inject a renderer and skip physics.
