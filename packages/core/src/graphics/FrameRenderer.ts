import type { Color } from "../math/index.js";
import type { DrawCommand } from "./DrawQueue.js";
import type { LayerConfig } from "./LayerRegistry.js";
import type { TextureHandle } from "./sprite.js";

export interface FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly viewport: { width: number; height: number };
  resizeToDisplaySize(): { width: number; height: number };
  resize(width: number, height: number): void;
  beginFrame(clearColor: Color): void;
  endFrame(
    layerOrder: readonly string[],
    grouped: Map<string, DrawCommand[]>,
    getLayer: (name: string) => LayerConfig,
  ): void;
  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle;
  uploadImage(bitmap: ImageBitmap): TextureHandle;
  prepareSprite(handle: TextureHandle): void;
  dispose(): void;
}
