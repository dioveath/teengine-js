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

export function shouldEmitAsSelf(entity: Entity, collision: ResolvedCollision): boolean {
  if (!collision.emitEvents) return false;
  if (entity.collisionListener) return true;
  if (collision.response === "sensor") return true;
  return entity.collision?.emitEvents === true;
}
