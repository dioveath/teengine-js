import type { AtlasRegion, EntityId, FixedSystem, FixedSystemContext } from "teengine";
import { Layers } from "teengine";
import { PLAYER_H, PLAYER_SPEED, PLAYER_W, WORLD_W, type SpaceInvadersState } from "./spaceInvadersState.js";

export class PlayerShipSystem implements FixedSystem {
  readonly name = "PlayerShipSystem";

  constructor(
    private readonly playerId: EntityId,
    private readonly state: SpaceInvadersState,
    private readonly bulletRegion: AtlasRegion,
  ) {}

  fixedUpdate(ctx: FixedSystemContext): void {
    const { world, input, dt } = ctx;
    if (this.state.gameOver || this.state.won) return;

    const player = world.get(this.playerId);
    if (!player) return;

    const dx = input.actionAxis("move_left", "move_right");
    const halfW = (player.sprite?.region.width ?? PLAYER_W) * 0.5;
    player.transform.x = Math.max(halfW, Math.min(WORLD_W - halfW, player.transform.x + dx * PLAYER_SPEED * dt));

    if (!input.actionDown("fire") || this.state.playerBulletId !== null) return;

    const playerH = player.sprite?.region.height ?? PLAYER_H;
    const bulletId = world.spawn({
      name: "PlayerBullet",
      transform: {
        x: player.transform.x,
        y: player.transform.y - playerH * 0.5 - this.bulletRegion.height * 0.5,
      },
      sprite: { region: this.bulletRegion, layer: Layers.world },
    });
    this.state.playerBulletId = bulletId;
  }
}
