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
 * that guard passes, the entity is always the `self` side.
 */
export function shouldEmitAsSelf(_entity: Entity, collision: ResolvedCollision): boolean {
  return collision.emitEvents;
}
