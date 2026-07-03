import { describe, expect, it } from "vitest";
import { Color, Mat3 } from "./index.js";

describe("Color", () => {
  it("creates rgb colors with optional alpha", () => {
    const color = Color.rgb(0.5, 0.25, 0.75, 0.8);
    expect(color).toEqual({ r: 0.5, g: 0.25, b: 0.75, a: 0.8 });
  });

  it("parses 6-digit hex colors", () => {
    const color = Color.hex("#ff8040");
    expect(color.r).toBeCloseTo(1);
    expect(color.g).toBeCloseTo(0.50196, 4);
    expect(color.b).toBeCloseTo(0.25098, 4);
    expect(color.a).toBe(1);
  });

  it("parses 3-digit shorthand hex colors", () => {
    const color = Color.hex("#f80");
    expect(color.r).toBeCloseTo(1);
    expect(color.g).toBeCloseTo(0.53333, 4);
    expect(color.b).toBeCloseTo(0);
  });

  it("throws on invalid hex input", () => {
    expect(() => Color.hex("not-a-color")).toThrow(/Invalid hex color/);
    expect(() => Color.hex("#gggggg")).toThrow(/Invalid hex color/);
  });

  it("converts to vec4", () => {
    expect(Color.toVec4(Color.rgb(1, 0.5, 0.25, 0.5))).toEqual([1, 0.5, 0.25, 0.5]);
  });
});

describe("Mat3", () => {
  it("builds an orthographic projection matrix", () => {
    const m = Mat3.ortho(0, 800, 600, 0);
    expect(m[0]).toBeCloseTo(2 / 800);
    expect(m[4]).toBeCloseTo(2 / -600);
    expect(m[6]).toBeCloseTo(-1);
    expect(m[7]).toBeCloseTo(1);
  });

  it("transforms a point through translate * identity", () => {
    const m = Mat3.create();
    Mat3.translate(m, m, 100, 50);
    const out = { x: 0, y: 0 };
    Mat3.transformPoint(out, m, 10, 20);
    expect(out.x).toBeCloseTo(110);
    expect(out.y).toBeCloseTo(70);
  });

  it("inverts an affine matrix", () => {
    const m = Mat3.create();
    Mat3.translate(m, m, 40, 80);
    const inv = Mat3.create();
    expect(Mat3.invert(inv, m)).toBe(true);

    const out = { x: 0, y: 0 };
    Mat3.transformPoint(out, inv, 40, 80);
    expect(out.x).toBeCloseTo(0, 4);
    expect(out.y).toBeCloseTo(0, 4);
  });

  it("returns false when the matrix is singular", () => {
    const singular = Mat3.create();
    singular[0] = 0;
    singular[4] = 0;
    expect(Mat3.invert(Mat3.create(), singular)).toBe(false);
  });
});
