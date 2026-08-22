import type { EntityId, World } from "teengine";

export const WORLD_W = 800;
export const WORLD_H = 600;

/** Max rendered game size in viewport pixels before letterboxing (uniform scale, no stretch). */
export const MAX_VIEW_W = 1280;
export const MAX_VIEW_H = 960;

export const PLAYER_Y = 548;
export const PLAYER_SPEED = 360;
export const PLAYER_W = 28;
export const PLAYER_H = 20;

export const INVADER_ROWS = 5;
export const INVADER_COLS = 11;
export const INVADER_W = 22;
export const INVADER_H = 16;
export const INVADER_PAD_X = 48;
export const INVADER_PAD_Y = 40;
export const INVADER_START_X = 136;
export const INVADER_START_Y = 80;

export const BULLET_W = 4;
export const BULLET_H = 12;
export const PLAYER_BULLET_SPEED = 520;
export const ENEMY_BULLET_SPEED = 280;

export const BASE_FORMATION_SPEED = 28;
export const FORMATION_STEP_DOWN = 16;
export const FORMATION_MARGIN = 24;

export type InvaderKind = "A" | "B";

export type SpaceInvadersState = {
  score: number;
  lives: number;
  gameOver: boolean;
  won: boolean;
  formationDir: 1 | -1;
  enemyFireCooldown: number;
  invaderAnimFrame: 0 | 1;
  invaderAnimTimer: number;
  invaderIds: EntityId[];
  invaderKinds: Map<EntityId, InvaderKind>;
  hudHeartIds: EntityId[];
  playerBulletId: EntityId | null;
  enemyBulletIds: Set<EntityId>;
};

export function createSpaceInvadersState(): SpaceInvadersState {
  return {
    score: 0,
    lives: 3,
    gameOver: false,
    won: false,
    formationDir: 1,
    enemyFireCooldown: 1.2,
    invaderAnimFrame: 0,
    invaderAnimTimer: 0,
    invaderIds: [],
    invaderKinds: new Map(),
    hudHeartIds: [],
    playerBulletId: null,
    enemyBulletIds: new Set(),
  };
}

export function invaderRegion(kind: InvaderKind, frame: 0 | 1): string {
  if (kind === "A") return frame === 0 ? "invaderA" : "invaderAAlt";
  return frame === 0 ? "invaderB" : "invaderBAlt";
}

export function spriteSize(world: World, entity: { sprite?: { asset: string; region: string } }, fw: number, fh: number): { w: number; h: number } {
  if (!entity.sprite) return { w: fw, h: fh };
  const frame = world.assets.frame(entity.sprite.asset, entity.sprite.region);
  return { w: frame.width, h: frame.height };
}

export function invaderPoints(kind: InvaderKind): number {
  return kind === "A" ? 30 : 20;
}

export function boxesOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  const aLeft = ax - aw * 0.5;
  const aRight = ax + aw * 0.5;
  const aTop = ay - ah * 0.5;
  const aBottom = ay + ah * 0.5;
  const bLeft = bx - bw * 0.5;
  const bRight = bx + bw * 0.5;
  const bTop = by - bh * 0.5;
  const bBottom = by + bh * 0.5;
  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

export function formationSpeed(state: SpaceInvadersState): number {
  const alive = Math.max(state.invaderIds.length, 1);
  const speedup = (INVADER_ROWS * INVADER_COLS - alive) * 1.8;
  return BASE_FORMATION_SPEED + speedup;
}
