import type { AtlasRegion } from "../assets/Atlas.js";
import type { Color } from "../math/index.js";
import { FrameRenderer } from "../gpu/FrameRenderer.js";
import { WebGPUContext } from "../gpu/WebGPUContext.js";
import { Camera2D } from "./Camera2D.js";
import {
  DrawQueue,
  resolveDrawOptions,
  resolveShapeZ,
  type DrawOptions,
  type ShapeOptions,
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

  private constructor(frameRenderer: FrameRenderer, layers: LayerRegistry) {
    this.frameRenderer = frameRenderer;
    this.layers = layers;
  }

  static async create(gpu: WebGPUContext): Promise<Graphics> {
    const frameRenderer = await FrameRenderer.create(gpu);
    const layers = new LayerRegistry();
    return new Graphics(frameRenderer, layers);
  }

  registerLayer(name: string, options: RegisterLayerOptions): void {
    this.layers.register(name, {
      camera: options.camera,
      sort: options.sort ?? "z",
    });
  }

  resize(width: number, height: number): void {
    this.frameRenderer.resize(width, height);
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
    const layerName = this.requireLayer("drawSprite");
    const layer = this.layers.get(layerName);
    this.frameRenderer.spriteBatcher.registerTexture(
      region.texture.texture,
      region.texture.view,
      region.texture.sampler,
    );

    this.queue.push({
      kind: "sprite",
      layer: layerName,
      region,
      opts: resolveDrawOptions(region, opts, layer.sort),
    });
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
    options: ShapeOptions = {},
  ): void {
    const layerName = this.requireLayer("drawRect");
    const layer = this.layers.get(layerName);
    this.queue.push({
      kind: "shapeRect",
      layer: layerName,
      z: resolveShapeZ(y, height, layer.sort, options.z),
      x,
      y,
      width,
      height,
      color,
    });
  }

  drawCircle(
    cx: number,
    cy: number,
    radius: number,
    color: Color,
    options: ShapeOptions & { segments?: number } = {},
  ): void {
    const layerName = this.requireLayer("drawCircle");
    const layer = this.layers.get(layerName);
    this.queue.push({
      kind: "shapeCircle",
      layer: layerName,
      z: resolveShapeZ(cy, radius * 2, layer.sort, options.z),
      x: cx,
      y: cy,
      radius,
      color,
      segments: options.segments ?? 32,
    });
  }

  drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    color: Color,
    options: ShapeOptions = {},
  ): void {
    const layerName = this.requireLayer("drawLine");
    const layer = this.layers.get(layerName);
    const sortY = Math.max(y0, y1);
    this.queue.push({
      kind: "shapeLine",
      layer: layerName,
      z: resolveShapeZ(sortY, width, layer.sort, options.z),
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

  /** Registered layer draw order. */
  get layerOrder(): readonly string[] {
    return this.layers.drawOrder;
  }

  getLayerSortMode(name: string): LayerSortMode {
    return this.layers.get(name).sort;
  }

  private requireLayer(caller: string): string {
    if (!this.currentLayer) {
      throw new Error(`${caller}() called outside of beginLayer()/endLayer().`);
    }
    return this.currentLayer;
  }
}

export { Camera2D, createUiCamera } from "./Camera2D.js";
export { createWorldCamera } from "./Camera2D.js";
export { Color } from "../math/index.js";
export type { LayerSortMode } from "./LayerRegistry.js";
export type { ShapeOptions } from "./DrawQueue.js";
