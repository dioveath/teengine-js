import type { Camera2D } from "./Camera2D.js";

export type LayerSortMode = "y" | "z" | "none";

export type LayerConfig = {
  camera: Camera2D;
  sort: LayerSortMode;
};

export class LayerRegistry {
  private readonly layers = new Map<string, LayerConfig>();
  private readonly order: string[] = [];

  register(name: string, config: LayerConfig): void {
    if (this.layers.has(name)) {
      throw new Error(`Layer "${name}" is already registered.`);
    }
    this.layers.set(name, config);
    this.order.push(name);
  }

  get(name: string): LayerConfig {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`Layer "${name}" is not registered. Call registerLayer() first.`);
    }
    return layer;
  }

  /** Registered layer draw order. */
  get drawOrder(): readonly string[] {
    return this.order;
  }
}
