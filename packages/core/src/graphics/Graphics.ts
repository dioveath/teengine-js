import type { Color } from "../math/index.js";
import {
  DrawQueue,
  resolveDrawOptions,
  resolveShapeZ,
  type DrawOptions,
  type ShapeOptions,
} from "./DrawQueue.js";
import type { FrameRenderer } from "./FrameRenderer.js";
import { LayerRegistry, type LayerSortMode } from "./LayerRegistry.js";
import { Camera2D } from "./Camera2D.js";
import type { SpriteFrame, TextureHandle } from "./sprite.js";
import {
  createCanvasRasterizer,
  DEFAULT_TEXT_STYLE,
  GlyphAtlas,
  type TextStyle,
} from "./text/GlyphAtlas.js";

export type RegisterLayerOptions = {
  camera: Camera2D;
  sort?: LayerSortMode;
};

export class Graphics {
  private readonly layers = new LayerRegistry();
  private readonly queue = new DrawQueue();
  private currentLayer: string | null = null;
  private readonly textAtlases = new Map<string, GlyphAtlas>();

  constructor(readonly renderer: FrameRenderer) {}

  drawText(
    text: string,
    x: number,
    y: number,
    options: TextDrawOptions = {},
  ): void {
    const styleKey = `${options.font ?? DEFAULT_TEXT_STYLE.font}|${options.sizePx ?? DEFAULT_TEXT_STYLE.sizePx}`;
    let atlas = this.textAtlases.get(styleKey);
    if (!atlas) {
      atlas = new GlyphAtlas(
        (pixels, w, h) => this.uploadRgba(pixels, w, h),
        createCanvasRasterizer(),
        { font: options.font, sizePx: options.sizePx },
      );
      this.textAtlases.set(styleKey, atlas);
    }
    const layout = atlas.layout(text);
    const scale = options.scale ?? 1;
    const align = options.align ?? "left";
    const originX = align === "center" ? layout.width * scale * 0.5 : align === "right" ? layout.width * scale : 0;
    for (const glyph of layout.frames) {
      this.drawSprite(glyph.frame, {
        x: x + glyph.x * scale - originX,
        y: y + glyph.y * scale,
        z: options.z,
        scale: { x: scale, y: options.scaleY ?? scale },
        origin: { x: 0, y: 0 },
        tint: options.color,
      });
    }
  }

  measureText(text: string, style: TextStyle = {}): number {
    const styleKey = `${style.font ?? DEFAULT_TEXT_STYLE.font}|${style.sizePx ?? DEFAULT_TEXT_STYLE.sizePx}`;
    let atlas = this.textAtlases.get(styleKey);
    if (!atlas) {
      atlas = new GlyphAtlas(
        (pixels, w, h) => this.uploadRgba(pixels, w, h),
        createCanvasRasterizer(),
        style,
      );
      this.textAtlases.set(styleKey, atlas);
    }
    return atlas.measure(text);
  }

  registerLayer(name: string, options: RegisterLayerOptions): void {
    this.layers.register(name, { camera: options.camera, sort: options.sort ?? "z" });
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  beginFrame(clearColor: Color): void {
    this.queue.clear();
    this.currentLayer = null;
    this.renderer.beginFrame(clearColor);
  }

  beginLayer(name: string): void {
    this.layers.get(name);
    this.currentLayer = name;
  }

  endLayer(): void {
    this.currentLayer = null;
  }

  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle {
    return this.renderer.uploadRgba(data, width, height);
  }

  uploadImage(bitmap: ImageBitmap): TextureHandle {
    return this.renderer.uploadImage(bitmap);
  }

  drawSprite(frame: SpriteFrame, opts: DrawOptions): void {
    const layerName = this.requireLayer("drawSprite");
    const layer = this.layers.get(layerName);
    this.renderer.prepareSprite(frame.texture);
    this.queue.push({
      kind: "sprite",
      layer: layerName,
      frame,
      opts: resolveDrawOptions(frame, opts, layer.sort),
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
    this.queue.push({
      kind: "shapeLine",
      layer: layerName,
      z: resolveShapeZ(Math.max(y0, y1), width, layer.sort, options.z),
      x0,
      y0,
      x1,
      y1,
      width,
      color,
    });
  }

  endFrame(): void {
    this.renderer.endFrame(this.layers.drawOrder, this.queue.byLayer(this.layers.drawOrder), (name) =>
      this.layers.get(name),
    );
  }

  get viewport(): { width: number; height: number } {
    return this.renderer.viewport;
  }

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

export { Camera2D, createUiCamera, createWorldCamera } from "./Camera2D.js";
export { Color } from "../math/index.js";
export type { LayerSortMode } from "./LayerRegistry.js";
export type { ShapeOptions } from "./DrawQueue.js";
export { GlyphAtlas, DEFAULT_TEXT_STYLE, createCanvasRasterizer } from "./text/GlyphAtlas.js";
export type { TextStyle, RasterizedGlyph, GlyphRasterizer, TextLayoutLine } from "./text/GlyphAtlas.js";

export type TextDrawOptions = TextStyle & {
  z?: number;
  color?: Color;
  scale?: number;
  scaleY?: number;
  align?: "left" | "center" | "right";
};
