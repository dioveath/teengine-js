import { describe, expect, it } from "vitest";
import { SpatialGrid } from "./SpatialGrid.js";

describe("SpatialGrid", () => {
  it("queries entries within a circle", () => {
    const grid = new SpatialGrid(32);
    grid.insert(1, 10, 10);
    grid.insert(2, 100, 100);
    grid.insert(3, 40, 10);
    const hits = grid.queryCircle(12, 12, 25);
    expect(hits.map((h) => h.id).sort()).toEqual([1]);
  });

  it("includes entry radius in circle queries", () => {
    const grid = new SpatialGrid(64);
    grid.insert(1, 50, 50, 20);
    expect(grid.queryCircle(79, 50, 9).map((h) => h.id)).toEqual([1]);
    expect(grid.queryCircle(81, 50, 9)).toHaveLength(0);
  });

  it("deduplicates entries spanning multiple cells", () => {
    const grid = new SpatialGrid(16);
    grid.insert(7, 31, 31, 20); // spans several cells
    const hits = grid.queryRect(0, 0, 128, 128);
    expect(hits).toHaveLength(1);
  });

  it("remove() drops the entry from all cells", () => {
    const grid = new SpatialGrid(16);
    grid.insert(1, 8, 8, 4);
    grid.remove(1);
    expect(grid.size).toBe(0);
    expect(grid.queryCircle(8, 8, 100)).toHaveLength(0);
  });

  it("update() moves an entry between cells", () => {
    const grid = new SpatialGrid(16);
    grid.insert(1, 8, 8);
    grid.update(1, 200, 200);
    expect(grid.queryCircle(8, 8, 4)).toHaveLength(0);
    expect(grid.queryCircle(200, 200, 4)).toHaveLength(1);
  });

  it("clear() empties everything", () => {
    const grid = new SpatialGrid(16);
    grid.insert(1, 8, 8);
    grid.insert(2, 90, 90);
    grid.clear();
    expect(grid.size).toBe(0);
  });

  it("queryRect matches rect bounds with radius expansion", () => {
    const grid = new SpatialGrid(32);
    grid.insert(1, 50, 50, 0);
    grid.insert(2, 500, 500, 0);
    const hits = grid.queryRect(60, 60, 100, 100);
    expect(hits.map((h) => h.id)).toEqual([1]);
  });
});
