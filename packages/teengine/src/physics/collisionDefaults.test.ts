import { describe, expect, it } from "vitest";
import { createEntity } from "../ecs/Entity.js";
import { resolveCollision, shouldEmitAsSelf } from "./collisionDefaults.js";

describe("resolveCollision", () => {
  it("returns null when the entity has no collider", () => {
    const entity = createEntity(1, {});
    expect(resolveCollision(entity)).toBeNull();
  });

  it("defaults solids (with a rigid body, no explicit collision component) to silent", () => {
    const entity = createEntity(2, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
      rigidBody: { type: "dynamic" },
    });
    const resolved = resolveCollision(entity);
    expect(resolved).toEqual({ response: "solid", layers: expect.anything(), emitEvents: false });
  });

  it("defaults a bare collider (no rigid body, no collision component) to an emitting sensor", () => {
    const entity = createEntity(3, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
    });
    const resolved = resolveCollision(entity);
    expect(resolved).toEqual({ response: "sensor", layers: expect.anything(), emitEvents: true });
  });

  it("respects an explicit collision component over the rigid-body default", () => {
    const entity = createEntity(4, {
      collider: { shape: { kind: "box", width: 10, height: 10 } },
      collision: { response: "solid", emitEvents: true },
      rigidBody: { type: "dynamic" },
    });
    const resolved = resolveCollision(entity);
    expect(resolved?.emitEvents).toBe(true);
  });
});

describe("shouldEmitAsSelf", () => {
  it("never emits when the resolved collision has emitEvents: false", () => {
    const entity = createEntity(5, {});
    expect(shouldEmitAsSelf(entity, { response: "solid", layers: { category: 0, mask: 0 }, emitEvents: false })).toBe(false);
  });

  it("emits for a sensor with emitEvents: true", () => {
    const entity = createEntity(6, {});
    expect(shouldEmitAsSelf(entity, { response: "sensor", layers: { category: 0, mask: 0 }, emitEvents: true })).toBe(true);
  });

  it("emits for a solid that explicitly opted into emitEvents: true", () => {
    const entity = createEntity(7, {});
    expect(shouldEmitAsSelf(entity, { response: "solid", layers: { category: 0, mask: 0 }, emitEvents: true })).toBe(true);
  });
});
