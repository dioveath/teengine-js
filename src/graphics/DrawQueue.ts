import type { AtlasRegion } from "../assets/Atlas.js";
import type { Color } from "../math/index.js";

export type DrawOptions = {
  x: number;
  y: number;
  z?: number;
  scale?: { x: number; y: number };
  rotation?: number;
  /** Pivot in sprite pixels. Defaults to region center. */
  origin?: { x: number; y: number };
  tint?: Color;
  flipX?: boolean;
  flipY?: boolean;
};

export type ResolvedDrawOptions = {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  originX: number;
  originY: number;
  tint: Color;
  flipX: boolean;
  flipY: boolean;
};

export function resolveDrawOptions(
  region: AtlasRegion,
  opts: DrawOptions,
  sortMode: "y" | "z" | "none",
): ResolvedDrawOptions {
  const scale = opts.scale ?? { x: 1, y: 1 };
  const origin = opts.origin ?? { x: region.width * 0.5, y: region.height * 0.5 };
  const z =
    opts.z ??
    (sortMode === "y" ? opts.y + region.height : opts.y);

  return {
    x: opts.x,
    y: opts.y,
    z,
    scaleX: scale.x,
    scaleY: scale.y,
    rotation: opts.rotation ?? 0,
    originX: origin.x,
    originY: origin.y,
    tint: opts.tint ?? { r: 1, g: 1, b: 1, a: 1 },
    flipX: opts.flipX ?? false,
    flipY: opts.flipY ?? false,
  };
}

export type SpriteDrawCommand = {
  kind: "sprite";
  layer: string;
  region: AtlasRegion;
  opts: ResolvedDrawOptions;
};

export type DebugRectCommand = {
  kind: "debugRect";
  layer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
};

export type DebugLineCommand = {
  kind: "debugLine";
  layer: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  color: Color;
};

export type DrawCommand = SpriteDrawCommand | DebugRectCommand | DebugLineCommand;

export class DrawQueue {
  private commands: DrawCommand[] = [];

  push(command: DrawCommand): void {
    this.commands.push(command);
  }

  /** Commands grouped by layer name. */
  byLayer(layerNames: readonly string[]): Map<string, DrawCommand[]> {
    const grouped = new Map<string, DrawCommand[]>();
    for (const name of layerNames) {
      grouped.set(name, []);
    }
    for (const cmd of this.commands) {
      grouped.get(cmd.layer)?.push(cmd);
    }
    return grouped;
  }

  clear(): void {
    this.commands = [];
  }
}
