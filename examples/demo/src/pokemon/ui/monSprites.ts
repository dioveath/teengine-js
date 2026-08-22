import type { AssetManager, Graphics, SpriteFrame } from "teengine";

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const LOCAL_BASE = "sprites/mon";
const ATLAS = "mon";

type Entry = { frame: SpriteFrame | null };

export class MonSpriteCache {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly graphics: Graphics,
    private readonly assets: AssetManager,
  ) {}

  front(speciesId: number): SpriteFrame | null {
    return this.get(`f${speciesId}`, speciesId, false);
  }

  back(speciesId: number): SpriteFrame | null {
    return this.get(`b${speciesId}`, speciesId, true);
  }

  private get(key: string, speciesId: number, back: boolean): SpriteFrame | null {
    if (this.assets.has(ATLAS, key)) return this.assets.frame(ATLAS, key);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { frame: null };
      this.entries.set(key, entry);
      void this.load(key, speciesId, back).then((frame) => {
        entry!.frame = frame;
      });
    }
    return entry.frame;
  }

  private async load(key: string, speciesId: number, back: boolean): Promise<SpriteFrame | null> {
    const localUrl = `${LOCAL_BASE}/${speciesId}${back ? "b" : ""}.png`;
    const remoteUrl = `${SPRITE_BASE}/${back ? "back/" : ""}${speciesId}.png`;
    for (const url of [localUrl, remoteUrl]) {
      const frame = await this.fetchOne(url);
      if (frame) {
        this.assets.add(ATLAS, { [key]: frame });
        return frame;
      }
    }
    return null;
  }

  private async fetchOne(url: string): Promise<SpriteFrame | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const bitmap = await createImageBitmap(await res.blob());
      const texture = this.graphics.uploadImage(bitmap);
      return { texture, u0: 0, v0: 0, u1: 1, v1: 1, width: bitmap.width, height: bitmap.height };
    } catch {
      return null;
    }
  }
}
