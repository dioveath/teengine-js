export { Engine, DEFAULT_FIXED_DT, DEFAULT_MAX_FRAME_STEPS } from "./engine/Engine.js";
export type {
  EngineOptions,
  FixedUpdateContext,
  RenderContext,
  GameLoopCallbacks,
} from "./engine/Engine.js";
export {
  clampFrameDt,
  createFixedTimestepState,
  runFixedTimestep,
} from "./engine/FixedTimestep.js";

export {
  Graphics,
  Camera2D,
  createUiCamera,
  createWorldCamera,
  Color,
} from "./graphics/Graphics.js";
export { HeadlessRenderer } from "./graphics/HeadlessRenderer.js";
export { Layers } from "./graphics/Layers.js";
export type { LayerName } from "./graphics/Layers.js";
export { RenderQueue, DRAW_SPRITE, DRAW_BOX, DRAW_CIRCLE, DRAW_CAPSULE, RECORD_FLOATS, R } from "./graphics/RenderQueue.js";
export type { RenderStats } from "./graphics/FrameRenderer.js";
export type { FitToRectMode, FitToRectOptions } from "./graphics/Camera2D.js";
export type { LayerSortMode, DrawOptions, ShapeOptions, RegisterLayerOptions } from "./graphics/Graphics.js";
export type { FrameRenderer } from "./graphics/FrameRenderer.js";
export type { SpriteFrame, TextureHandle } from "./graphics/sprite.js";
export { spriteFrame } from "./graphics/sprite.js";

export { World, Transform, AssetManager } from "./ecs/index.js";
export type { TransformData } from "./ecs/index.js";
export { EventBus } from "./ecs/Events.js";
export type { EventHandler, EventSubscription } from "./ecs/Events.js";
export { SpatialGrid } from "./ecs/SpatialGrid.js";
export type { SpatialEntry } from "./ecs/SpatialGrid.js";
export { ComponentStore } from "./ecs/ComponentStore.js";
export type {
  Entity,
  EntityId,
  SpawnConfig,
  SpriteComponent,
  ShapeComponent,
  ColliderShape,
  ColliderComponent,
  CollisionComponent,
  CollisionResponse,
  RigidBodyComponent,
  CameraTargetTag,
  CollisionListenerTag,
  SpinComponent,
  FixedUpdateSystem,
  RenderSystem,
  FixedUpdateSystemContext,
  RenderSystemContext,
  PhysicsAdapter,
  CollisionLayers,
  CollisionEvent,
  CollisionEventKind,
} from "./ecs/index.js";
export { hasPhysics, isSimulatedBody, createEntity } from "./ecs/index.js";
export { snapshotTransform, lerpTransform } from "./ecs/interpolation.js";
export type { TransformSnapshot } from "./ecs/interpolation.js";
export { COLLIDE_ALL, CollisionGroups, layers } from "./ecs/index.js";
export { SpinSystem } from "./ecs/systems/SpinSystem.js";
export { CameraFollowSystem } from "./ecs/systems/CameraFollowSystem.js";
export { EntityRenderSystem } from "./ecs/systems/EntityRenderSystem.js";

export { Input, ActionMap } from "./input/index.js";
export type { MousePosition } from "./input/index.js";

export { Inspector } from "./inspect/Inspector.js";

export {
  GAME_PROJECT_SCHEMA,
  GameProjectSchema,
  emptyGameProject,
  parseGameProject,
  cloneGameProject,
  loadScene,
  recordToSpawn,
  entityToRecord,
  sceneFromWorld,
  verifyGame,
  gameOutline,
  Project,
} from "./document/index.js";
export type {
  GameProject,
  EntityRecord,
  SceneRecord,
  AssetRecord,
  Diagnostic,
  VerifyResult,
} from "./document/index.js";

export { loadAtlasFromJson } from "./assets/loadAtlas.js";
export type { AtlasJson } from "./assets/loadAtlas.js";
export { Mat3 } from "./math/index.js";
export { Rng } from "./math/random.js";
export { Easing, Tween, TweenRunner, Pool } from "./utils/index.js";
export type { Easing as EasingFn, TweenOptions } from "./utils/index.js";
export { AudioSystem } from "./audio/AudioSystem.js";
export type { SfxOptions } from "./audio/AudioSystem.js";
