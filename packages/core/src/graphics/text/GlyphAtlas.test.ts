import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_STYLE,
  GlyphAtlas,
  createCanvasRasterizer,
} from "./GlyphAtlas.js";

describe("GlyphAtlas", () => {
  it("layouts glyphs with advances and skips blank glyphs", () => {
    let handleId = 0;
    let uploadCalls = 0;
    const atlas = new GlyphAtlas(
      () => {
        uploadCalls++;
        return { id: ++handleId };
      },
      () => {},
      (char) => ({
        pixels: char === " " ? null : new Uint8Array(10 * 14 * 4).fill(255),
        cellWidth: 10,
        cellHeight: 14,
        advance: char === "i" ? 3 : char === " " ? 4 : 8,
      }),
    );
    const uploadsAfterPreload = uploadCalls;
    const handlesAfterPreload = handleId;
    const glyphsAfterPreload = atlas.glyphCount;
    expect(uploadsAfterPreload).toBeGreaterThan(0);
    const layout = atlas.layout("hi i");
    expect(uploadCalls).toBe(uploadsAfterPreload);
    expect(handleId).toBe(handlesAfterPreload);
    expect(atlas.glyphCount).toBe(glyphsAfterPreload);
    expect(layout.frames.length).toBe(3);
    expect(layout.width).toBe(8 + 3 + 4 + 3);
    expect(atlas.measure("hi i")).toBe(layout.width);
    expect(atlas.glyphCount).toBe(glyphsAfterPreload);

    const again = atlas.layout("hi i");
    expect(again.frames.map((f) => f.x)).toEqual(layout.frames.map((f) => f.x));
    expect(uploadCalls).toBe(uploadsAfterPreload);
  });

  it("grows the atlas when it fills up and keeps frames valid", () => {
    let handleId = 0;
    const uploadedSides: number[] = [];
    const atlas = new GlyphAtlas(
      (_pixels, w) => {
        uploadedSides.push(w);
        return { id: ++handleId };
      },
      () => {},
      () => ({
        pixels: new Uint8Array(20 * 32 * 4).fill(200),
        cellWidth: 20,
        cellHeight: 32,
        advance: 10,
      }),
    );
    uploadedSides.length = 0;
    const chars = Array.from({ length: 500 }, (_, i) =>
      String.fromCharCode(0x4e00 + i),
    );
    for (const ch of chars) atlas.measure(ch);
    expect(atlas.atlasSize).toBeGreaterThan(512);
    expect(uploadedSides[uploadedSides.length - 1]).toBe(atlas.atlasSize);
    expect([...uploadedSides].sort((a, b) => a - b)).toEqual([...uploadedSides]);
    for (const ch of chars.slice(0, 10)) {
      const layout = atlas.layout(ch);
      expect(layout.frames.length).toBe(1);
      expect(layout.frames[0]!.frame.u1).toBeLessThanOrEqual(1);
      expect(layout.frames[0]!.frame.v1).toBeLessThanOrEqual(1);
    }
  });

  it("falls back to blank advance without a rasterizer", () => {
    const atlas = new GlyphAtlas(() => ({ id: 1 }), () => {}, null);
    expect(atlas.measure("abc")).toBeCloseTo(DEFAULT_TEXT_STYLE.sizePx * 0.28 * 3);
    expect(atlas.glyphCount).toBe(0);
  });

  it("createCanvasRasterizer degrades gracefully without canvas support", () => {
    const rasterizer = createCanvasRasterizer();
    if (!rasterizer) return;
    const glyph = rasterizer("A", { font: DEFAULT_TEXT_STYLE.font, sizePx: 16 });
    expect(glyph.cellWidth).toBeGreaterThan(0);
    expect(glyph.cellHeight).toBeGreaterThan(0);
    expect(glyph.advance).toBeGreaterThan(0);
  });
});
