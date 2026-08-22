import type { CollisionLayers } from "@teengine/core";

export function toInteractionGroups(layers: CollisionLayers): number {
  return (layers.category << 16) | layers.mask;
}
