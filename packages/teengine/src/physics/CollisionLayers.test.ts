import { describe, expect, it } from "vitest";
import { COLLIDE_ALL, layers, toInteractionGroups } from "./CollisionLayers.js";

describe("toInteractionGroups", () => {
  it("packs category into the high 16 bits and mask into the low 16 bits", () => {
    const category = 1 << 1;
    const mask = 1 << 4;
    const packed = toInteractionGroups(layers(category, mask));
    expect(packed >>> 16).toBe(category);
    expect(packed & 0xffff).toBe(mask);
  });

  it("COLLIDE_ALL collides with every category and mask bit", () => {
    const packed = toInteractionGroups(COLLIDE_ALL);
    expect(packed >>> 16).toBe(0xffff);
    expect(packed & 0xffff).toBe(0xffff);
  });
});

describe("layers", () => {
  it("returns a category/mask pair", () => {
    expect(layers(2, 6)).toEqual({ category: 2, mask: 6 });
  });
});
