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

`PhysicsWorld` wraps Rapier; `PhysicsBridge` is the entity-facing layer `World` uses.
`World` takes the bridge in its constructor — there is no `attachPhysics()` call.

```ts
const physicsWorld = await PhysicsWorld.create({ gravityY: 980 });
const physics = new PhysicsBridge(physicsWorld);
const world = new World(physics);

// Static ground (engine coords: x,y = top-left)
physics.createStaticBox(0, 300, 2000, 40);

const playerId = world.spawn({
  transform: { x: 400, y: 286 },
  // collider, collision, and rigidBody are separate sibling components —
  // collider is never nested inside rigidBody.
  collider: { shape: { kind: "box", width: 28, height: 28 } },
  collision: { response: "solid" },
  rigidBody: { type: "dynamic", lockRotation: true },
});

// Movement reads/writes velocity by entity id, through the bridge —
// never through a raw Rapier handle.
engine.setLoop({
  fixedUpdate: (ctx) => {
    const dx = ctx.input.actionAxis("move_left", "move_right");
    const vel = physics.getLinearVelocity(playerId);
    physics.setLinearVelocity(playerId, dx * 220, vel.y);
    if (ctx.input.actionPressed("jump")) physics.applyImpulse(playerId, 0, 280);

    // World.fixedUpdate runs snapshot → your fixed systems → physics.step()
    // → sync → your post-physics systems. Do not call physics.step() yourself.
    world.fixedUpdate({ ...ctx, physics });
  },
  render: (ctx) => {
    engine.graphics.beginFrame(Color.hex("#0d1117"));
    world.render({ ...ctx, physics });
    engine.graphics.endFrame();
  },
});
```

See `examples/demo/src/PlayerControllerSystem.ts` and `DemoScene.ts` for the same pattern as a reusable `FixedSystem`.

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
