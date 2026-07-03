import type { AtlasRegion, EntityId, FixedSystem } from "teengine";
import { Layers } from "teengine";
import {
  BULLET_H,
  BULLET_W,
  ENEMY_BULLET_SPEED,
  INVADER_H,
  INVADER_W,
  PLAYER_BULLET_SPEED,
  PLAYER_H,
  PLAYER_W,
  PLAYER_Y,
  WORLD_H,
  WORLD_W,
  boxesOverlap,
  invaderPoints,
  type SpaceInvadersState,
} from "./spaceInvadersState.js";

export class CombatSystem implements FixedSystem {
  readonly name = "CombatSystem";

  constructor(
    private readonly playerId: EntityId,
    private readonly state: SpaceInvadersState,
    private readonly enemyBulletRegion: AtlasRegion,
  ) {}

  fixedUpdate(ctx: import("teengine").FixedSystemContext): void {
    const { world, dt } = ctx;
    if (this.state.gameOver || this.state.won) return;

    this.movePlayerBullet(world, dt);
    this.moveEnemyBullets(world, dt);
    this.fireEnemyBullet(world, dt);
    this.checkCollisions(world);
    this.checkWin();
  }

  private movePlayerBullet(world: import("teengine").FixedSystemContext["world"], dt: number): void {
    if (this.state.playerBulletId === null) return;
    const bullet = world.get(this.state.playerBulletId);
    if (!bullet) {
      this.state.playerBulletId = null;
      return;
    }

    bullet.transform.y -= PLAYER_BULLET_SPEED * dt;
    if (bullet.transform.y < -BULLET_H) {
      world.remove(this.state.playerBulletId);
      this.state.playerBulletId = null;
    }
  }

  private moveEnemyBullets(world: import("teengine").FixedSystemContext["world"], dt: number): void {
    for (const id of [...this.state.enemyBulletIds]) {
      const bullet = world.get(id);
      if (!bullet) {
        this.state.enemyBulletIds.delete(id);
        continue;
      }
      bullet.transform.y += ENEMY_BULLET_SPEED * dt;
      if (bullet.transform.y > WORLD_H + BULLET_H) {
        world.remove(id);
        this.state.enemyBulletIds.delete(id);
      }
    }
  }

  private fireEnemyBullet(world: import("teengine").FixedSystemContext["world"], dt: number): void {
    if (this.state.invaderIds.length === 0) return;

    this.state.enemyFireCooldown -= dt;
    if (this.state.enemyFireCooldown > 0) return;

    const shooters = this.state.invaderIds
      .map((id) => world.get(id))
      .filter((e): e is NonNullable<typeof e> => e !== undefined);
    if (shooters.length === 0) return;

    const byColumn = new Map<number, typeof shooters>();
    for (const invader of shooters) {
      const col = Math.round(invader.transform.x);
      const list = byColumn.get(col) ?? [];
      list.push(invader);
      byColumn.set(col, list);
    }

    const columns = [...byColumn.keys()];
    const pickCol = columns[Math.floor(Math.random() * columns.length)] ?? columns[0];
    const columnInvaders = byColumn.get(pickCol) ?? [];
    const shooter = columnInvaders.reduce((best, cur) =>
      cur.transform.y > best.transform.y ? cur : best,
    );

    const bulletId = world.spawn({
      name: "EnemyBullet",
      transform: { x: shooter.transform.x, y: shooter.transform.y + INVADER_H * 0.5 + 4 },
      sprite: { region: this.enemyBulletRegion, layer: Layers.world },
    });
    this.state.enemyBulletIds.add(bulletId);
    this.state.enemyFireCooldown = 0.8 + Math.random() * 1.2;
  }

  private checkCollisions(world: import("teengine").FixedSystemContext["world"]): void {
    const player = world.get(this.playerId);
    if (!player) return;

    if (this.state.playerBulletId !== null) {
      const bullet = world.get(this.state.playerBulletId);
      if (bullet) {
        for (const invaderId of [...this.state.invaderIds]) {
          const invader = world.get(invaderId);
          if (!invader) continue;
          if (
            boxesOverlap(
              bullet.transform.x,
              bullet.transform.y,
              BULLET_W,
              BULLET_H,
              invader.transform.x,
              invader.transform.y,
              INVADER_W,
              INVADER_H,
            )
          ) {
            const kind = this.state.invaderKinds.get(invaderId) ?? "B";
            this.state.score += invaderPoints(kind);
            world.remove(invaderId);
            this.state.invaderIds = this.state.invaderIds.filter((id) => id !== invaderId);
            this.state.invaderKinds.delete(invaderId);
            world.remove(this.state.playerBulletId);
            this.state.playerBulletId = null;
            break;
          }
        }
      }
    }

    for (const bulletId of [...this.state.enemyBulletIds]) {
      const bullet = world.get(bulletId);
      if (!bullet) continue;
      if (
        boxesOverlap(
          bullet.transform.x,
          bullet.transform.y,
          BULLET_W,
          BULLET_H,
          player.transform.x,
          player.transform.y,
          PLAYER_W,
          PLAYER_H,
        )
      ) {
        world.remove(bulletId);
        this.state.enemyBulletIds.delete(bulletId);
        this.killPlayer(world);
        break;
      }
    }

    for (const invaderId of this.state.invaderIds) {
      const invader = world.get(invaderId);
      if (!invader) continue;
      if (
        boxesOverlap(
          invader.transform.x,
          invader.transform.y,
          INVADER_W,
          INVADER_H,
          player.transform.x,
          player.transform.y,
          PLAYER_W,
          PLAYER_H,
        )
      ) {
        this.state.gameOver = true;
        break;
      }
    }
  }

  private killPlayer(world: import("teengine").FixedSystemContext["world"]): void {
    this.state.lives -= 1;
    for (const bulletId of [...this.state.enemyBulletIds]) {
      world.remove(bulletId);
    }
    this.state.enemyBulletIds.clear();
    if (this.state.playerBulletId !== null) {
      world.remove(this.state.playerBulletId);
      this.state.playerBulletId = null;
    }

    while (this.state.hudHeartIds.length > this.state.lives) {
      const heartId = this.state.hudHeartIds.pop();
      if (heartId !== undefined) {
        world.remove(heartId);
      }
    }

    if (this.state.lives <= 0) {
      this.state.gameOver = true;
      return;
    }

    const player = world.get(this.playerId);
    if (player) {
      player.transform.x = WORLD_W * 0.5;
      player.transform.y = PLAYER_Y;
    }
  }

  private checkWin(): void {
    if (this.state.invaderIds.length === 0) {
      this.state.won = true;
    }
  }
}
