import type { FixedSystem, FixedSystemContext } from "teengine";
import { DemoTags } from "./demoConstants.js";

export class CoinPickupSystem implements FixedSystem {
  readonly name = "CoinPickupSystem";

  fixedUpdate(ctx: FixedSystemContext): void {
    const { world, physics } = ctx;
    if (!physics) return;

    for (const event of physics.drainCollisionEvents()) {
      if (event.kind !== "enter") continue;

      const self = world.get(event.self);
      const other = world.get(event.other);
      if (self?.tags.has(DemoTags.coin) && other?.tags.has(DemoTags.player)) {
        world.remove(event.self);
      }
    }
  }
}
