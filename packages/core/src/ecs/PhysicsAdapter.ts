import type { CollisionEvent } from "./collision.js";
import type { Entity, EntityId } from "./Entity.js";
import type { TransformSnapshot } from "./interpolation.js";
import type { Transform } from "./Transform.js";

export interface PhysicsAdapter {
  register(entity: Entity): void;
  unregister(id: EntityId): void;
  snapshotPreviousTransforms(get: (id: EntityId) => Transform | undefined): void;
  step(dt: number): void;
  syncToEntities(get: (id: EntityId) => Entity | undefined): void;
  simulates(id: EntityId): boolean;
  getInterpolatedTransform(
    id: EntityId,
    current: Transform,
    alpha: number,
    out: TransformSnapshot,
  ): TransformSnapshot;
  drainCollisionEvents(): readonly CollisionEvent[];
  setLinearVelocity(id: EntityId, vx: number, vy: number): void;
  getLinearVelocity(id: EntityId): { x: number; y: number };
  applyImpulse(id: EntityId, ix: number, iy: number): void;
}
