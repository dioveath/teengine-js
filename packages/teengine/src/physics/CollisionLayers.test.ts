import { describe, expect, it } from "vitest";
import { CollisionGroups, COLLIDE_ALL, layers, toInteractionGroups } from "./CollisionLayers.js";

describe("CollisionGroups", () => {
  it("assigns every preset a distinct bit", () => {
    const values = Object.values(CollisionGroups);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("packs each preset into a single bit", () => {
    for (const value of Object.values(CollisionGroups)) {
      expect(value & (value - 1)).toBe(0);
    }
  });
});

describe("toInteractionGroups", () => {
  it("packs category into the high 16 bits and mask into the low 16 bits", () => {
    const packed = toInteractionGroups(layers(CollisionGroups.PLAYER, CollisionGroups.ENEMY));
    expect(packed >>> 16).toBe(CollisionGroups.PLAYER);
    expect(packed & 0xffff).toBe(CollisionGroups.ENEMY);
  });

  it("COLLIDE_ALL collides with every category and mask bit", () => {
    const packed = toInteractionGroups(COLLIDE_ALL);
    expect(packed >>> 16).toBe(0xffff);
    expect(packed & 0xffff).toBe(0xffff);
  });
});
