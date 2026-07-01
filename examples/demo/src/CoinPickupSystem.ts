import type { FixedSystem } from "teengine";

export class CoinPickupSystem implements FixedSystem {
  readonly name = "CoinPickupSystem";

  fixedUpdate(ctx: import("teengine").FixedSystemContext): void {
    const { world, physics } = ctx;
    if (!physics) return;

    for (const event of physics.drainCollisionEvents()) {
      if (event.kind !== "enter") continue;

      const self = world.get(event.self);
      const other = world.get(event.other);
      if (self?.coin && other?.player) {
        world.remove(event.self);
      }
    }
  }
}
