import type { Entity, EntityId } from "../ecs/Entity.js";
import { hasPhysics, isSimulatedBody } from "../ecs/Entity.js";
import { lerpTransform, snapshotTransform, type TransformSnapshot } from "../ecs/interpolation.js";
import type { Transform } from "../ecs/Transform.js";
import type { CollisionEvent } from "./CollisionEvents.js";
import type { PhysicsWorld, RigidBodyHandle } from "./PhysicsWorld.js";

type BodyEntry = {
  handle: RigidBodyHandle;
  prev: TransformSnapshot;
  simulates: boolean;
};

/**
 * Decouples Rapier runtime state from ECS components.
 * Handles body lifecycle, sync, interpolation, and collision events.
 */
export class PhysicsBridge {
  private readonly bodies = new Map<EntityId, BodyEntry>();
  private readonly pending: Entity[] = [];

  constructor(private readonly physics: PhysicsWorld) {}

  /** Queue entity for physics registration (handles spawn-before-bridge ordering). */
  register(entity: Entity): void {
    if (!hasPhysics(entity)) return;
    if (this.bodies.has(entity.id)) return;

    if (this.pending.some((e) => e.id === entity.id)) return;
    this.pending.push(entity);
    this.flushPending();
  }

  unregister(entityId: EntityId): void {
    if (this.bodies.has(entityId)) {
      this.physics.removeEntity(entityId);
      this.bodies.delete(entityId);
    }
    const idx = this.pending.findIndex((e) => e.id === entityId);
    if (idx >= 0) this.pending.splice(idx, 1);
  }

  hasBody(entityId: EntityId): boolean {
    return this.bodies.has(entityId);
  }

  /** True when physics simulation drives this entity's transform. */
  simulates(entityId: EntityId): boolean {
    return this.bodies.get(entityId)?.simulates ?? false;
  }

  /** Snapshot transforms before physics step for interpolation. */
  snapshotPreviousTransforms(getTransform: (id: EntityId) => Transform | undefined): void {
    for (const [id, entry] of this.bodies) {
      if (!entry.simulates) continue;
      const transform = getTransform(id);
      if (transform) {
        entry.prev = snapshotTransform(transform);
      }
    }
  }

  step(dt: number): void {
    this.physics.step(dt);
  }

  /** Collision events from the most recent physics step. */
  drainCollisionEvents(): readonly CollisionEvent[] {
    return this.physics.drainCollisionEvents();
  }

  syncToEntities(getEntity: (id: EntityId) => Entity | undefined): void {
    for (const [id, entry] of this.bodies) {
      if (!entry.simulates) continue;

      const entity = getEntity(id);
      if (!entity) continue;

      // Uses the entity-aware lookup (not `getTransform(entry.handle)`) so any
      // `collider.offset` baked into the body's translation is subtracted back out.
      const t = this.physics.getTransformForEntity(id);
      if (!t) continue;
      entity.transform.x = t.x;
      entity.transform.y = t.y;
      entity.transform.rotation = t.rotation;
    }
  }

  getInterpolatedTransform(
    entityId: EntityId,
    current: Transform,
    alpha: number,
    out: TransformSnapshot,
  ): TransformSnapshot {
    const entry = this.bodies.get(entityId);
    if (!entry?.simulates) {
      const snap = snapshotTransform(current);
      out.x = snap.x;
      out.y = snap.y;
      out.rotation = snap.rotation;
      out.scaleX = snap.scaleX;
      out.scaleY = snap.scaleY;
      return out;
    }

    return lerpTransform(entry.prev, snapshotTransform(current), alpha, out);
  }

  get world(): PhysicsWorld {
    return this.physics;
  }

  setLinearVelocity(entityId: EntityId, vx: number, vy: number): void {
    const handle = this.bodies.get(entityId)?.handle;
    if (handle !== undefined) {
      this.physics.setLinearVelocity(handle, vx, vy);
    }
  }

  getLinearVelocity(entityId: EntityId): { x: number; y: number } {
    const handle = this.bodies.get(entityId)?.handle;
    if (handle === undefined) return { x: 0, y: 0 };
    return this.physics.getLinearVelocity(handle);
  }

  applyImpulse(entityId: EntityId, ix: number, iy: number): void {
    const handle = this.bodies.get(entityId)?.handle;
    if (handle !== undefined) {
      this.physics.applyImpulse(handle, ix, iy);
    }
  }

  createStaticBox(x: number, y: number, width: number, height: number): RigidBodyHandle {
    return this.physics.createStaticBox(x, y, width, height);
  }

  private flushPending(): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const entity = this.pending[i];
      if (this.bodies.has(entity.id)) {
        this.pending.splice(i, 1);
        continue;
      }
      const handle = this.physics.createPhysicsForEntity(entity);
      this.bodies.set(entity.id, {
        handle,
        prev: snapshotTransform(entity.transform),
        simulates: isSimulatedBody(entity),
      });
      this.pending.splice(i, 1);
    }
  }
}
