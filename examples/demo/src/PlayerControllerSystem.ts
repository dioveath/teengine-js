import type { FixedSystem, FixedSystemContext } from "teengine";
import { DemoTags } from "./demoConstants.js";

const MOVE_SPEED = 220;
const JUMP_IMPULSE = 280;

export class PlayerControllerSystem implements FixedSystem {
  readonly name = "PlayerControllerSystem";

  fixedUpdate(ctx: FixedSystemContext): void {
    const { world, input, physics } = ctx;
    if (!physics) return;

    for (const entity of world.query({ withTags: [DemoTags.player], with: ["rigidBody"], active: true })) {

      const dx = input.actionAxis("move_left", "move_right");
      const vel = physics.getLinearVelocity(entity.id);
      physics.setLinearVelocity(entity.id, dx * MOVE_SPEED, vel.y);

      if (input.actionPressed("jump") && Math.abs(vel.y) < 1) {
        physics.applyImpulse(entity.id, 0, JUMP_IMPULSE);
      }
    }
  }
}
