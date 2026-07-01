import type { AtlasRegion } from "../assets/Atlas.js";
import type { Color } from "../math/index.js";
import { Transform, type Transform as TransformData } from "./Transform.js";

export type EntityId = number;

export type SpriteComponent = {
  region: AtlasRegion;
  layer: string;
  origin?: { x: number; y: number };
  tint?: Color;
  flipX?: boolean;
  flipY?: boolean;
};

export type Entity = {
  id: EntityId;
  active: boolean;
  transform: TransformData;
  sprite?: SpriteComponent;
  update?: (entity: Entity, dt: number, time: number) => void;
};

export type SpawnConfig = {
  transform?: Partial<TransformData>;
  sprite?: SpriteComponent;
  update?: Entity["update"];
};

export function createEntity(id: EntityId, config: SpawnConfig): Entity {
  return {
    id,
    active: true,
    transform: Transform.create(config.transform),
    sprite: config.sprite,
    update: config.update,
  };
}
