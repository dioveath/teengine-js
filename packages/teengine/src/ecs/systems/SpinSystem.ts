import type { FixedSystem } from "../System.js";

export class SpinSystem implements FixedSystem {
  readonly name = "SpinSystem";

  fixedUpdate(ctx: import("../System.js").FixedSystemContext): void {
    for (const entity of ctx.world.getAll()) {
      if (!entity.active || !entity.spin) continue;
      entity.transform.rotation += entity.spin.speed * ctx.dt;
    }
  }
}
