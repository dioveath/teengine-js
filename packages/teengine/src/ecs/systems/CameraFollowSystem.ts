import type { Camera2D } from "../../graphics/Camera2D.js";
import type { RenderSystem } from "../System.js";

export class CameraFollowSystem implements RenderSystem {
  readonly name = "CameraFollowSystem";

  constructor(
    private readonly camera: Camera2D,
    private readonly followTag: string,
  ) {}

  render(ctx: import("../System.js").RenderSystemContext): void {
    for (const entity of ctx.world.getAll()) {
      if (!entity.active || !entity.tags.has(this.followTag)) continue;
      const t = ctx.world.getRenderTransform(entity, ctx.alpha);
      this.camera.lookAt(t.x, t.y);
      return;
    }
  }
}
