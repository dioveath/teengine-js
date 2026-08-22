import type { EntityId } from "./Entity.js";

export type SpatialEntry = {
  id: EntityId;
  x: number;
  y: number;
  radius: number;
};

export class SpatialGrid {
  private readonly cells = new Map<number, SpatialEntry[]>();
  private readonly entries = new Map<EntityId, { cellKeys: number[]; entry: SpatialEntry }>();

  constructor(public cellSize = 64) {}

  private cellKey(cx: number, cy: number): number {
    return cx * 0x40000000 + cy;
  }

  insert(id: EntityId, x: number, y: number, radius = 0): void {
    if (this.entries.has(id)) this.remove(id);
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const cellKeys: number[] = [];
    const entry: SpatialEntry = { id, x, y, radius };
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.cellKey(cx, cy);
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = [];
          this.cells.set(key, bucket);
        }
        bucket.push(entry);
        cellKeys.push(key);
      }
    }
    this.entries.set(id, { cellKeys, entry });
  }

  remove(id: EntityId): void {
    const record = this.entries.get(id);
    if (!record) return;
    for (const key of record.cellKeys) {
      const bucket = this.cells.get(key);
      if (!bucket) continue;
      const idx = bucket.indexOf(record.entry);
      if (idx >= 0) bucket.splice(idx, 1);
      if (bucket.length === 0) this.cells.delete(key);
    }
    this.entries.delete(id);
  }

  update(id: EntityId, x: number, y: number, radius?: number): void {
    const record = this.entries.get(id);
    if (!record) {
      this.insert(id, x, y, radius ?? 0);
      return;
    }
    this.insert(id, x, y, radius ?? record.entry.radius);
  }

  has(id: EntityId): boolean {
    return this.entries.has(id);
  }

  get size(): number {
    return this.entries.size;
  }

  queryCircle(x: number, y: number, radius: number, out: SpatialEntry[] = []): SpatialEntry[] {
    out.length = 0;
    const seen = new Set<EntityId>();
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.cells.get(this.cellKey(cx, cy));
        if (!bucket) continue;
        for (const entry of bucket) {
          if (seen.has(entry.id)) continue;
          const dx = entry.x - x;
          const dy = entry.y - y;
          const reach = radius + entry.radius;
          if (dx * dx + dy * dy <= reach * reach) {
            seen.add(entry.id);
            out.push(entry);
          }
        }
      }
    }
    return out;
  }

  queryRect(
    x: number,
    y: number,
    width: number,
    height: number,
    out: SpatialEntry[] = [],
  ): SpatialEntry[] {
    out.length = 0;
    const seen = new Set<EntityId>();
    const minX = x - width * 0.5;
    const maxX = x + width * 0.5;
    const minY = y - height * 0.5;
    const maxY = y + height * 0.5;
    const minCx = Math.floor(minX / this.cellSize);
    const maxCx = Math.floor(maxX / this.cellSize);
    const minCy = Math.floor(minY / this.cellSize);
    const maxCy = Math.floor(maxY / this.cellSize);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.cells.get(this.cellKey(cx, cy));
        if (!bucket) continue;
        for (const entry of bucket) {
          if (seen.has(entry.id)) continue;
          if (
            entry.x + entry.radius >= minX &&
            entry.x - entry.radius <= maxX &&
            entry.y + entry.radius >= minY &&
            entry.y - entry.radius <= maxY
          ) {
            seen.add(entry.id);
            out.push(entry);
          }
        }
      }
    }
    return out;
  }

  clear(): void {
    this.cells.clear();
    this.entries.clear();
  }
}
