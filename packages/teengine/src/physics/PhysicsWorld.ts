import RAPIER from "@dimforge/rapier2d";
import type { ColliderShape, Entity, EntityId } from "../ecs/Entity.js";
import { isSimulatedBody } from "../ecs/Entity.js";
import {
  engineGravityToRapier,
  engineToRapier,
  engineVelocityToRapier,
  rapierToEngine,
} from "./coords.js";
import type { CollisionEvent } from "./CollisionEvents.js";
import { toInteractionGroups } from "./CollisionLayers.js";
import { resolveCollision, shouldEmitAsSelf } from "./collisionDefaults.js";

export type RigidBodyHandle = number;
export type ColliderHandle = number;

export type PhysicsWorldOptions = {
  /** Gravity in engine space (positive Y = down). Default 980. */
  gravityY?: number;
};

type EntityPhysicsEntry = {
  bodyHandle: RigidBodyHandle;
  colliderHandle: ColliderHandle;
  simulates: boolean;
};

export class PhysicsWorld {
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<RigidBodyHandle, RAPIER.RigidBody>();
  private readonly entityPhysics = new Map<EntityId, EntityPhysicsEntry>();
  private readonly colliders = new Map<ColliderHandle, EntityId>();
  private readonly entities = new Map<EntityId, Entity>();
  private readonly eventQueue = new RAPIER.EventQueue(true);
  private readonly collisionEvents: CollisionEvent[] = [];
  private nextHandle = 1;

  private constructor(world: RAPIER.World) {
    this.world = world;
  }

