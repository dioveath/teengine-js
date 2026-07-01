import type { Graphics } from "../graphics/Graphics.js";
import type { PhysicsWorld } from "../physics/PhysicsWorld.js";
import { createEntity, type Entity, type EntityId, type SpawnConfig } from "./Entity.js";

type LayerRenderables = {
  sprites: Entity[];
  shapes: Entity[];
};

export class World {
  private readonly entities = new Map<EntityId, Entity>();
  private nextId: EntityId = 1;
  private time = 0;
  private physics: PhysicsWorld | null = null;

  spawn(config: SpawnConfig): EntityId {
    const id = this.nextId++;
    const entity = createEntity(id, config);
    this.entities.set(id, entity);

    if (this.physics && entity.rigidBody) {
      entity.rigidBody.handle = this.physics.createBodyForEntity(entity);
    }

    return id;
  }

  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  remove(id: EntityId): void {
    const entity = this.entities.get(id);
    if (entity?.rigidBody?.handle !== undefined && this.physics) {
      this.physics.removeBody(entity.rigidBody.handle);
    }
    this.entities.delete(id);
  }

  /** Attach physics and create bodies for existing entities with rigidBody. */
  attachPhysics(physics: PhysicsWorld): void {
    this.physics = physics;
    for (const entity of this.entities.values()) {
      if (entity.rigidBody && entity.rigidBody.handle === undefined) {
        entity.rigidBody.handle = physics.createBodyForEntity(entity);
      }
    }
  }

  /** Copy Rapier transforms into entity transforms after physics step. */
  syncFromPhysics(): void {
    if (!this.physics) return;

    for (const entity of this.entities.values()) {
      const handle = entity.rigidBody?.handle;
      if (handle === undefined) continue;

      const t = this.physics.getTransform(handle);
      entity.transform.x = t.x;
      entity.transform.y = t.y;
      entity.transform.rotation = t.rotation;
    }
  }

  get physicsWorld(): PhysicsWorld | null {
    return this.physics;
  }

  update(fixedDt: number): void {
    this.time += fixedDt;
    for (const entity of this.entities.values()) {
      if (!entity.active) continue;
      entity.update?.(entity, fixedDt, this.time);
    }
  }

  render(graphics: Graphics): void {
    const byLayer = new Map<string, LayerRenderables>();

    for (const entity of this.entities.values()) {
      if (!entity.active) continue;

      if (entity.sprite) {
        this.addToLayer(byLayer, entity.sprite.layer, entity, "sprite");
      }
      if (entity.shape) {
        this.addToLayer(byLayer, entity.shape.layer, entity, "shape");
      }
    }

    for (const [layer, { sprites, shapes }] of byLayer) {
      sprites.sort((a, b) => a.transform.y - b.transform.y);
      shapes.sort((a, b) => a.transform.y - b.transform.y);

      graphics.beginLayer(layer);

      for (const entity of shapes) {
        this.drawShapeEntity(graphics, entity);
      }
      for (const entity of sprites) {
        this.drawSpriteEntity(graphics, entity);
      }

      graphics.endLayer();
    }
  }

  get elapsed(): number {
    return this.time;
  }

  private addToLayer(
    byLayer: Map<string, LayerRenderables>,
    layer: string,
    entity: Entity,
    kind: "sprite" | "shape",
  ): void {
    let bucket = byLayer.get(layer);
    if (!bucket) {
      bucket = { sprites: [], shapes: [] };
      byLayer.set(layer, bucket);
    }
    if (kind === "sprite") {
      bucket.sprites.push(entity);
    } else {
      bucket.shapes.push(entity);
    }
  }

  private drawSpriteEntity(graphics: Graphics, entity: Entity): void {
    const sprite = entity.sprite;
    if (!sprite) return;
    const { transform } = entity;
    graphics.drawSprite(sprite.region, {
      x: transform.x,
      y: transform.y,
      z: sprite.z,
      rotation: transform.rotation,
      scale: { x: transform.scaleX, y: transform.scaleY },
      origin: sprite.origin,
      tint: sprite.tint,
      flipX: sprite.flipX,
      flipY: sprite.flipY,
    });
  }

  private drawShapeEntity(graphics: Graphics, entity: Entity): void {
    const shape = entity.shape;
    if (!shape) return;
    const { x, y } = entity.transform;

    if (shape.kind === "rect") {
      graphics.drawRect(x, y, shape.width, shape.height, shape.color, { z: shape.z });
    } else if (shape.kind === "circle") {
      graphics.drawCircle(x, y, shape.radius, shape.color, {
        z: shape.z,
        segments: shape.segments,
      });
    } else if (shape.kind === "line") {
      graphics.drawLine(x, y, shape.endX, shape.endY, shape.thickness, shape.color, {
        z: shape.z,
      });
    }
  }
}
