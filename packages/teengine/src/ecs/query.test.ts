import { describe, expect, it } from "vitest";
import { createEntity } from "./Entity.js";
import { matchesEntityQuery } from "./query.js";

describe("matchesEntityQuery", () => {
  const player = createEntity(1, {
    tags: ["player"],
    rigidBody: { type: "dynamic" },
    collider: { shape: { kind: "box", width: 10, height: 10 } },
  });

  const coin = createEntity(2, {
    tags: ["coin"],
    collider: { shape: { kind: "ball", radius: 8 } },
    collision: { response: "sensor" },
  });

  it("matches by required tags", () => {
    expect(matchesEntityQuery(player, { withTags: ["player"] })).toBe(true);
    expect(matchesEntityQuery(coin, { withTags: ["player"] })).toBe(false);
  });

  it("excludes entities with forbidden tags", () => {
    expect(matchesEntityQuery(player, { withoutTags: ["coin"] })).toBe(true);
    expect(matchesEntityQuery(coin, { withoutTags: ["coin"] })).toBe(false);
  });

  it("matches by component presence", () => {
    expect(matchesEntityQuery(player, { with: ["rigidBody", "collider"] })).toBe(true);
    expect(matchesEntityQuery(coin, { with: ["rigidBody"] })).toBe(false);
  });

  it("excludes entities with forbidden components", () => {
    expect(matchesEntityQuery(coin, { without: ["rigidBody"] })).toBe(true);
    expect(matchesEntityQuery(player, { without: ["rigidBody"] })).toBe(false);
  });

  it("filters by active flag when specified", () => {
    player.active = false;
    expect(matchesEntityQuery(player, { active: true })).toBe(false);
    expect(matchesEntityQuery(player, { active: false })).toBe(true);
    player.active = true;
  });
});