  static async create(options: PhysicsWorldOptions = {}): Promise<PhysicsWorld> {
    const gravity = engineGravityToRapier(options.gravityY ?? 980);
    return new PhysicsWorld(new RAPIER.World(gravity));
  }

  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step(this.eventQueue);
    this.collectCollisionEvents();
  }

  drainCollisionEvents(): readonly CollisionEvent[] {
    return this.collisionEvents;
  }

  createPhysicsForEntity(entity: Entity): RigidBodyHandle {
    if (!entity.collider) {
      throw new Error("Entity has no collider component.");
    }

    const collision = resolveCollision(entity);
    if (!collision) {
      throw new Error("Entity has no collision policy.");
    }

    const offset = entity.collider.offset ?? { x: 0, y: 0 };
    const worldX = entity.transform.x + offset.x;
    const worldY = entity.transform.y + offset.y;
    const { x, y } = engineToRapier(worldX, worldY);

    const bodyType = entity.rigidBody?.type ?? "fixed";
    let bodyDesc: RAPIER.RigidBodyDesc;

    switch (bodyType) {
      case "fixed":
        bodyDesc = RAPIER.RigidBodyDesc.fixed();
        break;
      case "kinematicPosition":
        bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      default:
        bodyDesc = RAPIER.RigidBodyDesc.dynamic();
        break;
    }

    bodyDesc.setTranslation(x, y);
    if (entity.rigidBody?.lockRotation ?? bodyType === "dynamic") {
      bodyDesc.lockRotations();
    }

    const body = this.world.createRigidBody(bodyDesc);
    const bodyHandle = this.storeBody(body);

    const colliderDesc = this.createColliderDesc(entity.collider.shape);
    colliderDesc.restitution = entity.collider.restitution ?? 0;
    colliderDesc.friction = entity.collider.friction ?? 0.5;
    colliderDesc.setSensor(collision.response === "sensor");
    colliderDesc.setCollisionGroups(toInteractionGroups(collision.layers));

    if (collision.emitEvents) {
      colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    }

    const collider = this.world.createCollider(colliderDesc, body);
    const colliderHandle = collider.handle;

    this.colliders.set(colliderHandle, entity.id);
    this.entities.set(entity.id, entity);
    this.entityPhysics.set(entity.id, {
      bodyHandle,
      colliderHandle,
      simulates: isSimulatedBody(entity),
    });

    return bodyHandle;
  }

  removeEntity(entityId: EntityId): void {
    const entry = this.entityPhysics.get(entityId);
    if (!entry) return;

    const body = this.bodies.get(entry.bodyHandle);
    if (body) {
      this.world.removeRigidBody(body);
      this.bodies.delete(entry.bodyHandle);
    }

    this.colliders.delete(entry.colliderHandle);
    this.entityPhysics.delete(entityId);
    this.entities.delete(entityId);
  }

  removeBody(handle: RigidBodyHandle): void {
    for (const [entityId, entry] of this.entityPhysics) {
      if (entry.bodyHandle === handle) {
        this.removeEntity(entityId);
        return;
      }
    }
  }

  hasEntity(entityId: EntityId): boolean {
    return this.entityPhysics.has(entityId);
  }

  simulatesEntity(entityId: EntityId): boolean {
    return this.entityPhysics.get(entityId)?.simulates ?? false;
  }

  getTransform(handle: RigidBodyHandle): { x: number; y: number; rotation: number } {
    const body = this.bodies.get(handle);
    if (!body) {
      throw new Error(`RigidBody handle ${handle} not found.`);
    }
    const t = body.translation();
    return rapierToEngine(t.x, t.y, body.rotation());
  }

  getTransformForEntity(entityId: EntityId): { x: number; y: number; rotation: number } | null {
    const entry = this.entityPhysics.get(entityId);
    if (!entry) return null;
    return this.getTransform(entry.bodyHandle);
  }

  setLinearVelocity(handle: RigidBodyHandle, vx: number, vy: number): void {
    const body = this.bodies.get(handle);
    if (!body) return;
    body.setLinvel(engineVelocityToRapier(vx, vy), true);
  }

  getLinearVelocity(handle: RigidBodyHandle): { x: number; y: number } {
    const body = this.bodies.get(handle);
    if (!body) return { x: 0, y: 0 };
    const v = body.linvel();
    return { x: v.x, y: -v.y };
  }

  applyImpulse(handle: RigidBodyHandle, ix: number, iy: number): void {
    const body = this.bodies.get(handle);
    if (!body) return;
    body.applyImpulse({ x: ix, y: -iy }, true);
  }

  /** Static axis-aligned box in engine coordinates (x,y = top-left). */
  createStaticBox(x: number, y: number, width: number, height: number): RigidBodyHandle {
    const cx = x + width * 0.5;
    const cy = y + height * 0.5;
    const { x: rx, y: ry } = engineToRapier(cx, cy);
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(rx, ry),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(width * 0.5, height * 0.5),
      body,
    );
    this.colliders.set(collider.handle, -1 as EntityId);
    return this.storeBody(body);
  }

  private collectCollisionEvents(): void {
    this.collisionEvents.length = 0;

    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const entityA = this.colliders.get(handle1);
      const entityB = this.colliders.get(handle2);
      if (entityA === undefined || entityB === undefined) return;
      if (entityA < 0 || entityB < 0) return;

      const kind = started ? "enter" : "exit";
      this.pushCollisionEvent(entityA, entityB, kind);
      this.pushCollisionEvent(entityB, entityA, kind);
    });
  }

  private pushCollisionEvent(
    selfId: EntityId,
    otherId: EntityId,
    kind: CollisionEvent["kind"],
  ): void {
    const selfEntity = this.entities.get(selfId);
    if (!selfEntity) return;

    const collision = resolveCollision(selfEntity);
    if (!collision || !shouldEmitAsSelf(selfEntity, collision)) return;

    this.collisionEvents.push({ self: selfId, other: otherId, kind });
  }

  private createColliderDesc(shape: ColliderShape): RAPIER.ColliderDesc {
    if (shape.kind === "ball") {
      return RAPIER.ColliderDesc.ball(shape.radius);
    }
    return RAPIER.ColliderDesc.cuboid(shape.width * 0.5, shape.height * 0.5);
  }

  private storeBody(body: RAPIER.RigidBody): RigidBodyHandle {
    const handle = this.nextHandle++;
    this.bodies.set(handle, body);
    return handle;
  }
}
