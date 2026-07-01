import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createEntity } from "../ecs/Entity.js";
import { Transform } from "../ecs/Transform.js";
import { World } from "../ecs/World.js";
import { Input } from "../input/Input.js";
import { PhysicsBridge } from "./PhysicsBridge.js";
import { PhysicsWorld } from "./PhysicsWorld.js";

function createTestInput(): Input {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  return new Input(canvas);
}

describe("PhysicsBridge", () => {
  let physics: PhysicsWorld;
  let bridge: PhysicsBridge;

  beforeAll(async () => {
    physics = await PhysicsWorld.create({ gravityY: 980 });
  });

  beforeEach(() => {
    bridge = new PhysicsBridge(physics);
  });

  it("registers bodies on entity registration and removes them on unregister", () => {
    const entity = createEntity(1, {
      transform: { x: 10, y: 20 },
      rigidBody: {
        type: "dynamic",
        collider: { kind: "box", width: 16, height: 16 },
      },
    });

    bridge.register(entity);
    expect(bridge.hasBody(entity.id)).toBe(true);

    bridge.unregister(entity.id);
    expect(bridge.hasBody(entity.id)).toBe(false);
  });

  it("interpolates between previous and current transforms", () => {
    const entity = createEntity(2, {
      transform: { x: 0, y: 0 },
      rigidBody: {
        type: "dynamic",
        collider: { kind: "box", width: 16, height: 16 },
      },
    });

    bridge.register(entity);
    bridge.snapshotPreviousTransforms(() => entity.transform);

    entity.transform.x = 100;
    entity.transform.y = 40;

    const out = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    bridge.getInterpolatedTransform(entity.id, entity.transform, 0, out);
    expect(out.x).toBeCloseTo(0);
    expect(out.y).toBeCloseTo(0);

    bridge.getInterpolatedTransform(entity.id, entity.transform, 1, out);
    expect(out.x).toBeCloseTo(100);
    expect(out.y).toBeCloseTo(40);

    bridge.getInterpolatedTransform(entity.id, entity.transform, 0.5, out);
    expect(out.x).toBeCloseTo(50);
    expect(out.y).toBeCloseTo(20);

    bridge.unregister(entity.id);
  });

  it("returns the current transform when no physics body exists", () => {
    const current = Transform.create({ x: 12, y: 34, rotation: 0.2 });
    const out = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };

    bridge.getInterpolatedTransform(999, current, 0.5, out);

    expect(out.x).toBe(12);
    expect(out.y).toBe(34);
    expect(out.rotation).toBe(0.2);
  });
});

describe("World physics pipeline", () => {
  let physics: PhysicsWorld;
  let bridge: PhysicsBridge;
  let world: World;
  let input: Input;

  beforeAll(async () => {
    physics = await PhysicsWorld.create({ gravityY: 980 });
  });

  beforeEach(() => {
    bridge = new PhysicsBridge(physics);
    world = new World(bridge);
    input = createTestInput();
  });

  it("runs snapshot → step → sync during fixedUpdate", () => {
    const order: string[] = [];
    vi.spyOn(bridge, "snapshotPreviousTransforms").mockImplementation(() => {
      order.push("snapshot");
    });
    vi.spyOn(bridge, "step").mockImplementation(() => {
      order.push("step");
    });
    vi.spyOn(bridge, "syncToEntities").mockImplementation(() => {
      order.push("sync");
    });

    world.fixedUpdate({ dt: 1 / 60, tick: 0, time: 0, input, physics: bridge });

    expect(order).toEqual(["snapshot", "step", "sync"]);
  });

  it("simulates a dynamic entity falling under gravity", () => {
    const entityId = world.spawn({
      transform: { x: 100, y: 80 },
      rigidBody: {
        type: "dynamic",
        collider: { kind: "box", width: 32, height: 32 },
      },
    });

    for (let i = 0; i < 30; i++) {
      world.fixedUpdate({ dt: 1 / 60, tick: i, time: i / 60, input, physics: bridge });
    }

    const entity = world.get(entityId);
    expect(entity?.transform.y).toBeGreaterThan(80);
  });

  it("uses raw transforms for non-physics entities during render", () => {
    const entityId = world.spawn({
      transform: { x: 50, y: 75 },
    });

    const entity = world.get(entityId);
    expect(entity).toBeDefined();

    const renderTransform = world.getRenderTransform(entity!, 0.5);
    expect(renderTransform.x).toBe(50);
    expect(renderTransform.y).toBe(75);
  });
});
