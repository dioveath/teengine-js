import { describe, expect, it } from "vitest";
import { Layers } from "../graphics/Layers.js";
import { World } from "../ecs/World.js";
import { Input } from "../input/Input.js";

function createTestInput(): Input {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  return new Input(canvas);
}

describe("World", () => {
  it("spawns entities with monotonically increasing ids", () => {
    const world = new World();
    const a = world.spawn({ name: "A" });
    const b = world.spawn({ name: "B" });
    expect(b).toBe(a + 1);
  });

  it("removes entities and returns undefined from get", () => {
    const world = new World();
    const id = world.spawn({ transform: { x: 1, y: 2 } });
    expect(world.get(id)?.transform.x).toBe(1);

    world.remove(id);
    expect(world.get(id)).toBeUndefined();
  });

  it("filters entities with query", () => {
    const world = new World();
    world.spawn({ tags: ["player"], rigidBody: { type: "dynamic" } });
    world.spawn({ tags: ["coin"] });
    world.spawn({ tags: ["player"], spin: { speed: 1 } });

    const players = world.query({ withTags: ["player"] });
    expect(players).toHaveLength(2);

    const movers = world.query({ withTags: ["player"], with: ["rigidBody"] });
    expect(movers).toHaveLength(1);
    expect(movers[0]?.rigidBody?.type).toBe("dynamic");
  });

  it("returns raw transforms for non-physics entities during render", () => {
    const world = new World();
    const id = world.spawn({ transform: { x: 42, y: 84 } });
    const entity = world.get(id)!;

    const renderTransform = world.getRenderTransform(entity, 0.5);
    expect(renderTransform.x).toBe(42);
    expect(renderTransform.y).toBe(84);
  });

  it("collects renderables into layer buckets and skips inactive entities", () => {
    const world = new World();
    const activeId = world.spawn({
      sprite: {
        region: {
          texture: {} as never,
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          width: 16,
          height: 16,
        },
        layer: Layers.world,
      },
    });
    const inactiveId = world.spawn({
      sprite: {
        region: {
          texture: {} as never,
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          width: 16,
          height: 16,
        },
        layer: Layers.world,
      },
    });

    world.deactivate(inactiveId);

    const buckets = world.collectRenderables(new Map());
    const worldBucket = buckets.get(Layers.world);
    expect(worldBucket?.sprites).toHaveLength(1);
    expect(worldBucket?.sprites[0]?.id).toBe(activeId);
  });

  it("runs fixed systems before post-physics systems", () => {
    const world = new World();
    const input = createTestInput();
    const order: string[] = [];

    world.addFixedSystem({
      name: "Fixed",
      fixedUpdate: () => {
        order.push("fixed");
      },
    });
    world.addPostPhysicsSystem({
      name: "Post",
      fixedUpdate: () => {
        order.push("post");
      },
    });

    world.fixedUpdate({ dt: 1 / 60, tick: 0, time: 0, input, physics: null });
    expect(order).toEqual(["fixed", "post"]);
  });

  it("invokes render systems", () => {
    const world = new World();
    const input = createTestInput();
    let rendered = false;

    world.addRenderSystem({
      name: "Render",
      render: () => {
        rendered = true;
      },
    });

    world.render({
      dt: 1 / 60,
      tick: 0,
      time: 0,
      input,
      physics: null,
      alpha: 1,
      width: 800,
      height: 600,
    });

    expect(rendered).toBe(true);
  });

  it("tracks elapsed simulation time across fixed updates", () => {
    const world = new World();
    const input = createTestInput();

    world.fixedUpdate({ dt: 1 / 60, tick: 0, time: 0, input, physics: null });
    world.fixedUpdate({ dt: 1 / 60, tick: 1, time: 1 / 60, input, physics: null });

    expect(world.elapsed).toBeCloseTo(2 / 60);
  });

  it("activate and deactivate toggle entity.active", () => {
    const world = new World();
    const id = world.spawn({ name: "Toggle" });

    expect(world.get(id)?.active).toBe(true);

    world.deactivate(id);
    expect(world.get(id)?.active).toBe(false);

    world.activate(id);
    expect(world.get(id)?.active).toBe(true);
  });

  it("activate and deactivate throw when the entity is missing", () => {
    const world = new World();
    expect(() => world.activate(999)).toThrow(/not found/);
    expect(() => world.deactivate(999)).toThrow(/not found/);
  });
});

describe("sortEntitiesForLayer", () => {
  it("sorts entities by a custom key when mode is not none", async () => {
    const { sortEntitiesForLayer } = await import("../ecs/World.js");
    const world = new World();
    const low = world.spawn({ transform: { y: 10 } });
    const high = world.spawn({ transform: { y: 100 } });
    const entities = [world.get(high)!, world.get(low)!];

    sortEntitiesForLayer(entities, "y", (entity) => entity.transform.y);
    expect(entities.map((e) => e.id)).toEqual([low, high]);
  });
});
