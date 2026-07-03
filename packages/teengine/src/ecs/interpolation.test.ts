import { describe, expect, it } from "vitest";
import { Transform } from "./Transform.js";
import { lerpTransform, snapshotTransform } from "./interpolation.js";

describe("snapshotTransform", () => {
  it("copies transform fields into a plain snapshot", () => {
    const transform = Transform.create({ x: 5, y: 10, rotation: 0.5, scaleX: 2, scaleY: 3 });
    expect(snapshotTransform(transform)).toEqual({
      x: 5,
      y: 10,
      rotation: 0.5,
      scaleX: 2,
      scaleY: 3,
    });
  });
});

describe("lerpTransform", () => {
  const prev = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  const current = { x: 100, y: 40, rotation: 1, scaleX: 2, scaleY: 2 };

  it("returns the previous snapshot at alpha 0", () => {
    const out = lerpTransform(prev, current, 0);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.rotation).toBe(0);
  });

  it("returns the current snapshot at alpha 1", () => {
    const out = lerpTransform(prev, current, 1);
    expect(out.x).toBe(100);
    expect(out.y).toBe(40);
    expect(out.rotation).toBe(1);
  });

  it("interpolates at alpha 0.5", () => {
    const out = lerpTransform(prev, current, 0.5);
    expect(out.x).toBeCloseTo(50);
    expect(out.y).toBeCloseTo(20);
    expect(out.rotation).toBeCloseTo(0.5);
    expect(out.scaleX).toBeCloseTo(1.5);
    expect(out.scaleY).toBeCloseTo(1.5);
  });
});
