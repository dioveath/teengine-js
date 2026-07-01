import { Color, Layers, type Camera2D, type Graphics } from "teengine";
import type { RenderSystem } from "teengine";

export type DebugOverlayOptions = {
  groundY: number;
  worldCamera: Camera2D;
};

/** Draws debug overlays (ground line, mouse cursor) on the world layer. */
export class DebugOverlaySystem implements RenderSystem {
  readonly name = "DebugOverlaySystem";

  constructor(
    private readonly graphics: Graphics,
    private readonly options: DebugOverlayOptions,
  ) {}

  render(ctx: import("teengine").RenderSystemContext): void {
    const { input, width, height } = ctx;
    const { groundY, worldCamera } = this.options;

    this.graphics.beginLayer(Layers.world);
    this.graphics.drawLine(0, groundY, 2000, groundY, 2, Color.rgb(0.2, 0.25, 0.3, 0.5));

    if (input.isMouseInCanvas) {
      const mouse = input.mouseWorld(worldCamera, width, height);
      this.graphics.drawCircle(mouse.x, mouse.y, 8, Color.rgb(0.88, 0.42, 0.52, 0.6), {
        segments: 16,
      });
    }
    this.graphics.endLayer();
  }
}
