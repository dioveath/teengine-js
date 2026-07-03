# TeEngine Module Specification

This document defines **what a module is**, **how modules are classified**, and **where every capability lives**. It is the source of truth for package boundaries — not ad‑hoc “core vs plugin” calls per feature.

Related: [ARCHITECTURE.md](./ARCHITECTURE.md), [PACKAGE.md](./PACKAGE.md), [PHYSICS.md](./PHYSICS.md).

---

## 1. Goals

TeEngine targets a **refined minimal 2D engine**: enough to ship small games without becoming a general-purpose framework.

The module spec exists to:

1. **Prevent boundary drift** — demo code, physics internals, and reusable features stay in separate buckets.
2. **Make opt-in explicit** — games that never need platformer movement do not carry platformer assumptions in their mental model or public types.
3. **Scale the monorepo** — new capabilities get a tier and export path *before* implementation starts.
4. **Keep one npm package until split is justified** — tiers map to **directories and exports**, not necessarily separate published packages.

---

## 2. Module tiers

Every capability belongs to exactly one tier.

| Tier | Name | Shipped in | npm export | Stability | Purpose |
|------|------|------------|------------|-----------|---------|
| **T0** | Internal | `packages/teengine` | None | None | Implementation detail. Breaking changes anytime. |
| **T1** | Kernel | `packages/teengine` | `teengine` | Stable | Without this, the product is not a game engine. |
| **T2** | Core | `packages/teengine` | `teengine` | Stable | Subsystems every typical game uses once the engine is running. |
| **T3** | Standard | `packages/teengine` | `teengine/<module>` | Stable | Complete, optional subsystems. Opt in by import + registration. |
| **T4** | Application | `examples/*` | Never published | N/A | Single-game logic, assets, scenes. |

### 2.1 Classification rules

Use this decision tree for any new feature:

```
1. Is it required to create Engine, draw a frame, or tick World?
   YES → T1 Kernel
   NO  → 2

2. Is it a general subsystem (ECS, input, rigid-body simulation, atlas load)
   that most games enable without thinking?
   YES → T2 Core
   NO  → 3

3. Is it a cohesive optional subsystem with its own component(s), systems,
   lifecycle, and docs — usable without game-specific types?
   YES → T3 Standard
   NO  → 4

4. Does it encode one game's rules, content, or presentation?
   YES → T4 Application
   NO  → Revisit: likely T0 internal helper or belongs inside an existing module
```

### 2.2 What “Standard” (T3) is NOT

- **Not a half-exported physics helper.** A Standard module owns its component types, systems, integration contract, tests, and documentation.
- **Not game code with engine branding.** If it references `player`, `coin`, or demo-specific action names as hard requirements, it is T4.
- **Not a separate npm package by default.** Split to `@teengine/<name>` only when bundle size, release cadence, or third-party ownership demands it (see §7).

### 2.3 What “Core” (T2) IS

Core modules are **always imported from the main entry** and are part of the engine’s default story:

- You do not “register” Core — you construct `Engine`, `World`, `PhysicsBridge`.
- Core may contain **optional per-entity features** (e.g. `rigidBody.type: "dynamic"`) as long as the subsystem itself is always present.

---

## 3. Current inventory

### T0 — Internal

| Path | Role |
|------|------|
| `src/gpu/` | WebGPU device, batchers, shaders |
| `src/math/Mat3` | Affine math used by cameras/GPU (export decision: §6) |

### T1 — Kernel

| Path | Role |
|------|------|
| `src/engine/` | Game loop, fixed timestep, pause, resize |
| `src/graphics/` | Cameras, layers, draw API, draw queue |
| `src/math/Color` | Color type used by graphics |

### T2 — Core

| Path | Role |
|------|------|
| `src/ecs/` | `World`, `Entity`, `Transform`, system interfaces, interpolation |
| `src/input/` | Keyboard, mouse, `ActionMap` |
| `src/physics/` | Rapier world, `PhysicsBridge`, collision layers, events, coords |
| `src/assets/` | Atlas types, `loadAtlasFromJson` |

### T3 — Standard (specified, not all implemented)

