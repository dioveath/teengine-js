# What belongs in TeEngine

TeEngine is the **simplest useful 2D game engine** — not a platformer kit, not a grab bag of game recipes.

**One rule:** the package gives you primitives to **run, draw, simulate, and input**. Everything that decides *how a game plays* is yours to build on top.

---

## In the engine (`packages/teengine`)

These are the only subsystems. If it does not fit here, it does not ship in the package.

| Module | Responsibility |
|--------|----------------|
| **engine** | Fixed timestep loop, pause, resize |
| **graphics** | Cameras, layers, sprites, shapes |
| **gpu** | WebGPU batching (internal, not exported) |
| **ecs** | Entities, components, systems, render interpolation |
| **input** | Keyboard, mouse, action map |
| **physics** | Rapier bridge — bodies, colliders, sensors, collision events, sync |
| **assets** | Load atlases onto the GPU |
| **math** | Small shared types (`Color`; grow only when the engine itself needs them) |

### What physics gives you (and nothing more)

- Create bodies: `dynamic`, `fixed`, `kinematicPosition`
- Set velocity, apply impulse, step the world
- Collision layers (`layers()`, `COLLIDE_ALL`) — you define your own bit constants
- Enter/exit events, sensors
- Engine Y-down ↔ Rapier Y-up handled for you (not exported)

That is enough to build **any** movement style — platformer, top-down, vehicle, point-and-click — in your own systems. The engine does not pick one.

### What the engine deliberately omits

| Not in engine | Why |
|---------------|-----|
| Character controller | Gameplay. You write a `FixedSystem`. |
| Animation / state machines | Gameplay / content pipeline. |
| Scene manager | App structure. You wire `Engine.setLoop`. |
| Tilemaps | Content format + renderer. Add when a game needs it. |
| Audio | Separate concern. |
| UI / text | Use DOM or your UI library. |
| Game-specific tags / atlas shapes | Demo defines its own in `examples/demo/` |

---

## Public API (`teengine`)

Single entry point — `packages/teengine/src/index.ts` is the only contract:

- **Run:** `Engine`, loop callbacks, fixed timestep constants
- **Draw:** `Graphics`, `Camera2D`, `Layers`, `Color`, shape/sprite draw types
- **Simulate:** `World`, `Entity`, `Transform`, `hasPhysics`, `isSimulatedBody`, physics bridge + collision helpers
- **Input:** `Input`, `ActionMap`
- **Assets:** `loadAtlasFromJson(engine, …)`, `uploadRgbaTexture(engine, …)`, `AtlasRegion`

Not exported: GPU device accessor, coordinate conversion helpers, demo-specific types, preset collision group names.

---

## In examples (`examples/*`)

Reference games and **copy-paste starting points** — not second-class engine modules.

```
examples/demo/
  demoConstants.ts            ← DemoTags, DemoAtlas, DemoCollisionGroups
  PlayerControllerSystem.ts   ← velocity + jump: one way to move a dynamic body
  CoinPickupSystem.ts         ← sensor collision handling
  DemoScene.ts                ← how to wire engine + world + systems
```

A default working player controller belongs **here** (or in docs as a snippet), so developers can read it, fork it, or ignore it. It is never imported from `"teengine"`.

---

## Internal (`src/gpu/`, unexported helpers)

Implementation details. No stability guarantee. Not part of the engine's promise.

---

## The boundary test

Before adding anything to `packages/teengine`, ask:

> **Does every 2D game need this, regardless of genre?**

| Answer | Verdict |
|--------|---------|
| Yes — e.g. draw a sprite, step physics, poll input | **Engine** |
| No — e.g. platformer jump, walk cycle, inventory | **Developer's code or examples** |

When unsure, leave it out. The engine stays smaller; games stay flexible.

---

## Roadmap (engine only)

| Item | Status |
|------|--------|
| Remove demo tags from `Entity` | ✅ `tags: Set<string>` |
| Seal public API | ✅ Phase 2 |
| ECS query helpers | Planned |
| Export `Vec2` / small math helpers | Planned |
| Asset cache / lifecycle | Planned |
| Physics perf (buffer reuse) | Planned |

**Not on engine roadmap:** character controller, animation module, scene stack, tilemaps.

---

## Summary

| Layer | Location | Role |
|-------|----------|------|
| Engine | `teengine` npm package | Run, draw, simulate, input |
| Examples | `examples/*` | Working reference implementations you own |
| Your game | Your repo | Systems, scenes, content, feel |

The best simplest 2D engine is one that **does less, clearly** — and gets out of the way.
