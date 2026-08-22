import type { EntityId } from "./Entity.js";

export class ComponentStore {
  private readonly stores = new Map<string, Map<EntityId, unknown>>();

  private store<T>(type: string): Map<EntityId, T> {
    let s = this.stores.get(type);
    if (!s) {
      s = new Map();
      this.stores.set(type, s);
    }
    return s as Map<EntityId, T>;
  }

  add<T>(entity: EntityId, type: string, data: T): T {
    this.store<T>(type).set(entity, data);
    return data;
  }

  get<T>(entity: EntityId, type: string): T | undefined {
    return this.store<T>(type).get(entity);
  }

  ensure<T>(entity: EntityId, type: string, makeDefault: () => T): T {
    const s = this.store<T>(type);
    let v = s.get(entity);
    if (v === undefined) {
      v = makeDefault();
      s.set(entity, v);
    }
    return v;
  }

  has(entity: EntityId, type: string): boolean {
    return this.store<unknown>(type).has(entity);
  }

  remove(entity: EntityId, type: string): boolean {
    return this.store<unknown>(type).delete(entity);
  }

  removeAll(entity: EntityId): void {
    for (const s of this.stores.values()) s.delete(entity);
  }

  forEach<T>(type: string, fn: (data: T, entity: EntityId) => void): void {
    for (const [id, data] of this.store<T>(type)) fn(data as T, id);
  }

  all<T>(type: string): ReadonlyMap<EntityId, T> {
    return this.store<T>(type);
  }

  clear(): void {
    this.stores.clear();
  }
}