| Module | Path (target) | Export | Status |
|--------|---------------|--------|--------|
| Character Controller | `src/character-controller/` | `teengine/character-controller` | Planned |
| Animation | `src/animation/` | `teengine/animation` | Planned |
| Scene | `src/scene/` | `teengine/scene` | Planned |
| Math | `src/math/` (Vec2 utilities) | `teengine/math` | Partial |
| Built-in systems pack | `src/systems/` | `teengine/systems` | Partial (`SpinSystem`, etc. live in `ecs/systems/` today — migrate when pack grows) |

### T4 — Application

| Path | Role |
|------|------|
| `examples/demo/src/PlayerControllerSystem.ts` | Demo movement tuning + input wiring |
| `examples/demo/src/CoinPickupSystem.ts` | Demo pickup rules |
| `examples/demo/src/DemoScene.ts` | Scene content |
| `examples/demo/src/createDemoAtlas.ts` | Procedural demo art |

### Misplaced today (migration required)

These violate the spec and must move or be generalized:

| Item | Current | Target |
|------|---------|--------|
| `PlayerTag`, `CoinTag` | T2 `Entity.ts` | Remove from Core; use generic tags in T4 or `tags: string[]` on entity |
| `PlayerControllerSystem` | T4 (correct) | After CC module lands: thin wrapper over `CharacterMotor` + demo action names |
| `SpinSystem`, `CameraFollowSystem`, `WorldEntityRenderSystem` | T2 `ecs/systems/` | T3 `systems/` when subpath export is added (behavior unchanged) |

---

## 4. Standard module contract

Every T3 module MUST provide:

```
src/<module>/
  index.ts           # public exports only
  types.ts           # components, config, results
  README.md          # optional; user-facing usage (or section in docs/)
  *.test.ts          # unit tests
```

Every T3 module MUST document:

1. **Dependencies** — which T1/T2 modules it uses.
2. **Registration** — what the game adds to `World` / `Engine`.
3. **Fixed-update phase** — when it runs relative to §5.
4. **Non-goals** — what the module explicitly does not do.

Every T3 module MUST NOT:

- Import from `examples/`
- Add game-specific marker components (`player`, `coin`, …)
- Read input action names unless configurable via constructor/options

---

## 5. Fixed-update pipeline (integration contract)

All modules hook into this ordered pipeline. **Do not invent parallel update paths.**

| Phase | Owner | Work |
|-------|-------|------|
| **P0** | T2 `World` | `physics.snapshotPreviousTransforms()` |
| **P1** | T4 / custom | `FixedSystem`s — read input, AI, set **intent** on components |
| **P2** | T3 Character Controller | Apply intent → collision-resolved displacement for KCC entities |
| **P3** | T2 `PhysicsBridge` | `physics.step(dt)` — dynamic bodies, event queue |
| **P4** | T2 `World` | `physics.syncToEntities()` |
| **P5** | T4 / custom | `PostPhysicsSystem`s — triggers, gameplay reactions |

Render path unchanged: T2 interpolation via `World.getRenderTransform()` → T3/render systems → T1 `Graphics`.

**Rule:** Character Controller runs at **P2**, before `physics.step()`. It moves **kinematic** bodies; dynamic bodies are unaffected.

---

## 6. Public export map

### Today

```json
{
  "exports": {
    ".": "./dist/index.js"
  }
}
```

Main entry exports **T1 + T2 only**.

