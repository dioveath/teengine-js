import { describe, expect, it } from "vitest";
import { createEntity, hasPhysics, isSimulatedBody } from "./Entity.js";

describe("createEntity", () => {
  it("assigns defaults and copies spawn config", () => {
    const entity = createEntity(1, {
      name: "Hero",
      transform: { x: 10, y: 20 },
      tags: ["player", "hero"],
    });

    expect(entity.id).toBe(1);
    expect(entity.name).toBe("Hero");
    expect(entity.active).toBe(true);
    expect(entity.transform.x).toBe(10);
    expect(entity.transform.y).toBe(20);
    expect(entity.tags.has("player")).toBe(true);
    expect(entity.tags.has("hero")).toBe(true);
  });

  it("starts with an empty tag set when none are provided", () => {
    const entity = createEntity(2, {});
    expect(entity.tags.size).toBe(0);
  });
});

describe("hasPhysics", () => {
  it("is true when a collider component is present", () => {
    const entity = createEntity(3, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
    });
    expect(hasPhysics(entity)).toBe(true);
  });

  it("is false without a collider", () => {
    expect(hasPhysics(createEntity(4, {}))).toBe(false);
  });
});

describe("isSimulatedBody", () => {
  it("is true for dynamic and kinematic bodies", () => {
    const dynamic = createEntity(5, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
      rigidBody: { type: "dynamic" },
    });
    const kinematic = createEntity(6, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
      rigidBody: { type: "kinematicPosition" },
    });

    expect(isSimulatedBody(dynamic)).toBe(true);
    expect(isSimulatedBody(kinematic)).toBe(true);
  });

  it("is false for fixed bodies and entities without rigidBody", () => {
    const fixed = createEntity(7, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
      rigidBody: { type: "fixed" },
    });

    expect(isSimulatedBody(fixed)).toBe(false);
    expect(isSimulatedBody(createEntity(8, {}))).toBe(false);
  });
});
