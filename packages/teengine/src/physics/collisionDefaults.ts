import type { CollisionComponent, Entity } from "../ecs/Entity.js";
import { COLLIDE_ALL } from "./CollisionLayers.js";

export type ResolvedCollision = Required<CollisionComponent>;

export function resolveCollision(entity: Entity): ResolvedCollision | null {
  if (!entity.collider) return null;

  if (entity.collision) {
    return {
      response: entity.collision.response,
      layers: entity.collision.layers ?? COLLIDE_ALL,
      emitEvents: entity.collision.emitEvents ?? entity.collision.response === "sensor",
    };
  }

  if (entity.rigidBody) {
    return {
      response: "solid",
      layers: COLLIDE_ALL,
      emitEvents: false,
    };
  }

  return {
    response: "sensor",
    layers: COLLIDE_ALL,
    emitEvents: true,
  };
}

/**
 * True if this entity should appear as `event.self` for a collision it's involved in.
 *
 * Rapier only queues collision events for a collider whose resolved `emitEvents`
 * is true in the first place (see `PhysicsWorld.createPhysicsForEntity`), so once
 * that guard passes, the entity is always the `self` side — whether it's a sensor
 * or a solid with `collision.emitEvents: true` explicitly set (the only way a
 * solid's resolved `emitEvents` becomes true, since solids default to `false`).
 *
 * `entity` is unused today: `collisionListener` has no additional effect on this
 * result. Tracked as a Core API cleanup (see `docs/MODULES.md`), not fixed here
 * to avoid changing event-emission behavior as part of a "simplify" pass.
 */
export function shouldEmitAsSelf(_entity: Entity, collision: ResolvedCollision): boolean {
  return collision.emitEvents;
}
