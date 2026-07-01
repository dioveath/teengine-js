import type { Entity, EntityId } from "../ecs/Entity.js";
import { snapshotTransform, type TransformSnapshot } from "../ecs/interpolation.js";
import type { Transform } from "../ecs/Transform.js";
import type { PhysicsWorld, RigidBodyHandle } from "./PhysicsWorld.js";

type BodyEntry = {
  handle: RigidBodyHandle;
  prev: TransformSnapshot;
};

/**
 * Decouples Rapier runtime state from ECS components.
 * Handles body lifecycle, sync, and render interpolation.
 */
export class PhysicsBridge {
  private readonly bodies = new Map<EntityId, BodyEntry>();
  private readonly pending: Entity[] = [];

  constructor(private readonly physics: PhysicsWorld) {}

  /** Queue entity for body creation (handles spawn-before-bridge ordering). */
  register(entity: Entity): void {
    if (!entity.rigidBody) return;
    if (this.bodies.has(entity.id)) return;

    if (this.pending.some((e) => e.id === entity.id)) return;
    this.pending.push(entity);
    this.flushPending();
  }

  unregister(entityId: EntityId): void {
    const entry = this.bodies.get(entityId);
    if (entry) {
      this.physics.removeBody(entry.handle);
      this.bodies.delete(entityId);
    }
    const idx = this.pending.findIndex((e) => e.id === entityId);
    if (idx >= 0) this.pending.splice(idx, 1);
  }

  hasBody(entityId: EntityId): boolean {
    return this.bodies.has(entityId);
  }

  getHandle(entityId: EntityId): RigidBodyHandle | undefined {
    return this.bodies.get(entityId)?.handle;
  }

  /** Snapshot transforms before physics step for interpolation. */
  snapshotPreviousTransforms(getTransform: (id: EntityId) => Transform | undefined): void {
    for (const [id, entry] of this.bodies) {
      const transform = getTransform(id);
      if (transform) {
        entry.prev = snapshotTransform(transform);
      }
    }
  }

  step(dt: number): void {
    this.physics.step(dt);
  }

  syncToEntities(getEntity: (id: EntityId) => Entity | undefined): void {
    for (const [id, entry] of this.bodies) {
      const entity = getEntity(id);
      if (!entity) continue;

      const t = this.physics.getTransform(entry.handle);
      entity.transform.x = t.x;
      entity.transform.y = t.y;
      entity.transform.rotation = t.rotation;
    }
  }

  /** Interpolated transform for rendering dynamic bodies. */
  getInterpolatedTransform(
    entityId: EntityId,
    current: Transform,
    alpha: number,
    out: TransformSnapshot,
  ): TransformSnapshot {
    const entry = this.bodies.get(entityId);
    if (!entry) {
      return snapshotTransform(current);
    }
    const snap = snapshotTransform(current);
    out.x = entry.prev.x + (snap.x - entry.prev.x) * alpha;
    out.y = entry.prev.y + (snap.y - entry.prev.y) * alpha;
    out.rotation = entry.prev.rotation + (snap.rotation - entry.prev.rotation) * alpha;
    out.scaleX = snap.scaleX;
    out.scaleY = snap.scaleY;
    return out;
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
      const handle = this.physics.createBodyForEntity(entity);
      this.bodies.set(entity.id, {
        handle,
        prev: snapshotTransform(entity.transform),
      });
      this.pending.splice(i, 1);
    }
  }
}
