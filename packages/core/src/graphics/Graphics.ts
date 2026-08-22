import type { Color } from "../math/index.js";
import { Camera2D } from "./Camera2D.js";
import type { FrameRenderer } from "./FrameRenderer.js";
import { RenderQueue } from "./RenderQueue.js";
import { DRAW_BOX, DRAW_CAPSULE, DRAW_CIRCLE } from "./RenderQueue.js";
import type { SpriteFrame, TextureHandle } from "./sprite.js";
import {
  createCanvasRasterizer,
  DEFAULT_TEXT_STYLE,
  GlyphAtlas,
  type TextStyle,
} from "./text/GlyphAtlas.js";

export type LayerSortMode = "y" | "z" | "none";

export type DrawOptions = {
  x: number;
  y: number;
  z?: number;
  scale?: { x: number; y: number };
  rotation?: number;
  origin?: { x: number; y: number };
  tint?: Color;
  flipX?: boolean;
  flipY?: boolean;
};

export type ShapeOptions = { z?: number };

export type TextDrawOptions = TextStyle & {
  z?: number;
  color?: Color;
  scale?: number;
  scaleY?: number;
  align?: "left" | "center" | "right";
};

export type RegisterLayerOptions = {
  camera: Camera2D;
  sort?: LayerSortMode;
};

type Layer = { camera: Camera2D; sort: LayerSortMode; rank: number };

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };

export class Graphics {
  private readonly layers = new Map<string, Layer>();
  private readonly names: string[] = [];
  private readonly cameras: Camera2D[] = [];
  private readonly queue = new RenderQueue();
  private readonly textAtlases = new Map<string, GlyphAtlas>();
  private current: Layer | null = null;
  private clearColor: Color = { r: 0, g: 0, b: 0, a: 1 };

  constructor(readonly renderer: FrameRenderer) {}

  drawText(text: string, x: number, y: number, options: TextDrawOptions = {}): void {
    const atlas = this.getAtlas(options);
    const layout = atlas.layout(text);
    const scale = options.scale ?? 1;
    const align = options.align ?? "left";
    const originX =
      align === "center" ? layout.width * scale * 0.5 : align === "right" ? layout.width * scale : 0;
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
    return this.getAtlas(style).measure(text);
  }

  registerLayer(name: string, options: RegisterLayerOptions): void {
    if (this.layers.has(name)) throw new Error(`Layer "${name}" is already registered.`);
    const layer: Layer = { camera: options.camera, sort: options.sort ?? "z", rank: this.names.length };
    this.layers.set(name, layer);
    this.names.push(name);
    this.cameras.push(options.camera);
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  beginFrame(clearColor: Color): void {
    this.clearColor = clearColor;
    this.queue.reset();
    this.current = null;
  }

  beginLayer(name: string): void {
    this.current = this.layer(name);
  }

  endLayer(): void {
    this.current = null;
  }

  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle {
    return this.renderer.uploadRgba(data, width, height);
  }

  uploadImage(bitmap: ImageBitmap): TextureHandle {
    return this.renderer.uploadImage(bitmap);
  }

  disposeTexture(handle: TextureHandle): void {
    this.renderer.disposeTexture(handle);
  }

  drawSprite(frame: SpriteFrame, opts: DrawOptions): void {
    const layer = this.requireLayer("drawSprite");
    const tint = opts.tint ?? WHITE;
    this.queue.pushSprite(
      opts.x,
      opts.y,
      opts.z ?? (layer.sort === "y" ? opts.y + frame.height : opts.y),
      opts.rotation ?? 0,
      (opts.scale?.x ?? 1) * (opts.flipX ? -1 : 1),
      (opts.scale?.y ?? 1) * (opts.flipY ? -1 : 1),
      opts.origin?.x ?? frame.width * 0.5,
      opts.origin?.y ?? frame.height * 0.5,
      frame.u0,
      frame.v0,
      frame.u1,
      frame.v1,
      frame.width,
      frame.height,
      frame.texture.id,
      tint.r,
      tint.g,
      tint.b,
      tint.a,
      layer.rank,
    );
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
    options: ShapeOptions = {},
  ): void {
    const layer = this.requireLayer("drawRect");
    this.queue.pushShape(
      DRAW_BOX,
      x + width * 0.5,
      y + height * 0.5,
      0,
      0,
      width * 0.5,
      height * 0.5,
      shapeZ(layer.sort, options.z, y, height),
      color.r,
      color.g,
      color.b,
      color.a,
      layer.rank,
    );
  }

  drawCircle(
    cx: number,
    cy: number,
    radius: number,
    color: Color,
    options: ShapeOptions & { segments?: number } = {},
  ): void {
    const layer = this.requireLayer("drawCircle");
    this.queue.pushShape(
      DRAW_CIRCLE,
      cx,
      cy,
      radius,
      radius,
      radius,
      0,
      shapeZ(layer.sort, options.z, cy, radius * 2),
      color.r,
      color.g,
      color.b,
      color.a,
      layer.rank,
    );
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
    const layer = this.requireLayer("drawLine");
    this.queue.pushShape(
      DRAW_CAPSULE,
      x0,
      y0,
      x1,
      y1,
      width * 0.5,
      0,
      shapeZ(layer.sort, options.z, Math.max(y0, y1), width),
      color.r,
      color.g,
      color.b,
      color.a,
      layer.rank,
    );
  }

  endFrame(): void {
    const { width, height } = this.renderer.viewport;
    this.queue.finalize();
    this.renderer.render(width, height, this.clearColor, this.cameras, this.queue);
  }

  get viewport(): { width: number; height: number } {
    return this.renderer.viewport;
  }

  get stats() {
    return this.renderer.stats;
  }

  get layerOrder(): readonly string[] {
    return this.names;
  }

  getLayerSortMode(name: string): LayerSortMode {
    return this.layer(name).sort;
  }

  private layer(name: string): Layer {
    const layer = this.layers.get(name);
    if (!layer) throw new Error(`Layer "${name}" is not registered. Call registerLayer() first.`);
    return layer;
  }

  private requireLayer(caller: string): Layer {
    if (!this.current) throw new Error(`${caller}() called outside of beginLayer()/endLayer().`);
    return this.current;
  }

  private getAtlas(style: TextStyle): GlyphAtlas {
    const key = `${style.font ?? DEFAULT_TEXT_STYLE.font}|${style.sizePx ?? DEFAULT_TEXT_STYLE.sizePx}`;
    let atlas = this.textAtlases.get(key);
    if (!atlas) {
      atlas = new GlyphAtlas(
        (pixels, w, h) => this.uploadRgba(pixels, w, h),
        (handle) => this.disposeTexture(handle),
        createCanvasRasterizer(),
        style,
      );
      this.textAtlases.set(key, atlas);
    }
    return atlas;
  }
}

function shapeZ(sort: LayerSortMode, z: number | undefined, y: number, extent: number): number {
  if (z !== undefined) return z;
  return sort === "y" ? y + extent : y;
}

export { Camera2D, createUiCamera, createWorldCamera } from "./Camera2D.js";
export { Color } from "../math/index.js";
export { GlyphAtlas, DEFAULT_TEXT_STYLE, createCanvasRasterizer } from "./text/GlyphAtlas.js";
export type { TextStyle, RasterizedGlyph, GlyphRasterizer, TextLayoutLine } from "./text/GlyphAtlas.js";
