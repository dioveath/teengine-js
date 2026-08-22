import type { Color } from "../math/index.js";
import type { Camera2D } from "./Camera2D.js";
import type { FrameRenderer, RenderStats } from "./FrameRenderer.js";
import { RECORD_FLOATS, R, type RenderQueue } from "./RenderQueue.js";
import type { TextureHandle } from "./sprite.js";

export class HeadlessRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly stats: RenderStats = { drawCalls: 0, instances: 0, textureBinds: 0, packMs: 0 };
  private readonly textures = new Set<number>();
  private nextTexture = 1;
  private width = 1;
  private height = 1;

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

  render(_width: number, _height: number, _clearColor: Color, _cameras: readonly Camera2D[], queue: RenderQueue): void {
    for (let k = 0; k < queue.count; k++) {
      const i = queue.order[k] * RECORD_FLOATS;
      if (queue.data[i + R.kind] === 0 && !this.textures.has(queue.data[i + R.texId])) {
        throw new Error(`Unknown texture ${queue.data[i + R.texId]} — upload it before drawing.`);
      }
    }
  }

  uploadRgba(): TextureHandle {
    return { id: this.track() };
  }

  disposeTexture(): void {}

  uploadImage(): TextureHandle {
    return { id: this.track() };
  }

  private track(): number {
    const id = this.nextTexture++;
    this.textures.add(id);
    return id;
  }

  dispose(): void {}
}
