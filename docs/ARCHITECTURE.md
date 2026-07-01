# TeEngine Architecture

TeEngine is a **simple 2D TypeScript game engine** with **WebGPU** rendering, **systems-based ECS**, **Rapier physics**, and an **in-browser editor**.

## Layer stack

```
Game code (scene + systems)
    ↓
World                 entities, systems, physics sync, render interpolation
    ↓
Engine                fixed timestep (1/60s) + input + render loop + pause
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
Editor UI (DOM panel)     ←→ World inspector / play-pause
```

## ECS + Systems

Entities are component bags. Behavior lives in **systems**, not per-entity callbacks:

```ts
world.addFixedSystem(new PlayerControllerSystem());
world.addFixedSystem(new SpinSystem());
world.addRenderSystem(new WorldEntityRenderSystem(graphics));
world.addRenderSystem(new CameraFollowSystem(worldCamera));
```

Component tags: `player`, `cameraTarget`, `spin`. Physics runtime handles live in `PhysicsBridge`, not on components.

## Game loop

```ts
const physics = new PhysicsBridge(await PhysicsWorld.create({ gravityY: 980 }));
const world = new World(physics);

engine.setLoop({
  fixedUpdate: (ctx) => world.fixedUpdate({ ...ctx, physics }),
  render: (ctx) => {
    graphics.beginFrame(clear);
    world.render({ ...ctx, physics }); // systems + interpolated transforms
    graphics.endFrame();
  },
});
```

Input is polled **once per visual frame**. `actionPressed()` consumes edges so multi-step fixed updates don't double-fire.

Render interpolation: `PhysicsBridge` snapshots previous transforms, lerps with `alpha` during render.

## Layers

Use typed layer names from `Layers` (not raw strings):

```ts
import { Layers } from "teengine";

graphics.registerLayer(Layers.world, { camera: worldCam, sort: "y" });
graphics.registerLayer(Layers.ui, { camera: uiCam, sort: "z" });
```

`WorldEntityRenderSystem` draws in **registry order** and respects each layer's sort mode.

## Editor

The editor panel provides:

- **Hierarchy** — click to select entities
- **Inspector** — edit name, active, transform, spin speed
- **Play / Pause** — pauses fixed update; rendering continues for live editing

## Physics

`PhysicsBridge` decouples Rapier from ECS. Authoring config stays on `rigidBody`; handles and interpolation state stay in the bridge.

## Assets

```ts
const atlas = await loadAtlasFromJson(device, "/assets/sprites.json");
graphics.drawSprite(atlas.player, { x, y });
```

## Directory layout

```
src/
  engine/       Fixed timestep game loop, pause
  ecs/          World, Entity, systems/
  editor/       In-browser editor panel
  scene/        DemoScene, debug overlays
  input/        Input, ActionMap
  physics/      PhysicsWorld, PhysicsBridge, coords
  graphics/     Graphics, Camera2D, Layers, DrawQueue
  gpu/          WebGPU, batchers, FrameRenderer
  assets/       Atlas types, demo atlas, JSON loader
  math/         Color, Mat3
```

## Roadmap

- [x] WebGPU + cameras + layers + sprites
- [x] Entity system + fixed timestep + systems
- [x] Input system
- [x] Shape primitives
- [x] Rapier 2D physics + PhysicsBridge
- [x] Render interpolation
- [x] Editor UI (hierarchy, inspector, play/pause)
- [x] JSON atlas loader
- [ ] Collision events / sensors
- [ ] Kinematic character controller
- [ ] Editor: drag entities in viewport, add/remove entities