### Target (when first T3 module ships)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./character-controller": {
      "types": "./dist/character-controller/index.d.ts",
      "import": "./dist/character-controller/index.js"
    },
    "./systems": {
      "types": "./dist/systems/index.d.ts",
      "import": "./dist/systems/index.js"
    },
    "./math": {
      "types": "./dist/math/index.d.ts",
      "import": "./dist/math/index.js"
    }
  }
}
```

`tsup` entry array grows per T3 module. **T3 never re-exports through main `index.ts`** — that keeps tree-shaking and mental boundaries clean.

---

## 7. When to split a separate npm package

Stay in `teengine` until **all** of:

- Module is >~15kB minified **and** most consumers omit it, **or**
- Independent versioning is required (third-party maintainer), **or**
- It introduces a new heavy dependency not wanted by core consumers

Split format: `@teengine/<module>` workspace package depending on `teengine`.

Character Controller **does not qualify** — it uses existing `@dimforge/rapier2d` Core dependency.

---

## 8. Character Controller module (full spec)

**Tier:** T3 Standard  
**Path:** `packages/teengine/src/character-controller/`  
**Export:** `teengine/character-controller`  
**Depends on:** T2 `physics`, T2 `ecs`

### 8.1 Purpose

Provide **collision-resolved kinematic movement** for controllable avatars (platformers, top-down with slide). Replaces dynamic-body velocity hacks for characters.

### 8.2 Non-goals

- Not input binding (T4 / game code)
- Not animation, root motion, or networked prediction
- Not a replacement for dynamic rigid bodies (crates, ragdolls)
- Not exported from main `teengine` entry

### 8.3 Types

```ts
/** Per-entity motor configuration (spawn-time). */
export type CharacterMotorComponent = {
  /** Max horizontal speed, engine units / sec. */
  moveSpeed: number;
  /** Initial upward speed when jump requested, engine units / sec (Y-down: negative). */
  jumpSpeed: number;
  /** Gravity applied when airborne, engine units / sec² (Y-down: positive). */
  gravity: number;
  /** Rapier autostep max height, engine units. Default: 0 (disabled). */
  maxStepHeight?: number;
  /** Snap to ground within this distance. Default: 0.5. */
  snapToGround?: number;
};

/** Written by game systems each tick before motor solve (P1 → P2). */
export type CharacterIntent = {
  /** -1..1, normalized horizontal desired direction. */
  moveX: number;
  /** Request jump if grounded (or coyote — game sets flag). */
  jump: boolean;
};

/** Read-only result after P2 solve. */
export type CharacterMotorState = {
  grounded: boolean;
  /** Vertical velocity after solve, engine space. */
  velocityY: number;
};
```

Entity storage (Core change — generic optional fields):

```ts
// ecs/Entity.ts — add to Entity + SpawnConfig
characterMotor?: CharacterMotorComponent;
characterIntent?: CharacterIntent;   // cleared or overwritten each P1
```

Core hosts **storage** only. All behavior lives in the T3 module.

### 8.4 Public API

```ts
// teengine/character-controller

export type { CharacterMotorComponent, CharacterIntent, CharacterMotorState };

/** Runs P2 for all entities with characterMotor + kinematic rigid body. */
export class CharacterMotorSystem implements FixedSystem {
  constructor(options?: { gravityY?: number }); // default from PhysicsWorld if omitted
}

/** Low-level access when games bypass the system (advanced). */
export class CharacterMotor {
  constructor(bridge: PhysicsBridge);
  setIntent(entityId: EntityId, intent: CharacterIntent): void;
  solve(entityId: EntityId, dt: number): CharacterMotorState;
  getState(entityId: EntityId): CharacterMotorState;
}
```

`CharacterMotor` wraps Rapier `KinematicCharacterController` internally. Rapier types do not leak across the public boundary.

### 8.5 Physics integration (inside module)

The module extends physics behavior **without** bloating `PhysicsBridge`’s public Core API:

```
character-controller/
  RapierCharacterMotor.ts   # one KCC instance per motor entity
  CharacterMotorSystem.ts
  index.ts
```

Registration lifecycle:

| Event | Action |
|-------|--------|
| Entity spawned with `characterMotor` + `collider` + `rigidBody.type: "kinematicPosition"` | Create Rapier KCC + link to existing body/collider handles |
| Entity removed | Destroy KCC |
| `PhysicsBridge.unregister` | Module hook must run (via system-owned map or bridge callback list) |

**Core change (minimal):** `PhysicsBridge` exposes `onRegister` / `onUnregister` callbacks OR `CharacterMotor` subscribes through `World.spawn`/`remove` wrappers. Pick one during implementation; do not duplicate body maps.

### 8.6 Required spawn shape

```ts
world.spawn({
  transform: { x, y },
  collider: { shape: { kind: "box", width, height }, friction: 0 },
  collision: { response: "solid", layers: ... },
  rigidBody: { type: "kinematicPosition", lockRotation: true },
  characterMotor: { moveSpeed: 220, jumpSpeed: 280, gravity: 980 },
});
```

Invalid combinations **throw at spawn** with explicit errors:

- `characterMotor` + `rigidBody.type: "dynamic"` → error
- `characterMotor` without `collider` → error

### 8.7 Application-layer usage (demo)

```ts
import { CharacterMotorSystem } from "teengine/character-controller";

