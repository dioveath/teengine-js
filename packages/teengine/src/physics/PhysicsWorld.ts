import RAPIER from "@dimforge/rapier2d";
import type { Entity } from "../ecs/Entity.js";
import {
  engineGravityToRapier,
  engineToRapier,
  engineVelocityToRapier,
  rapierToEngine,
} from "./coords.js";

export type RigidBodyHandle = number;

export type PhysicsWorldOptions = {
  /** Gravity in engine space (positive Y = down). Default 980. */
  gravityY?: number;
};

export class PhysicsWorld {
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<RigidBodyHandle, RAPIER.RigidBody>();
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
    this.world.step();
  }

  /** Create a Rapier body from an entity's transform + rigidBody config. */
  createBodyForEntity(entity: Entity): RigidBodyHandle {
    const config = entity.rigidBody;
    if (!config) {
      throw new Error("Entity has no rigidBody component.");
    }

    const { x, y } = engineToRapier(entity.transform.x, entity.transform.y);
    let bodyDesc: RAPIER.RigidBodyDesc;

    switch (config.type) {
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
    if (config.lockRotation ?? config.type === "dynamic") {
      bodyDesc.lockRotations();
    }

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.createColliderDesc(config.collider);
    colliderDesc.restitution = config.restitution ?? 0;
    colliderDesc.friction = config.friction ?? 0.5;
    this.world.createCollider(colliderDesc, body);

    return this.store(body);
  }

  removeBody(handle: RigidBodyHandle): void {
    const body = this.bodies.get(handle);
    if (!body) return;
    this.world.removeRigidBody(body);
    this.bodies.delete(handle);
  }

  getTransform(handle: RigidBodyHandle): { x: number; y: number; rotation: number } {
    const body = this.bodies.get(handle);
    if (!body) {
      throw new Error(`RigidBody handle ${handle} not found.`);
    }
    const t = body.translation();
    return rapierToEngine(t.x, t.y, body.rotation());
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
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(width * 0.5, height * 0.5),
      body,
    );
    return this.store(body);
  }

  private createColliderDesc(
    collider: NonNullable<Entity["rigidBody"]>["collider"],
  ): RAPIER.ColliderDesc {
    if (collider.kind === "ball") {
      return RAPIER.ColliderDesc.ball(collider.radius);
    }
    return RAPIER.ColliderDesc.cuboid(collider.width * 0.5, collider.height * 0.5);
  }

  private store(body: RAPIER.RigidBody): RigidBodyHandle {
    const handle = this.nextHandle++;
    this.bodies.set(handle, body);
    return handle;
  }
}
