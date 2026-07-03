/** Registered layer names — use these instead of raw strings. */
export const Layers = {
  world: "world",
  ui: "ui",
} as const;

export type LayerName = (typeof Layers)[keyof typeof Layers];