// P1 — demo system: input → intent (T4)
class DemoPlayerIntentSystem implements FixedSystem {
  fixedUpdate({ world, input }) {
    for (const e of world.getAll()) {
      if (!e.characterMotor || !e.player) continue; // player tag stays in T4 until generic tags land
      e.characterIntent = {
        moveX: input.actionAxis("move_left", "move_right"),
        jump: input.actionPressed("jump"),
      };
    }
  }
}

world.addFixedSystem(new DemoPlayerIntentSystem());
world.addFixedSystem(new CharacterMotorSystem());
```

After migration, `PlayerControllerSystem.ts` is deleted or reduced to `DemoPlayerIntentSystem`.

### 8.8 Tests (required before stable)

- Grounded detection on flat surface
- No jump when airborne (without coyote flag from game)
- Horizontal slide along vertical wall
- Coordinate round-trip (engine Y-down ↔ Rapier Y-up)
- Interpolation still smooth (`isSimulatedBody` kinematic path)
- Sensor collision events still fire (coin pickup unchanged)

### 8.9 Versioning

Ships as **minor** bump (`0.4.0`): new subpath export, no breaking Core API.

---

## 9. Future Standard modules (brief spec)

### 9.1 Animation (T3)

- `SpriteAnimationComponent` + `AnimationSystem` (P1 or render-adjacent)
- Frame sequences from atlas regions; optional Aseprite tag import
- Does not include state machines (T4)

### 9.2 Scene (T3)

- `Scene` interface: `enter(ctx)`, `exit()`
- `SceneStack`: push / pop / replace
- Does not include editor serialization

### 9.3 Math (T3)

- `Vec2` operations, `clamp`, `lerp`, distance
- Export `Mat3` for custom camera/transform work
- Does not include full linear algebra library

---

## 10. Implementation checklist (Character Controller)

- [ ] Add `docs/MODULES.md` (this file)
- [ ] Add `characterMotor` / `characterIntent` to Core entity storage
- [ ] Implement `src/character-controller/` per §8
- [ ] Add `teengine/character-controller` export + tsup entry
- [ ] Wire P2 in `World.fixedUpdate` **or** document that `CharacterMotorSystem` must be registered last among P1 systems (prefer explicit P2 hook in `World` when motor entities exist)
- [ ] Migrate demo to intent system + `CharacterMotorSystem`
- [ ] Remove impulse-based jump from demo
- [ ] Deprecate `PlayerTag` / `CoinTag` from Core types (major bump when removed)
- [ ] Update `ARCHITECTURE.md` roadmap + `PHYSICS.md` phase status

**P2 hook decision:** Prefer an explicit `World` phase over convention-based system ordering:

```ts
// World.fixedUpdate — target shape
for (const system of this.fixedSystems) system.fixedUpdate(ctx);
this.characterMotor?.solveAll(ctx);  // owned by optional module registration
this.physics?.step(ctx.dt);
```

`World.registerCharacterMotor(motor: CharacterMotor)` called when the game imports the module — Core knows the interface type via minimal callback, or motor registers as a special `FixedSystem` with guaranteed P2 slot.

---

## 11. Summary

| Question | Answer |
|----------|--------|
| Is Character Controller Core? | **No.** T3 Standard module. |
| Is it a plugin? | **No.** First-party module in `teengine`, subpath export. |
| Where does Rapier KCC live? | Inside `character-controller/`, not scattered in demo or `PhysicsBridge`. |
| Where does input → jump live? | T4 application (`DemoPlayerIntentSystem`). |
| What is Core’s job? | Entity field storage, pipeline phases, `PhysicsBridge.step/sync`. |

**No half measures:** the Character Controller ships as a complete T3 module with types, system, tests, export path, and pipeline slot — or it does not ship.
