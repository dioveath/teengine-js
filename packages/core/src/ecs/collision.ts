export type CollisionLayers = {
  category: number;
  mask: number;
};

export const COLLIDE_ALL: CollisionLayers = { category: 0xffff, mask: 0xffff };

export const CollisionGroups = {
  DEFAULT: 1 << 0,
  PLAYER: 1 << 1,
  PICKUP: 1 << 2,
  GROUND: 1 << 3,
  ENEMY: 1 << 4,
} as const;

export function layers(category: number, mask: number): CollisionLayers {
  return { category, mask };
}

export type CollisionEventKind = "enter" | "exit";

export type CollisionEvent = {
  self: number;
  other: number;
  kind: CollisionEventKind;
};
