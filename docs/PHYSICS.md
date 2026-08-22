# Physics

Optional `@teengine/physics`. Core talks to a `PhysicsAdapter`; Rapier never enters `@teengine/core`.

```
Entity collider / collision / rigidBody
    → PhysicsBridge.register
    → PhysicsWorld (Rapier, Y-up)
    → sync transforms (Y-down)
```

```ts
const physics = new PhysicsBridge(await PhysicsWorld.create({ gravityY: 980 }));
const world = new World(physics);
```

Game code stays in engine coordinates. Conversion is inside `PhysicsWorld`.
