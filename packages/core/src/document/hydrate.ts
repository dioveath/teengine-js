import type { Color } from "../math/index.js";
import type { Entity, SpawnConfig } from "../ecs/Entity.js";
import type { World } from "../ecs/World.js";
import type { EntityRecord, GameDocument } from "./schema.js";

function color(c: { r: number; g: number; b: number; a?: number }): Color {
  return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 };
}

export function recordToSpawn(record: EntityRecord): SpawnConfig {
  return {
    key: record.id,
    name: record.name,
    transform: record.transform,
    sprite: record.sprite
      ? {
          ...record.sprite,
          tint: record.sprite.tint ? color(record.sprite.tint) : undefined,
        }
      : undefined,
    shape: record.shape
      ? record.shape.kind === "rect"
        ? { ...record.shape, color: color(record.shape.color) }
        : record.shape.kind === "circle"
          ? { ...record.shape, color: color(record.shape.color) }
          : { ...record.shape, color: color(record.shape.color) }
      : undefined,
    collider: record.collider,
    collision: record.collision,
    rigidBody: record.rigidBody,
    cameraTarget: record.cameraTarget ? { _tag: "cameraTarget" } : undefined,
    collisionListener: record.collisionListener ? { _tag: "collisionListener" } : undefined,
    spin: record.spin,
  };
}

export function hydrateScene(world: World, doc: GameDocument, sceneId = doc.startScene): Map<string, number> {
  const scene = doc.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Scene "${sceneId}" not found.`);

  const ids = new Map<string, number>();
  for (const record of scene.entities) {
    const id = world.spawn(recordToSpawn(record));
    const entity = world.get(id);
    if (entity && record.active === false) entity.active = false;
    ids.set(record.id, id);
  }
  return ids;
}

export function entityToRecord(entity: Entity): EntityRecord {
  return {
    id: entity.key ?? `e-${entity.id}`,
    name: entity.name,
    active: entity.active,
    transform: { ...entity.transform },
    sprite: entity.sprite,
    shape: entity.shape,
    collider: entity.collider,
    collision: entity.collision,
    rigidBody: entity.rigidBody,
    cameraTarget: entity.cameraTarget ? true : undefined,
    collisionListener: entity.collisionListener ? true : undefined,
    spin: entity.spin,
  };
}

export function sceneFromWorld(world: World, sceneId: string, name?: string) {
  return {
    id: sceneId,
    name,
    entities: world.getAll().map(entityToRecord),
  };
}
