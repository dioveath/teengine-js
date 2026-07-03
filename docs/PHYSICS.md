# Physics — Rapier 2D Integration

## Status: implemented (v1)

TeEngine uses [`@dimforge/rapier2d`](https://www.npmjs.com/package/@dimforge/rapier2d) with a thin wrapper in `src/physics/`.

## Architecture

```
Entity.collider + Entity.collision + Entity.rigidBody  →  PhysicsWorld.createPhysicsForEntity()
                              ↓
                        Rapier World (Y-up)
                              ↓
World.syncFromPhysics()  →  Entity.transform (Y-down)
```

### Coordinate boundary (`src/physics/coords.ts`)

| Space | Y axis | Used by |
|-------|--------|---------|
| Engine / render | Down | Graphics, entities |
| Rapier | Up | Physics simulation |

All conversion happens in `PhysicsWorld` — game code stays in engine coordinates.

## Usage

```ts
const physics = await PhysicsWorld.create({ gravityY: 980 });
world.attachPhysics(physics);

// Static ground (engine coords: x,y = top-left)
physics.createStaticBox(0, 300, 2000, 40);

world.spawn({
  transform: { x: 400, y: 286 },
  rigidBody: {
    type: "dynamic",
    collider: { kind: "box", width: 28, height: 28 },
    lockRotation: true,
  },
});

fixedUpdate: ({ dt, input }) => {
  physics.setLinearVelocity(handle, dx * speed, vy);
  physics.applyImpulse(handle, 0, jumpImpulse);
  physics.step(dt);
  world.syncFromPhysics();
};
```

## RigidBodyComponent

| Field | Purpose |
|-------|---------|
| `type` | `dynamic`, `fixed`, `kinematicPosition` |
| `lockRotation` | Passed to Rapier |

Collider and collision policy live on separate components (`collider`, `collision`). See entity spawn examples below.

## Next phases

### Events ✅
- Collision enter/exit via Rapier event queue
- Sensor colliders for triggers

### Performance
- Reuse translation buffers (avoid alloc per body per frame)
- Optional Web Worker for `world.step()`

### Movement (not engine scope)
Platformer / character movement is built in **your** `FixedSystem` using the physics API above (`setLinearVelocity`, `applyImpulse`, `kinematicPosition`, etc.). See `examples/demo/PlayerControllerSystem.ts` for a starting point.

## Vite config

```ts
// vite.config.ts
optimizeDeps: { exclude: ["@dimforge/rapier2d"] },
assetsInclude: ["**/*.wasm"],
```

## References

- [Rapier JS getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js)
- [rapier.js GitHub](https://github.com/dimforge/rapier.js)
