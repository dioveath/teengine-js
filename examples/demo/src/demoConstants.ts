import type { AtlasRegion } from "teengine";

/** Demo-specific atlas layout — your game defines its own atlas shape. */
export type DemoAtlas = {
  player: AtlasRegion;
  enemy: AtlasRegion;
  coin: AtlasRegion;
  uiHeart: AtlasRegion;
};

/** Tags used by the demo game systems. */
export const DemoTags = {
  player: "player",
  coin: "coin",
  cameraTarget: "cameraTarget",
} as const;

/**
 * Demo collision layer bits — games define their own constants.
 * Must be distinct powers of two so masks compose cleanly.
 */
export const DemoCollisionGroups = {
  PLAYER: 1 << 1,
  PICKUP: 1 << 2,
  GROUND: 1 << 3,
  ENEMY: 1 << 4,
} as const;
