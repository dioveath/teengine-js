import { Color, Layers, type Graphics, type RenderSystem } from "teengine";
import { WORLD_H, WORLD_W, type SpaceInvadersState } from "./spaceInvadersState.js";

export class HudRenderSystem implements RenderSystem {
  readonly name = "HudRenderSystem";

  constructor(
    private readonly state: SpaceInvadersState,
    private readonly onHudUpdate: (score: number, lives: number, status: string) => void,
  ) {}

  render(_ctx: import("teengine").RenderSystemContext): void {
    let status = "Playing";
    if (this.state.won) status = "You win!";
    if (this.state.gameOver && !this.state.won) status = "Game over";
    this.onHudUpdate(this.state.score, this.state.lives, status);

  }
}

export class StarfieldRenderSystem implements RenderSystem {
  readonly name = "StarfieldRenderSystem";

  private readonly stars: Array<{ x: number; y: number; size: number; phase: number }>;

  constructor(private readonly graphics: Graphics) {
    this.stars = Array.from({ length: 48 }, (_, i) => ({
      x: (i * 97) % WORLD_W,
      y: (i * 53) % WORLD_H,
      size: 1 + (i % 3),
      phase: (i * 0.7) % (Math.PI * 2),
    }));
  }

  render(ctx: import("teengine").RenderSystemContext): void {
    const { time } = ctx;
    this.graphics.beginLayer(Layers.world);
    for (const star of this.stars) {
      const twinkle = 0.35 + 0.25 * Math.sin(time * 2 + star.phase);
      this.graphics.drawRect(
        star.x,
        star.y,
        star.size,
        star.size,
        Color.rgb(twinkle, twinkle, twinkle + 0.1, 0.9),
      );
    }
    this.graphics.endLayer();
  }
}
