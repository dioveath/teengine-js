import type { FixedSystem } from "teengine";
import type { DemoAtlas } from "teengine";
import {
  FORMATION_MARGIN,
  FORMATION_STEP_DOWN,
  INVADER_H,
  INVADER_W,
  WORLD_W,
  formationSpeed,
  invaderRegion,
  type SpaceInvadersState,
} from "./spaceInvadersState.js";

export class InvaderFormationSystem implements FixedSystem {
  readonly name = "InvaderFormationSystem";

  constructor(
    private readonly state: SpaceInvadersState,
    private readonly atlas: DemoAtlas,
  ) {}

  fixedUpdate(ctx: import("teengine").FixedSystemContext): void {
    const { world, dt } = ctx;
    if (this.state.gameOver || this.state.won || this.state.invaderIds.length === 0) return;

    this.state.invaderAnimTimer += dt;
    if (this.state.invaderAnimTimer >= 0.4) {
      this.state.invaderAnimTimer = 0;
      this.state.invaderAnimFrame = this.state.invaderAnimFrame === 0 ? 1 : 0;
      this.updateInvaderSprites(world);
    }

    const speed = formationSpeed(this.state) * this.state.formationDir * dt;
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of this.state.invaderIds) {
      const invader = world.get(id);
      if (!invader) continue;
      invader.transform.x += speed;
      minX = Math.min(minX, invader.transform.x);
      maxX = Math.max(maxX, invader.transform.x);
      maxY = Math.max(maxY, invader.transform.y);
    }

    const halfW = INVADER_W * 0.5;
    const hitEdge =
      (this.state.formationDir > 0 && maxX + halfW >= WORLD_W - FORMATION_MARGIN) ||
      (this.state.formationDir < 0 && minX - halfW <= FORMATION_MARGIN);

    if (hitEdge) {
      this.state.formationDir = this.state.formationDir === 1 ? -1 : 1;
      for (const id of this.state.invaderIds) {
        const invader = world.get(id);
        if (!invader) continue;
        invader.transform.y += FORMATION_STEP_DOWN;
      }
      if (maxY + INVADER_H * 0.5 + FORMATION_STEP_DOWN >= 520) {
        this.state.gameOver = true;
      }
    }
  }

  private updateInvaderSprites(world: import("teengine").FixedSystemContext["world"]): void {
    for (const id of this.state.invaderIds) {
      const invader = world.get(id);
      if (!invader?.sprite) continue;
      const kind = this.state.invaderKinds.get(id) ?? "B";
      invader.sprite.region = invaderRegion(this.atlas, kind, this.state.invaderAnimFrame);
    }
  }
}
