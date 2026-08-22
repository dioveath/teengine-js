# Architecture

TeEngine is a 2D engine with a **document** (JSON) and a **runtime** (ECS + loop). Gameplay systems stay in the game.

```
Game / studio / agent
    ↓ commands (Project)
GameProject          Zod schema, scenes, entities, assets, input
    ↓ hydrate
World                 entities, systems, inspection
    ↓
Engine                fixed timestep + input; renderer injected
    ↓
Graphics              cameras, layers, draw queue
    ↓ FrameRenderer
WebGPU | Canvas2D | Headless
```

Physics is an optional `PhysicsAdapter` (`@teengine/physics`).

Core has no Rapier and no WebGPU.
