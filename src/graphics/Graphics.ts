import type { AtlasRegion } from "../assets/Atlas.js";
import type { Color } from "../math/index.js";
import { FrameRenderer } from "../gpu/FrameRenderer.js";
import { WebGPUContext } from "../gpu/WebGPUContext.js";
import { Camera2D, createUiCamera } from "./Camera2D.js";
import {
  DrawQueue,
  resolveDrawOptions,
  type DrawOptions,
} from "./DrawQueue.js";
import { LayerRegistry, type LayerSortMode } from "./LayerRegistry.js";

export type RegisterLayerOptions = {
  camera: Camera2D;
  sort?: LayerSortMode;
};

/**
 * Opinionated 2D graphics API: camera-first, layer-based, sprite batching.
 */
export class Graphics {
  private readonly frameRenderer: FrameRenderer;
  private readonly layers: LayerRegistry;
  private readonly queue = new DrawQueue();
  private currentLayer: string | null = null;
  private uiCamera: Camera2D;

  private constructor(frameRenderer: FrameRenderer, layers: LayerRegistry, uiCamera: Camera2D) {
    this.frameRenderer = frameRenderer;
    this.layers = layers;
    this.uiCamera = uiCamera;
  }

  static async create(gpu: WebGPUContext): Promise<Graphics> {
    const frameRenderer = await FrameRenderer.create(gpu);
    const layers = new LayerRegistry();
    const { width, height } = frameRenderer.viewport;
    const uiCamera = createUiCamera(width, height);
    return new Graphics(frameRenderer, layers, uiCamera);
  }

  /** Must be called before beginLayer(). */
  registerLayer(name: string, options: RegisterLayerOptions): void {
    this.layers.register(name, {
      camera: options.camera,
      sort: options.sort ?? "z",
    });
  }

  /** Update UI camera center when the viewport resizes. */
  resize(width: number, height: number): void {
    this.frameRenderer.resize(width, height);
    this.uiCamera.x = width * 0.5;
    this.uiCamera.y = height * 0.5;
  }

  beginFrame(clearColor: Color): void {
    this.queue.clear();
    this.currentLayer = null;
    this.frameRenderer.beginFrame(clearColor);
  }

  beginLayer(name: string): void {
    this.layers.get(name);
    this.currentLayer = name;
  }

  endLayer(): void {
    this.currentLayer = null;
  }

  drawSprite(region: AtlasRegion, opts: DrawOptions): void {
    if (!this.currentLayer) {
      throw new Error("drawSprite() called outside of beginLayer()/endLayer().");
    }

    const layer = this.layers.get(this.currentLayer);
    this.frameRenderer.spriteBatcher.registerTexture(
      region.texture.texture,
      region.texture.view,
      region.texture.sampler,
    );

    this.queue.push({
      kind: "sprite",
      layer: this.currentLayer,
      region,
      opts: resolveDrawOptions(region, opts, layer.sort),
    });
  }

  drawDebugRect(x: number, y: number, width: number, height: number, color: Color): void {
    if (!this.currentLayer) {
      throw new Error("drawDebugRect() called outside of beginLayer()/endLayer().");
    }
    this.queue.push({
      kind: "debugRect",
      layer: this.currentLayer,
      x,
      y,
      width,
      height,
      color,
    });
  }

  drawDebugLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    color: Color,
  ): void {
    if (!this.currentLayer) {
      throw new Error("drawDebugLine() called outside of beginLayer()/endLayer().");
    }
    this.queue.push({
      kind: "debugLine",
      layer: this.currentLayer,
      x0,
      y0,
      x1,
      y1,
      width,
      color,
    });
  }

  endFrame(): void {
    const grouped = this.queue.byLayer(this.layers.drawOrder);
    this.frameRenderer.endFrame(
      this.layers.drawOrder,
      grouped,
      (name) => this.layers.get(name),
    );
  }

  get viewport(): { width: number; height: number } {
    return this.frameRenderer.viewport;
  }

  /** Helper to configure the standard UI layer camera after registerLayer("ui", ...). */
  getUiCamera(): Camera2D {
    return this.uiCamera;
  }
}

export { Camera2D, createUiCamera } from "./Camera2D.js";
export { createWorldCamera } from "./Camera2D.js";
export { Color } from "../math/index.js";
export type { LayerSortMode } from "./LayerRegistry.js";
