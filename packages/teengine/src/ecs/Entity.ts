import type { Color } from "../math/index.js";
import type { LayerName } from "../graphics/Layers.js";
import type { CollisionLayers } from "../physics/CollisionLayers.js";
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
  /** Default: `true` for sensors, `false` for solids. */
  emitEvents?: boolean;
};

/** Simulation identity — shape and collision policy live in separate components. */
export type RigidBodyComponent = {
  type: "dynamic" | "fixed" | "kinematicPosition";
  lockRotation?: boolean;
};

export type SpriteComponent = {
  region: import("../assets/Atlas.js").AtlasRegion;
  layer: LayerName;
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
  layer: LayerName;
};

/** Marker: entity is the player character. */
export type PlayerTag = { readonly _tag: "player" };

/** Marker: camera follows this entity. */
export type CameraTargetTag = { readonly _tag: "cameraTarget" };

/** Marker: collectable pickup (demo / game-specific pattern). */
export type CoinTag = { readonly _tag: "coin" };

/** Marker: receive collision events as `self` when `emitEvents` is enabled. */
export type CollisionListenerTag = { readonly _tag: "collisionListener" };

/** Rotates entity over time (radians per second). */
export type SpinComponent = { speed: number };

export type Entity = {
  id: EntityId;
  name: string;
  active: boolean;
  transform: TransformData;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  collider?: ColliderComponent;
  collision?: CollisionComponent;
  rigidBody?: RigidBodyComponent;
  player?: PlayerTag;
  cameraTarget?: CameraTargetTag;
  coin?: CoinTag;
  collisionListener?: CollisionListenerTag;
  spin?: SpinComponent;
};

export type SpawnConfig = {
  name?: string;
  transform?: Partial<TransformData>;
  sprite?: SpriteComponent;
  shape?: ShapeComponent;
  collider?: ColliderComponent;
  collision?: CollisionComponent;
  rigidBody?: RigidBodyComponent;
  player?: PlayerTag;
  cameraTarget?: CameraTargetTag;
  coin?: CoinTag;
  collisionListener?: CollisionListenerTag;
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
    collider: config.collider,
    collision: config.collision,
    rigidBody: config.rigidBody,
    player: config.player,
    cameraTarget: config.cameraTarget,
    coin: config.coin,
    collisionListener: config.collisionListener,
    spin: config.spin,
  };
}

/** True when the entity participates in the physics world. */
export function hasPhysics(entity: Entity): boolean {
  return entity.collider !== undefined;
}

/** True when physics drives transform each tick (dynamic / kinematic bodies). */
export function isSimulatedBody(entity: Entity): boolean {
  if (!entity.rigidBody) return false;
  return entity.rigidBody.type === "dynamic" || entity.rigidBody.type === "kinematicPosition";
}
