import { describe, expect, it } from "vitest";
import { ComponentStore } from "./ComponentStore.js";
import { Easing, Pool, TweenRunner } from "../utils/index.js";
import { Rng } from "../math/random.js";

describe("ComponentStore", () => {
  it("add/get/has/remove per type", () => {
    const store = new ComponentStore();
    store.add(1, "hp", { current: 5 });
    expect(store.get<{ current: number }>(1, "hp")?.current).toBe(5);
    expect(store.has(1, "hp")).toBe(true);
    expect(store.has(2, "hp")).toBe(false);
    expect(store.remove(1, "hp")).toBe(true);
    expect(store.has(1, "hp")).toBe(false);
  });

  it("ensure() creates on first access only", () => {
    const store = new ComponentStore();
    let made = 0;
    const a = store.ensure(9, "bag", () => ({ items: [] as string[], n: ++made }));
    a.items.push("apple");
    const b = store.ensure(9, "bag", () => ({ items: [] as string[], n: ++made }));
    expect(b.items).toEqual(["apple"]);
    expect(made).toBe(1);
  });

  it("forEach iterates only that type; removeAll clears across types", () => {
    const store = new ComponentStore();
    store.add(1, "pos", { x: 1 });
    store.add(2, "pos", { x: 2 });
    store.add(1, "tag", true);
    const seen: number[] = [];
    store.forEach<{ x: number }>("pos", (d, id) => seen.push(id + d.x * 100));
    expect(seen.sort()).toEqual([101, 202]);
    store.removeAll(1);
    expect(store.has(1, "pos")).toBe(false);
    expect(store.has(1, "tag")).toBe(false);
    expect(store.has(2, "pos")).toBe(true);
  });
});

describe("Pool", () => {
  it("reuses released objects and resets them", () => {
    let created = 0;
    const pool = new Pool(
      () => ({ used: true, n: ++created }),
      (item) => {
        item.used = false;
      },
    );
    const a = pool.acquire();
    expect(a.used).toBe(true);
    expect(created).toBe(1);
    pool.release(a);
    expect(a.used).toBe(false);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(created).toBe(1);
    pool.release(b);
    expect(pool.pooled).toBe(1);
    expect(pool.live).toBe(0);
  });
});

describe("Rng", () => {
  it("is deterministic for a given seed", () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it("different seeds diverge", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("range/int respect bounds", () => {
    const rng = new Rng(42);
    for (let i = 0; i < 500; i++) {
      const f = rng.range(-2, 3);
      expect(f).toBeGreaterThanOrEqual(-2);
      expect(f).toBeLessThan(3);
      const n = rng.int(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("int with max<min returns min", () => {
    expect(new Rng(7).int(5, 3)).toBe(5);
  });

  it("shuffle keeps all elements", () => {
    const rng = new Rng(99);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    rng.shuffle(arr);
    expect([...arr].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("weighted respects extremes", () => {
    const rng = new Rng(5);
    const entries: ReadonlyArray<readonly [string, number]> = [
      ["common", 1000],
      ["rare", 1],
    ];
    const picks = Array.from({ length: 200 }, () => rng.weighted(entries));
    expect(picks.every((p) => p === "common" || p === "rare")).toBe(true);
    expect(picks.filter((p) => p === "rare").length).toBeLessThan(20);
  });
});

describe("TweenRunner / Easing", () => {
  it("eases endpoints exactly", () => {
    expect(Easing.linear(0)).toBe(0);
    expect(Easing.linear(1)).toBe(1);
    expect(Easing.cubicOut(0)).toBeCloseTo(0);
    expect(Easing.cubicOut(1)).toBeCloseTo(1);
    expect(Easing.elasticOut(1)).toBeCloseTo(1);
    expect(Easing.elasticOut(0)).toBe(0);
  });

  it("runs to completion and removes finished tweens", () => {
    const runner = new TweenRunner();
    const seen: number[] = [];
    runner.add({
      from: 0,
      to: 10,
      duration: 0.5,
      ease: Easing.linear,
      onUpdate: (v) => seen.push(v),
      onComplete: () => seen.push(-1),
    });
    runner.update(0.25);
    expect(runner.count).toBe(1);
    runner.update(0.25);
    expect(seen[seen.length - 1]).toBe(-1);
    expect(runner.count).toBe(0);
  });

  it("loops forever until cleared", () => {
    const runner = new TweenRunner();
    runner.add({ from: 0, to: 1, duration: 0.1, loop: true });
    for (let i = 0; i < 30; i++) runner.update(0.05);
    expect(runner.count).toBe(1);
    runner.clear();
    expect(runner.count).toBe(0);
  });
});
