/**
 * TeEngine uses Y-down world coordinates; Rapier uses Y-up.
 * All conversions happen at the physics boundary.
 */

export function engineToRapier(x: number, y: number): { x: number; y: number } {
  return { x, y: -y };
}

export function rapierToEngine(
  x: number,
  y: number,
  rotation: number,
): { x: number; y: number; rotation: number } {
  return { x, y: -y, rotation: -rotation };
}

/** Engine Y-down gravity (positive = down) → Rapier gravity vector. */
export function engineGravityToRapier(gravityY: number): { x: number; y: number } {
  return { x: 0, y: -gravityY };
}

/** Engine velocity → Rapier linear velocity. */
export function engineVelocityToRapier(vx: number, vy: number): { x: number; y: number } {
  return { x: vx, y: -vy };
}

/** Rapier linear velocity → engine velocity. */
export function rapierVelocityToEngine(vx: number, vy: number): { x: number; y: number } {
  return { x: vx, y: -vy };
}
