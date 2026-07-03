import { beforeAll, describe, expect, it } from "vitest";
import { createEntity } from "../ecs/Entity.js";
import { PhysicsBridge } from "./PhysicsBridge.js";
import { PhysicsWorld } from "./PhysicsWorld.js";
import { CollisionGroups, layers } from "./CollisionLayers.js";

describe("Collision events", () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = await PhysicsWorld.create({ gravityY: 0 });
  });

  it("emits enter when a player overlaps a sensor pickup", () => {
    const bridge = new PhysicsBridge(physics);

    const player = createEntity(1, {
      transform: { x: 100, y: 100 },
      collider: { shape: { kind: "box", width: 32, height: 32 } },
      collision: {
        response: "solid",
        layers: layers(CollisionGroups.PLAYER, CollisionGroups.PICKUP),
      },
      rigidBody: { type: "dynamic" },
    });

    const coin = createEntity(2, {
      transform: { x: 100, y: 100 },
      collider: { shape: { kind: "ball", radius: 12 } },
      collision: {
        response: "sensor",
        layers: layers(CollisionGroups.PICKUP, CollisionGroups.PLAYER),
      },
    });

    bridge.register(player);
    bridge.register(coin);

    let sawEnter = false;
    for (let i = 0; i < 5; i++) {
      bridge.step(1 / 60);
      for (const event of bridge.drainCollisionEvents()) {
        if (event.kind === "enter" && event.self === coin.id && event.other === player.id) {
          sawEnter = true;
        }
      }
      if (sawEnter) break;
    }

    expect(sawEnter).toBe(true);

    bridge.unregister(player.id);
    bridge.unregister(coin.id);
  });

  it("does not emit events for solid-solid pairs by default", () => {
    const bridge = new PhysicsBridge(physics);

    const a = createEntity(10, {
      transform: { x: 50, y: 50 },
      collider: { shape: { kind: "box", width: 20, height: 20 } },
      collision: { response: "solid" },
      rigidBody: { type: "dynamic" },
    });

    const b = createEntity(11, {
      transform: { x: 50, y: 50 },
      collider: { shape: { kind: "box", width: 20, height: 20 } },
      collision: { response: "solid" },
      rigidBody: { type: "dynamic" },
    });

    bridge.register(a);
    bridge.register(b);

    for (let i = 0; i < 10; i++) {
      bridge.step(1 / 60);
    }

    expect(bridge.drainCollisionEvents()).toHaveLength(0);

    bridge.unregister(a.id);
    bridge.unregister(b.id);
  });
});
