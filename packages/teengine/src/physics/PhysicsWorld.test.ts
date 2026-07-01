import { beforeAll, describe, expect, it } from "vitest";
import { createEntity } from "../ecs/Entity.js";
import { PhysicsWorld } from "./PhysicsWorld.js";

describe("PhysicsWorld", () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = await PhysicsWorld.create({ gravityY: 980 });
  });

  it("accelerates dynamic bodies downward in engine space", () => {
    const entity = createEntity(1, {
      transform: { x: 100, y: 50 },
      rigidBody: {
        type: "dynamic",
        collider: { kind: "box", width: 32, height: 32 },
      },
    });

    const handle = physics.createBodyForEntity(entity);
    const startY = physics.getTransform(handle).y;

    for (let i = 0; i < 30; i++) {
      physics.step(1 / 60);
    }

    expect(physics.getTransform(handle).y).toBeGreaterThan(startY + 20);
    physics.removeBody(handle);
  });

  it("applies upward impulse against engine gravity sign", () => {
    const entity = createEntity(2, {
      transform: { x: 100, y: 200 },
      rigidBody: {
        type: "dynamic",
        collider: { kind: "box", width: 32, height: 32 },
      },
    });

    const handle = physics.createBodyForEntity(entity);
    const velocityBefore = physics.getLinearVelocity(handle);
    physics.applyImpulse(handle, 0, -280);

    const velocityAfter = physics.getLinearVelocity(handle);
    expect(velocityAfter.y).toBeLessThan(0);
    expect(velocityAfter.y).toBeLessThan(velocityBefore.y);

    physics.removeBody(handle);
  });

  it("rests a falling body on a static floor", () => {
    physics.createStaticBox(0, 300, 400, 20);

    const entity = createEntity(3, {
      transform: { x: 200, y: 100 },
      rigidBody: {
        type: "dynamic",
        collider: { kind: "box", width: 40, height: 40 },
        restitution: 0,
        friction: 1,
      },
    });

    const handle = physics.createBodyForEntity(entity);

    for (let i = 0; i < 180; i++) {
      physics.step(1 / 60);
    }

    const transform = physics.getTransform(handle);
    const velocity = physics.getLinearVelocity(handle);

    expect(transform.y).toBeGreaterThan(240);
    expect(transform.y).toBeLessThan(285);
    expect(Math.abs(velocity.y)).toBeLessThan(5);

    physics.removeBody(handle);
  });
});
