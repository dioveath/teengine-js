# Physics Research — Rapier 2D

TeEngine needs a 2D physics layer. The original `particle.js` implemented custom springs, gravity, and Euler integration. For a modern engine, **Rapier 2D** is the recommended direction.

## Recommendation: use Rapier 2D

**Package:** [`@dimforge/rapier2d`](https://www.npmjs.com/package/@dimforge/rapier2d)

Rapier is a mature, open-source Rust physics engine with official JavaScript/WASM bindings. It fits TeEngine well:

| Criteria | Rapier 2D | Custom (old particle.js) |
|----------|-----------|--------------------------|
| Rigid bodies | Yes | No |
| Collisions | Broad + narrow phase | Manual only |
| Joints / springs | Built-in | Custom springs only |
| Performance | WASM + optional SIMD | JS, limited |
| Maintenance | Active (Dimforge) | Abandoned prototype |

### Alternatives considered

| Option | Verdict |
|--------|---------|
| **Matter.js** | Easy API, pure JS, but slower at scale; less suitable next to WebGPU perf goals |
| **Planck.js** | Box2D port, solid but less active than Rapier |
| **Custom port of particle.js** | Fast to start, poor long-term for games with collision |
| **Rapier 2D** | Best balance of features, speed, and maintenance |

## Integration plan (not yet implemented)

### Phase 1 — Basic sync

```typescript
// Pseudocode for future src/physics/PhysicsWorld.ts
import RAPIER from "@dimforge/rapier2d";

await RAPIER.init(); // WASM load — must be async

const world = new RAPIER.World({ x: 0, y: 9.81 * 50 }); // scale TBD

// Each frame:
world.step();
const pos = body.translation(); // { x, y }
graphics.fillRect(pos.x, pos.y, w, h, color);
```

Coordinate note: Rapier uses **Y-up**; TeEngine graphics uses **Y-down** (canvas convention). The physics layer should convert on sync:

```typescript
renderY = worldToScreenY(body.translation().y);
```

### Phase 2 — Entity bridge

```
Entity
  ├── Transform (render)
  ├── RigidBodyHandle (physics)
  └── ColliderHandle (physics)
```

- Fixed timestep accumulator in `Engine` (e.g. 1/60s)
- `PhysicsWorld.step(fixedDt)` decoupled from render `dt`
- Map collider events → game callbacks (onCollisionEnter, etc.)

### Phase 3 — Performance

Rapier is WASM. For many bodies at 60fps:

1. **Avoid per-body allocations** when reading transforms — use scratch buffers / reuse objects where the API allows ([rapier.js#337](https://github.com/dimforge/rapier.js/pull/337)).
2. **Optional Web Worker** — run `world.step()` off the main thread; sync positions via `SharedArrayBuffer` or postMessage batch arrays.
3. **Package choice:**
   - `@dimforge/rapier2d` — default, separate WASM file (works with Vite)
   - `@dimforge/rapier2d-compat` — base64-embedded WASM if bundler issues arise
   - `@dimforge/rapier2d-simd` — faster where SIMD128 is supported

### Phase 4 — Game features

- Kinematic character controller (platformers)
- Sensor colliders (triggers)
- Ray casts / shape casts (click picking, line-of-sight)
- Joint constraints (ragdolls, ropes, vehicles)

## Vite configuration note

When adding Rapier, Vite may need WASM handling:

```typescript
// vite.config.ts (future)
export default defineConfig({
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["@dimforge/rapier2d"],
  },
});
```

## Migration from particle.js

| particle.js feature | Rapier equivalent |
|---------------------|-------------------|
| `gravity` field | `World` gravity vector |
| `gravitateTo()` | N-body not built-in — use custom forces or mutual gravity hack |
| `springTo()` | `SpringJoint` or `RopeJoint` |
| `friction` / `bounce` | `Collider` friction & restitution |
| Euler `update()` | `world.step()` with internal integrator |

Custom particle effects (fireworks, dust) may remain as a **non-physics** GPU particle system separate from Rapier rigid bodies.

## Decision

**Proceed with Rapier 2D** for rigid-body physics. Defer installation until the WebGPU render loop and entity model are stable. Next concrete step: add `src/physics/` with `PhysicsWorld` wrapper and a falling-box demo synced to `Graphics.fillRect`.

## References

- [Rapier JS getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js)
- [rapier.js GitHub](https://github.com/dimforge/rapier.js)
- [Rapier 2D examples](https://rapier.rs/docs/user_guides/javascript/examples_js)
