import type { Color } from "../math/index.js";
import type { CollisionLayers } from "./collision.js";
import { Transform, type Transform as TransformData } from "./Transform.js";

export type EntityId = number;

export type ColliderShape =
  | { kind: "box"; width: number; height: number }
  | { kind: "ball"; radius: number };

export type ColliderComponent = {
  shape: ColliderShape;
  offset?: { x: number; y: number };
  friction?: number;
  restitution?: number;
};

export type CollisionResponse = "solid" | "sensor";

export type CollisionComponent = {
  response: CollisionResponse;
  layers?: CollisionLayers;
  emitEvents?: boolean;
};

export type RigidBodyComponent = {
  type: "dynamic" | "fixed" | "kinematicPosition";
  lockRotation?: boolean;
};

export type SpriteComponent = {
  asset: string;
  region: string;
  layer: string;
  origin?: { x: number; y: number };
  tint?: Color;
  flipX?: boolean;
  flipY?: boolean;
  z?: number;
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

export type CameraTargetTag = { readonly _tag: "cameraTarget" };
export type CollisionListenerTag = { readonly _tag: "collisionListener" };
export type SpinComponent = { speed: number };

export type Entity = {
  id: EntityId;
  key?: string;
  name: string;
  active: boolean;
  transform: TransformData;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  collider?: ColliderComponent;
  collision?: CollisionComponent;
  rigidBody?: RigidBodyComponent;
  cameraTarget?: CameraTargetTag;
  collisionListener?: CollisionListenerTag;
  spin?: SpinComponent;
};

export type SpawnConfig = {
  key?: string;
  name?: string;
  transform?: Partial<TransformData>;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  collider?: ColliderComponent;
  collision?: CollisionComponent;
  rigidBody?: RigidBodyComponent;
  cameraTarget?: CameraTargetTag;
  collisionListener?: CollisionListenerTag;
  spin?: SpinComponent;
};

export function createEntity(id: EntityId, config: SpawnConfig): Entity {
  return {
    id,
    key: config.key,
    name: config.name ?? `Entity ${id}`,
    active: true,
    transform: Transform.create(config.transform),
    sprite: config.sprite,
    shape: config.shape,
    collider: config.collider,
    collision: config.collision,
    rigidBody: config.rigidBody,
    cameraTarget: config.cameraTarget,
    collisionListener: config.collisionListener,
    spin: config.spin,
  };
}

export function hasPhysics(entity: Entity): boolean {
  return entity.collider !== undefined;
}

export function isSimulatedBody(entity: Entity): boolean {
  return entity.rigidBody?.type === "dynamic" || entity.rigidBody?.type === "kinematicPosition";
}
