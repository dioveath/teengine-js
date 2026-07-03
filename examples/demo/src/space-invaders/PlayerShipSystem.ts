import type { AtlasRegion, EntityId, FixedSystem } from "teengine";
import { Layers } from "teengine";
import {
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_W,
  WORLD_W,
  type SpaceInvadersState,
} from "./spaceInvadersState.js";

export class PlayerShipSystem implements FixedSystem {
  readonly name = "PlayerShipSystem";

  constructor(
    private readonly playerId: EntityId,
    private readonly state: SpaceInvadersState,
    private readonly bulletRegion: AtlasRegion,
  ) {}

  fixedUpdate(ctx: import("teengine").FixedSystemContext): void {
    const { world, input, dt } = ctx;
    if (this.state.gameOver || this.state.won) return;

    const player = world.get(this.playerId);
    if (!player) return;

    const dx = input.actionAxis("move_left", "move_right");
    const halfW = PLAYER_W * 0.5;
    player.transform.x = Math.max(halfW, Math.min(WORLD_W - halfW, player.transform.x + dx * PLAYER_SPEED * dt));

    this.state.fireCooldown = Math.max(0, this.state.fireCooldown - dt);
    if (input.actionPressed("fire") && this.state.fireCooldown <= 0 && this.state.playerBulletId === null) {
      const bulletId = world.spawn({
        name: "PlayerBullet",
        transform: { x: player.transform.x, y: player.transform.y - PLAYER_H * 0.5 - 6 },
        sprite: { region: this.bulletRegion, layer: Layers.world },
      });
      this.state.playerBulletId = bulletId;
      this.state.fireCooldown = 0.35;
    }
  }
}
