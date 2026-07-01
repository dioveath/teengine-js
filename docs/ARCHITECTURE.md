# TeEngine Architecture

TeEngine is a **simple 2D TypeScript game engine** with **WebGPU** rendering.

## Layer stack

```
Game code (main.ts)
    ↓
World                 entities, fixed update, physics sync, render
    ↓
Engine                fixed timestep (1/60s) + input + render loop
    ↓
Graphics API          cameras, layers, drawSprite, shapes
    ↓
DrawQueue             collects commands per frame
    ↓
FrameRenderer         sorts per layer, submits GPU passes
    ├── SpriteBatcher  textured quads (primary)
    └── ShapeBatcher colored rects/circles/lines
    ↓
WebGPUContext

PhysicsWorld (Rapier 2D) ←→ World.syncFromPhysics()
```

## Game loop

```ts
const physics = await PhysicsWorld.create({ gravityY: 980 });
world.attachPhysics(physics);

engine.setLoop({
  fixedUpdate: ({ dt, input }) => {
    physics.step(dt);
    world.syncFromPhysics();
    world.update(dt);
  },
  render: ({ graphics }) => {
    world.render(graphics);
    graphics.endFrame();
  },
});
```

## Input

```ts
engine.input.bindAction("move_left", ["ArrowLeft", "KeyA"]);

fixedUpdate: ({ input }) => {
  const dx = input.actionAxis("move_left", "move_right");
  if (input.actionPressed("jump")) { /* ... */ }
};
```

## Physics

Entities optionally include `rigidBody`. Rapier runs in **Y-up**; `src/physics/coords.ts` converts at the boundary. TeEngine world remains **Y-down**.

```ts
world.spawn({
  transform: { x: 400, y: 280 },
  sprite: { region: atlas.player, layer: "world" },
  rigidBody: {
    type: "dynamic",
    collider: { kind: "box", width: 28, height: 28 },
    lockRotation: true,
  },
});
```

## Directory layout

```
src/
  engine/       Fixed timestep game loop
  ecs/          World, Entity, Transform
  input/        Input, ActionMap
  physics/      PhysicsWorld, coord conversion
  graphics/     Graphics, Camera2D, DrawQueue, LayerRegistry
  gpu/          WebGPU, batchers, FrameRenderer, uniforms
  assets/       Atlas types, demo atlas
  math/         Color, Mat3
```

## Roadmap

- [x] WebGPU + cameras + layers + sprites
- [x] Entity system + fixed timestep
- [x] Input system
- [x] Shape primitives
- [x] Rapier 2D physics
- [ ] JSON atlas loader
- [ ] Collision events / sensors
- [ ] Kinematic character controller
