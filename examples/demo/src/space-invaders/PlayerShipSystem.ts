import type { EntityId, FixedSystem, FixedSystemContext } from "teengine";
import { Layers } from "teengine";
import { SI_ATLAS } from "./createSpaceInvadersAtlas.js";
import { PLAYER_H, PLAYER_SPEED, PLAYER_W, WORLD_W, spriteSize, type SpaceInvadersState } from "./spaceInvadersState.js";

export class PlayerShipSystem implements FixedSystem {
  readonly name = "PlayerShipSystem";

  constructor(
    private readonly playerId: EntityId,
    private readonly state: SpaceInvadersState,
  ) {}

  fixedUpdate(ctx: FixedSystemContext): void {
    const { world, input, dt } = ctx;
    if (this.state.gameOver || this.state.won) return;

    const player = world.get(this.playerId);
    if (!player) return;

    const dx = input.actionAxis("move_left", "move_right");
    const size = spriteSize(world, player, PLAYER_W, PLAYER_H);
    player.transform.x = Math.max(size.w * 0.5, Math.min(WORLD_W - size.w * 0.5, player.transform.x + dx * PLAYER_SPEED * dt));

    if (!input.actionDown("fire") || this.state.playerBulletId !== null) return;

    const bulletId = world.spawn({
      name: "PlayerBullet",
      transform: {
        x: player.transform.x,
        y: player.transform.y - size.h * 0.5 - 6,
      },
      sprite: { asset: SI_ATLAS, region: "bullet", layer: Layers.world },
    });
    this.state.playerBulletId = bulletId;
  }
}
