import type { Graphics } from "../graphics/Graphics.js";
import { createEntity, type Entity, type EntityId, type SpawnConfig } from "./Entity.js";

export class World {
  private readonly entities = new Map<EntityId, Entity>();
  private nextId: EntityId = 1;
  private time = 0;

  spawn(config: SpawnConfig): EntityId {
    const id = this.nextId++;
    this.entities.set(id, createEntity(id, config));
    return id;
  }

  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  remove(id: EntityId): void {
    this.entities.delete(id);
  }

  /** Fixed-timestep simulation — call at 1/60s intervals. */
  update(fixedDt: number): void {
    this.time += fixedDt;
    for (const entity of this.entities.values()) {
      if (!entity.active) continue;
      entity.update?.(entity, fixedDt, this.time);
    }
  }

  /** Draw all entities grouped by sprite layer. */
  render(graphics: Graphics): void {
    const byLayer = new Map<string, Entity[]>();

    for (const entity of this.entities.values()) {
      if (!entity.active || !entity.sprite) continue;
      const list = byLayer.get(entity.sprite.layer);
      if (list) {
        list.push(entity);
      } else {
        byLayer.set(entity.sprite.layer, [entity]);
      }
    }

    for (const [layer, entities] of byLayer) {
      entities.sort((a, b) => a.transform.y - b.transform.y);
      graphics.beginLayer(layer);
      for (const entity of entities) {
        const sprite = entity.sprite;
        if (!sprite) continue;
        const { transform } = entity;
        graphics.drawSprite(sprite.region, {
          x: transform.x,
          y: transform.y,
          rotation: transform.rotation,
          scale: { x: transform.scaleX, y: transform.scaleY },
          origin: sprite.origin,
          tint: sprite.tint,
          flipX: sprite.flipX,
          flipY: sprite.flipY,
        });
      }
      graphics.endLayer();
    }
  }

  get elapsed(): number {
    return this.time;
  }
}
