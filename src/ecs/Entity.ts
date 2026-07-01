import type { RigidBodyHandle } from "../physics/PhysicsWorld.js";
import type { Color } from "../math/index.js";
import { Transform, type Transform as TransformData } from "./Transform.js";

export type EntityId = number;

export type SpriteComponent = {
  region: import("../assets/Atlas.js").AtlasRegion;
  layer: string;
  origin?: { x: number; y: number };
  tint?: Color;
  flipX?: boolean;
  flipY?: boolean;
  z?: number;
};

export type ColliderConfig =
  | { kind: "box"; width: number; height: number }
  | { kind: "ball"; radius: number };

export type RigidBodyComponent = {
  type: "dynamic" | "fixed" | "kinematicPosition";
  collider: ColliderConfig;
  handle?: RigidBodyHandle;
  restitution?: number;
  friction?: number;
  lockRotation?: boolean;
};

export type ShapeRect = {
  kind: "rect";
  width: number;
  height: number;
  color: Color;
  z?: number;
};

export type ShapeCircle = {
  kind: "circle";
  radius: number;
  color: Color;
  segments?: number;
  z?: number;
};

export type ShapeLine = {
  kind: "line";
  endX: number;
  endY: number;
  thickness: number;
  color: Color;
  z?: number;
};

export type ShapeComponent = (ShapeRect | ShapeCircle | ShapeLine) & {
  layer: string;
};

export type Entity = {
  id: EntityId;
  active: boolean;
  transform: TransformData;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  rigidBody?: RigidBodyComponent;
  update?: (entity: Entity, dt: number, time: number) => void;
};

export type SpawnConfig = {
  transform?: Partial<TransformData>;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  rigidBody?: RigidBodyComponent;
  update?: Entity["update"];
};

export function createEntity(id: EntityId, config: SpawnConfig): Entity {
  return {
    id,
    active: true,
    transform: Transform.create(config.transform),
    sprite: config.sprite,
    shape: config.shape,
    rigidBody: config.rigidBody,
    update: config.update,
  };
}
