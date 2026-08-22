import type { Color } from "../math/index.js";
import type { DrawCommand } from "./DrawQueue.js";
import type { FrameRenderer } from "./FrameRenderer.js";
import type { LayerConfig } from "./LayerRegistry.js";
import type { TextureHandle } from "./sprite.js";

export class HeadlessRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  private width = 1;
  private height = 1;
  private nextTexture = 1;

  constructor(canvas: HTMLCanvasElement = document.createElement("canvas")) {
    this.canvas = canvas;
  }

  get viewport(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  resizeToDisplaySize(): { width: number; height: number } {
    const width = Math.max(1, this.canvas.width || 1);
    const height = Math.max(1, this.canvas.height || 1);
    this.resize(width, height);
    return { width, height };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  beginFrame(_clearColor: Color): void {}

  endFrame(
    _layerOrder: readonly string[],
    _grouped: Map<string, DrawCommand[]>,
    _getLayer: (name: string) => LayerConfig,
  ): void {}

  uploadRgba(_data: Uint8Array, _width: number, _height: number): TextureHandle {
    return { id: this.nextTexture++ };
  }

  uploadImage(_bitmap: ImageBitmap): TextureHandle {
    return { id: this.nextTexture++ };
  }

  prepareSprite(_handle: TextureHandle): void {}

  dispose(): void {}
}
