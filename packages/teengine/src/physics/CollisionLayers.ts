/**
 * Collision filtering bitmasks (Rapier interaction groups).
 *
 * Define your own category/mask bit constants in game code — compose with
 * bitwise OR and pass to `layers()`.
 *
 * @see https://rapier.rs/docs/user_guides/javascript/interaction_groups
 */
export type CollisionLayers = {
  /** Groups this collider belongs to (lower 16 bits in Rapier). */
  category: number;
  /** Groups this collider interacts with (upper 16 bits filter). */
  mask: number;
};

/** Rapier `InteractionGroups` packed value: (category << 16) | mask. */
export function toInteractionGroups(layers: CollisionLayers): number {
  return (layers.category << 16) | layers.mask;
}

/** Collide with everything (default). */
export const COLLIDE_ALL: CollisionLayers = {
  category: 0xffff,
  mask: 0xffff,
};

export function layers(
  category: number,
  mask: number,
): CollisionLayers {
  return { category, mask };
}
