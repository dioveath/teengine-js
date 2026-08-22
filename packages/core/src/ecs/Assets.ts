import type { SpriteFrame } from "../graphics/sprite.js";

export class AssetBank {
  private readonly atlases = new Map<string, Map<string, SpriteFrame>>();

  add(asset: string, regions: Record<string, SpriteFrame>): void {
    const map = this.atlases.get(asset) ?? new Map();
    for (const [name, frame] of Object.entries(regions)) map.set(name, frame);
    this.atlases.set(asset, map);
  }

  frame(asset: string, region: string): SpriteFrame {
    const frame = this.atlases.get(asset)?.get(region);
    if (!frame) throw new Error(`Missing sprite ${asset}:${region}`);
    return frame;
  }

  has(asset: string, region: string): boolean {
    return this.atlases.get(asset)?.has(region) ?? false;
  }

  keys(): string[] {
    return [...this.atlases.keys()];
  }
}
