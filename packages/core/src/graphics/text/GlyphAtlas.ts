import { spriteFrame, type SpriteFrame, type TextureHandle } from "../sprite.js";

export type TextStyle = {
  font?: string;
  sizePx?: number;
};

export const DEFAULT_TEXT_STYLE = {
  font: "system-ui, sans-serif",
  sizePx: 16,
} as const;

const GLYPH_PAD = 2;
const INITIAL_ATLAS_SIDE = 256;

export type RasterizedGlyph = {
  pixels: Uint8Array | null;
  cellWidth: number;
  cellHeight: number;
  advance: number;
};

export type GlyphRasterizer = (
  char: string,
  required: { font: string; sizePx: number },
) => RasterizedGlyph;

type CachedGlyph = {
  frame: SpriteFrame | null;
  offsetX: number;
  offsetY: number;
  advance: number;
};

export class GlyphAtlas {
  private pixels: Uint8Array;
  private side: number;
  private cursorX = 0;
  private cursorY = 0;
  private rowHeight = 0;
  private texture: TextureHandle | null = null;
  private readonly cache = new Map<string, CachedGlyph>();
  readonly style: Required<TextStyle>;

  constructor(
    private readonly upload: (pixels: Uint8Array, w: number, h: number) => TextureHandle,
    private readonly rasterize: GlyphRasterizer | null,
    style: TextStyle = {},
  ) {
    this.style = {
      font: style.font ?? DEFAULT_TEXT_STYLE.font,
      sizePx: style.sizePx ?? DEFAULT_TEXT_STYLE.sizePx,
    };
    this.side = INITIAL_ATLAS_SIDE;
    this.pixels = new Uint8Array(this.side * this.side * 4);
  }

  get glyphCount(): number {
    return this.cache.size;
  }

  get atlasSize(): number {
    return this.side;
  }

  private key(ch: string): string {
    return `${this.style.font}|${this.style.sizePx}|${ch}`;
  }

  private glyph(ch: string): CachedGlyph {
    const k = this.key(ch);
    let g = this.cache.get(k);
    if (!g && this.rasterize) {
      const raster = this.rasterize(ch, { ...this.style });
      g =
        raster.pixels === null || raster.cellWidth <= 0 || raster.cellHeight <= 0
          ? { frame: null, offsetX: 0, offsetY: 0, advance: raster.advance }
          : this.packGlyph(raster);
      this.cache.set(k, g);
    }
    return g ?? { frame: null, offsetX: 0, offsetY: 0, advance: this.style.sizePx * 0.28 };
  }

  private packGlyph(raster: RasterizedGlyph): CachedGlyph {
    if (raster.cellWidth > this.side || raster.cellHeight > this.side) {
      this.growTo(Math.max(raster.cellWidth, raster.cellHeight));
    }
    if (this.cursorX + raster.cellWidth > this.side) {
      this.cursorX = 0;
      this.cursorY += this.rowHeight;
      this.rowHeight = 0;
    }
    if (this.cursorY + raster.cellHeight > this.side) {
      this.growTo(this.side * 2);
    }

    const stride = this.side * 4;
    for (let y = 0; y < raster.cellHeight; y++) {
      const src = y * raster.cellWidth * 4;
      const dst = (this.cursorY + y) * stride + this.cursorX * 4;
      this.pixels.set(raster.pixels!.subarray(src, src + raster.cellWidth * 4), dst);
    }
    this.flush();

    const rect = { x: this.cursorX, y: this.cursorY, w: raster.cellWidth, h: raster.cellHeight };
    this.cursorX += raster.cellWidth;
    this.rowHeight = Math.max(this.rowHeight, raster.cellHeight);
    return {
      frame: spriteFrame(this.texture!, this.side, this.side, rect.x, rect.y, rect.w, rect.h),
      offsetX: -GLYPH_PAD,
      offsetY: -GLYPH_PAD,
      advance: raster.advance,
    };
  }

  private flush(): void {
    this.texture = this.upload(this.pixels, this.side, this.side);
    for (const g of this.cache.values()) {
      if (g.frame) (g.frame as { texture: TextureHandle }).texture = this.texture;
    }
  }

  private growTo(side: number): void {
    const oldPixels = this.pixels;
    const oldSide = this.side;
    this.pixels = new Uint8Array(side * side * 4);
    for (let y = 0; y < oldSide; y++) {
      const src = y * oldSide * 4;
      this.pixels.set(oldPixels.subarray(src, src + oldSide * 4), y * side * 4);
    }
    this.side = side;
    for (const g of this.cache.values()) {
      if (!g.frame) continue;
      g.frame.u0 *= oldSide / side;
      g.frame.v0 *= oldSide / side;
      g.frame.u1 *= oldSide / side;
      g.frame.v1 *= oldSide / side;
    }
    this.flush();
  }

  layout(text: string): TextLayoutLine {
    const frames: Array<{ frame: SpriteFrame; x: number; y: number }> = [];
    let cursor = 0;
    for (const ch of text) {
      const g = this.glyph(ch);
      if (g.frame) frames.push({ frame: g.frame, x: cursor + g.offsetX, y: g.offsetY });
      cursor += g.advance;
    }
    return { frames, width: cursor, lineHeight: Math.ceil(this.style.sizePx * 1.35) };
  }

  measure(text: string): number {
    let cursor = 0;
    for (const ch of text) cursor += this.glyph(ch).advance;
    return cursor;
  }
}

export type TextLayoutLine = {
  frames: Array<{ frame: SpriteFrame; x: number; y: number }>;
  width: number;
  lineHeight: number;
};

export function createCanvasRasterizer(): GlyphRasterizer | null {
  if (typeof document === "undefined") return null;
  let canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  let ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.textBaseline = "top";
  return (char, { font, sizePx }) => {
    const fontSpec = `${sizePx}px ${font}`;
    ctx!.font = fontSpec;
    const metrics = ctx!.measureText(char);
    const inkW = Math.max(1, Math.ceil(metrics.width));
    const inkH = Math.max(1, Math.ceil(sizePx * 1.3));
    const cellWidth = inkW + GLYPH_PAD * 2;
    const cellHeight = inkH + GLYPH_PAD * 2;
    if (cellWidth > canvas.width || cellHeight > canvas.height) {
      canvas = document.createElement("canvas");
      canvas.width = Math.max(cellWidth, canvas.width);
      canvas.height = Math.max(cellHeight, canvas.height);
      ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.textBaseline = "top";
    }
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    ctx!.font = fontSpec;
    ctx!.fillStyle = "#ffffff";
    ctx!.fillText(char, GLYPH_PAD, GLYPH_PAD);
    const data = ctx!.getImageData(0, 0, cellWidth, cellHeight).data;
    let anyInk = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        anyInk = true;
        break;
      }
    }
    return {
      pixels: anyInk ? new Uint8Array(data) : null,
      cellWidth,
      cellHeight,
      advance: metrics.width,
    };
  };
}
