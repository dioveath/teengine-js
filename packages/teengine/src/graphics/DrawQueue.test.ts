import { describe, expect, it } from "vitest";
import type { AtlasRegion } from "../assets/Atlas.js";
import { Color } from "../math/index.js";
import {
  DrawQueue,
  resolveDrawOptions,
  resolveShapeZ,
} from "./DrawQueue.js";

const region: AtlasRegion = {
  texture: {} as never,
  u0: 0,
  v0: 0,
  u1: 0.5,
  v1: 0.5,
  width: 32,
  height: 16,
};

describe("resolveDrawOptions", () => {
  it("defaults origin to region center and z from y when sorting by y", () => {
    const resolved = resolveDrawOptions(region, { x: 100, y: 200 }, "y");
    expect(resolved.originX).toBe(16);
    expect(resolved.originY).toBe(8);
    expect(resolved.z).toBe(200 + 16);
  });

  it("respects explicit z, origin, tint, and flip flags", () => {
    const tint = Color.rgb(0.2, 0.4, 0.6, 0.8);
    const resolved = resolveDrawOptions(
      region,
      {
        x: 10,
        y: 20,
        z: 99,
        origin: { x: 0, y: 0 },
        tint,
        flipX: true,
        flipY: true,
        scale: { x: 2, y: 3 },
        rotation: 0.5,
      },
      "none",
    );

    expect(resolved.z).toBe(99);
    expect(resolved.originX).toBe(0);
    expect(resolved.tint).toEqual(tint);
    expect(resolved.flipX).toBe(true);
    expect(resolved.flipY).toBe(true);
    expect(resolved.scaleX).toBe(2);
    expect(resolved.scaleY).toBe(3);
    expect(resolved.rotation).toBe(0.5);
  });
});

describe("resolveShapeZ", () => {
  it("uses y + height for y-sort mode when z is omitted", () => {
    expect(resolveShapeZ(50, 20, "y")).toBe(70);
  });

  it("returns explicit z unchanged", () => {
    expect(resolveShapeZ(50, 20, "y", 5)).toBe(5);
  });
});

describe("DrawQueue", () => {
  it("groups commands by registered layer names and ignores unknown layers", () => {
    const queue = new DrawQueue();
    queue.push({
      kind: "shapeRect",
      layer: "world",
      z: 1,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      color: Color.rgb(1, 1, 1),
    });
    queue.push({
      kind: "shapeRect",
      layer: "ui",
      z: 2,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      color: Color.rgb(1, 0, 0),
    });
    queue.push({
      kind: "shapeRect",
      layer: "missing",
      z: 3,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      color: Color.rgb(0, 1, 0),
    });

    const grouped = queue.byLayer(["world", "ui"]);
    expect(grouped.get("world")).toHaveLength(1);
    expect(grouped.get("ui")).toHaveLength(1);
    expect(grouped.get("missing")).toBeUndefined();
  });

  it("clears queued commands", () => {
    const queue = new DrawQueue();
    queue.push({
      kind: "shapeLine",
      layer: "world",
      z: 0,
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 10,
      width: 2,
      color: Color.rgb(1, 1, 1),
    });
    queue.clear();
    expect(queue.byLayer(["world"]).get("world")).toHaveLength(0);
  });
});
