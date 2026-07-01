import type { Color } from "../math/index.js";
import type { LayerName } from "../graphics/Layers.js";
import { Transform, type Transform as TransformData } from "./Transform.js";

export type EntityId = number;

export type SpriteComponent = {
  region: import("../assets/Atlas.js").AtlasRegion;
  layer: LayerName;
  origin?: { x: number; y: number };
  tint?: Color;
  flipX?: boolean;
  flipY?: boolean;
  z?: number;
};

export type ColliderConfig =
  | { kind: "box"; width: number; height: number }
  | { kind: "ball"; radius: number };

/** Authoring-only physics config — runtime handles live in PhysicsBridge. */
export type RigidBodyComponent = {
  type: "dynamic" | "fixed" | "kinematicPosition";
  collider: ColliderConfig;
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
  layer: LayerName;
};

/** Marker: entity is the player character. */
export type PlayerTag = { readonly _tag: "player" };

/** Marker: camera follows this entity. */
export type CameraTargetTag = { readonly _tag: "cameraTarget" };

/** Rotates entity over time (radians per second). */
export type SpinComponent = { speed: number };

export type Entity = {
  id: EntityId;
  name: string;
  active: boolean;
  transform: TransformData;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  rigidBody?: RigidBodyComponent;
  player?: PlayerTag;
  cameraTarget?: CameraTargetTag;
  spin?: SpinComponent;
};

export type SpawnConfig = {
  name?: string;
  transform?: Partial<TransformData>;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  rigidBody?: RigidBodyComponent;
  player?: PlayerTag;
  cameraTarget?: CameraTargetTag;
  spin?: SpinComponent;
};

export function createEntity(id: EntityId, config: SpawnConfig): Entity {
  return {
    id,
    name: config.name ?? `Entity ${id}`,
    active: true,
    transform: Transform.create(config.transform),
    sprite: config.sprite,
    shape: config.shape,
    rigidBody: config.rigidBody,
    player: config.player,
    cameraTarget: config.cameraTarget,
    spin: config.spin,
  };
}
