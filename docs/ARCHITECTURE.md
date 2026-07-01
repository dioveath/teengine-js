# TeEngine Architecture

TeEngine is a **simple 2D TypeScript game engine** with **WebGPU** rendering, **systems-based ECS**, and **Rapier physics**. It ships as the **`teengine` npm package** — see [PACKAGE.md](./PACKAGE.md) for layout.

## Layer stack

```
Your game (examples/demo or your app)
    ↓
World                 entities, systems, physics sync, render interpolation
    ↓
Engine                fixed timestep (1/60s) + input + render loop
    ↓
Graphics API          cameras, layers, drawSprite, shapes
    ↓
DrawQueue             collects commands per frame
    ↓
FrameRenderer         sorts per layer (registry order), submits GPU passes
    ├── SpriteBatcher  textured quads (primary)
    └── ShapeBatcher   colored rects/circles/lines
    ↓
WebGPUContext

PhysicsBridge (Rapier 2D) ←→ World.fixedUpdate()
```

## ECS + Systems

Entities are component bags. Behavior lives in **systems**:

```ts
world.addFixedSystem(new SpinSystem());
world.addRenderSystem(new WorldEntityRenderSystem(graphics));
world.addRenderSystem(new CameraFollowSystem(worldCamera));
```

Game-specific systems (e.g. `PlayerControllerSystem`) live in your app, not the package.

## Game loop

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

## Directory layout (package)

```
packages/teengine/src/
  engine/       Fixed timestep game loop
  ecs/          World, Entity, built-in systems
  input/        Input, ActionMap
  physics/      PhysicsWorld, PhysicsBridge, coords
  graphics/     Graphics, Camera2D, Layers, DrawQueue
  gpu/          WebGPU, batchers (internal)
  assets/       Atlas types, JSON loader
  math/         Color, Mat3
```

## Roadmap

- [x] WebGPU + cameras + layers + sprites
- [x] Entity system + fixed timestep + systems
- [x] Input system
- [x] Shape primitives
- [x] Rapier 2D physics + PhysicsBridge
- [x] Render interpolation
- [x] JSON atlas loader
- [x] npm package layout
- [ ] Collision events / sensors
- [ ] Kinematic character controller
