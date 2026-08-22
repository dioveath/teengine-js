import type { Color } from "../math/index.js";
import type { Camera2D } from "./Camera2D.js";
import type { RenderQueue, RenderStats } from "./RenderQueue.js";
import type { TextureHandle } from "./sprite.js";

export type { RenderStats };

export interface FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly viewport: { width: number; height: number };
  readonly stats: RenderStats;
  resizeToDisplaySize(): { width: number; height: number };
  resize(width: number, height: number): void;
  render(
    width: number,
    height: number,
    clearColor: Color,
    cameras: readonly Camera2D[],
    queue: RenderQueue,
  ): void;
  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle;
  uploadImage(bitmap: ImageBitmap): TextureHandle;
  disposeTexture(handle: TextureHandle): void;
  dispose(): void;
}
