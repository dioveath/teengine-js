import type { Graphics } from "../../graphics/Graphics.js";
import { sortEntitiesForLayer, type World } from "../World.js";
import type { Entity } from "../Entity.js";
import type { RenderSystem } from "../System.js";

type LayerBucket = {
  sprites: Entity[];
  shapes: Entity[];
};

export function renderWorldEntities(
  world: World,
  graphics: Graphics,
  alpha: number,
  buckets: Map<string, LayerBucket>,
): void {
  world.collectRenderables(buckets);
  const layerOrder = graphics.layerOrder;

  for (const layerName of layerOrder) {
    const bucket = buckets.get(layerName);
    if (!bucket || (bucket.sprites.length === 0 && bucket.shapes.length === 0)) {
      continue;
    }

    const sortMode = graphics.getLayerSortMode(layerName);
    sortEntitiesForLayer(bucket.sprites, sortMode, (e) => {
      const t = world.getRenderTransform(e, alpha);
      const z = e.sprite?.z;
      return z ?? (sortMode === "y" ? t.y + (e.sprite?.region.height ?? 0) : t.y);
    });
    sortEntitiesForLayer(bucket.shapes, sortMode, (e) => {
      const t = world.getRenderTransform(e, alpha);
      const shape = e.shape;
      if (!shape) return t.y;
      if (shape.kind === "rect") return shape.z ?? t.y + shape.height;
      if (shape.kind === "circle") return shape.z ?? t.y + shape.radius * 2;
      return shape.z ?? Math.max(t.y, shape.endY);
    });

    graphics.beginLayer(layerName);

    for (const entity of bucket.shapes) {
      drawShapeEntity(world, graphics, entity, alpha);
    }
    for (const entity of bucket.sprites) {
      drawSpriteEntity(world, graphics, entity, alpha);
    }

    graphics.endLayer();
  }
}

export class WorldEntityRenderSystem implements RenderSystem {
  readonly name = "WorldEntityRenderSystem";
  private readonly buckets = new Map<string, LayerBucket>();

  constructor(private readonly graphics: Graphics) {}

  render(ctx: import("../System.js").RenderSystemContext): void {
    renderWorldEntities(ctx.world, this.graphics, ctx.alpha, this.buckets);
  }
}

function drawSpriteEntity(world: World, graphics: Graphics, entity: Entity, alpha: number): void {
  const sprite = entity.sprite;
  if (!sprite) return;
  const t = world.getRenderTransform(entity, alpha);
  graphics.drawSprite(sprite.region, {
    x: t.x,
    y: t.y,
    z: sprite.z,
    rotation: t.rotation,
    scale: { x: t.scaleX, y: t.scaleY },
    origin: sprite.origin,
    tint: sprite.tint,
    flipX: sprite.flipX,
    flipY: sprite.flipY,
  });
}

function drawShapeEntity(world: World, graphics: Graphics, entity: Entity, alpha: number): void {
  const shape = entity.shape;
  if (!shape) return;
  const t = world.getRenderTransform(entity, alpha);
  const { x, y } = t;

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
