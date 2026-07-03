import type { EntityId, FixedSystem } from "teengine";

export type PlatformerPhysicsState = {
  grounded: boolean;
};

/** Handles collision events after the physics step (ground contact, coin pickup). */
export class PlatformerPhysicsEventsSystem implements FixedSystem {
  readonly name = "PlatformerPhysicsEventsSystem";

  constructor(
    private readonly playerId: EntityId,
    private readonly groundId: EntityId,
    private readonly coinIds: ReadonlySet<EntityId>,
    private readonly state: PlatformerPhysicsState,
  ) {}

  fixedUpdate(ctx: import("teengine").FixedSystemContext): void {
    const { world, physics } = ctx;
    if (!physics) return;

    for (const event of physics.drainCollisionEvents()) {
      if (event.self === this.playerId) {
        if (event.other === this.groundId) {
          if (event.kind === "enter") this.state.grounded = true;
          if (event.kind === "exit") this.state.grounded = false;
        }
        continue;
      }

      if (event.kind !== "enter") continue;
      if (!this.coinIds.has(event.self)) continue;
      if (event.other !== this.playerId) continue;

      world.remove(event.self);
    }
  }
}
