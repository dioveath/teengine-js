import type { Entity } from "./Entity.js";

/** Component fields that can be used in entity queries. */
export type EntityComponentKey =
  | "sprite"
  | "shape"
  | "collider"
  | "collision"
  | "rigidBody"
  | "spin";

export type EntityQuery = {
  /** Entity must have every listed tag. */
  withTags?: Iterable<string>;
  /** Entity must have none of these tags. */
  withoutTags?: Iterable<string>;
  /** Entity must have all of these components. */
  with?: readonly EntityComponentKey[];
  /** Entity must not have any of these components. */
  without?: readonly EntityComponentKey[];
  /** When set, match only entities with this active flag. */
  active?: boolean;
};

export function matchesEntityQuery(entity: Entity, query: EntityQuery): boolean {
  if (query.active !== undefined && entity.active !== query.active) {
    return false;
  }

  if (query.withTags) {
    for (const tag of query.withTags) {
      if (!entity.tags.has(tag)) return false;
    }
  }

  if (query.withoutTags) {
    for (const tag of query.withoutTags) {
      if (entity.tags.has(tag)) return false;
    }
  }

  if (query.with) {
    for (const key of query.with) {
      if (entity[key] === undefined) return false;
    }
  }

  if (query.without) {
    for (const key of query.without) {
      if (entity[key] !== undefined) return false;
    }
  }

  return true;
}
