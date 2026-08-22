import type { FixedUpdateSystem } from "../System.js";

export class SpinSystem implements FixedUpdateSystem {
  readonly name = "SpinSystem";

  fixedUpdate(ctx: import("../System.js").FixedUpdateSystemContext): void {
    for (const entity of ctx.world.getAll()) {
      if (!entity.active || !entity.spin) continue;
      entity.transform.rotation += entity.spin.speed * ctx.dt;
    }
  }
}
