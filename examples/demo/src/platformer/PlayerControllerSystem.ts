import type { EntityId, FixedSystem } from "teengine";
import type { PlatformerPhysicsState } from "./PlatformerPhysicsEventsSystem.js";

const MOVE_SPEED = 220;
const JUMP_IMPULSE = 280;

export class PlayerControllerSystem implements FixedSystem {
  readonly name = "PlayerControllerSystem";

  constructor(
    private readonly playerId: EntityId,
    private readonly physicsState: PlatformerPhysicsState,
  ) {}

  fixedUpdate(ctx: import("teengine").FixedSystemContext): void {
    const { world, input, physics } = ctx;
    if (!physics) return;

    const entity = world.get(this.playerId);
    if (!entity?.active || !entity.rigidBody) return;

    const dx = input.actionAxis("move_left", "move_right");
    const vel = physics.getLinearVelocity(entity.id);
    physics.setLinearVelocity(entity.id, dx * MOVE_SPEED, vel.y);

    if (input.actionPressed("jump") && this.physicsState.grounded) {
      physics.applyImpulse(entity.id, 0, JUMP_IMPULSE);
      this.physicsState.grounded = false;
    }
  }
}
