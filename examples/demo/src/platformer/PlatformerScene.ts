import {
  CameraFollowSystem,
  CollisionGroups,
  Color,
  SpinSystem,
  World,
  WorldEntityRenderSystem,
  createUiCamera,
  createWorldCamera,
  Layers,
  layers,
  type Engine,
  type EntityId,
} from "teengine";
import type { PhysicsBridge } from "teengine";
import { DebugOverlaySystem } from "./DebugOverlaySystem.js";
import {
  PlatformerPhysicsEventsSystem,
  type PlatformerPhysicsState,
} from "./PlatformerPhysicsEventsSystem.js";
import { PlayerControllerSystem } from "./PlayerControllerSystem.js";
import type { PlatformerAtlas } from "./createPlatformerAtlas.js";

export const GROUND_Y = 300;
export const PLAYER_SIZE = 28;
const GROUND_WIDTH = 3000;
const GROUND_HEIGHT = 40;

export type PlatformerSceneContext = {
  engine: Engine;
  world: World;
  physics: PhysicsBridge;
  atlas: PlatformerAtlas;
  playerId: EntityId;
  worldCamera: ReturnType<typeof createWorldCamera>;
  uiCamera: ReturnType<typeof createUiCamera>;
};

export function createPlatformerScene(
  engine: Engine,
  physics: PhysicsBridge,
  atlas: PlatformerAtlas,
): PlatformerSceneContext {
  const canvas = engine.graphics.viewport;
  const world = new World(physics);
  const physicsState: PlatformerPhysicsState = { grounded: false };

  engine.input.bindAction("move_left", ["ArrowLeft", "KeyA"]);
  engine.input.bindAction("move_right", ["ArrowRight", "KeyD"]);
  engine.input.bindAction("jump", ["Space", "ArrowUp"]);

  const worldCam = createWorldCamera(400, GROUND_Y);
  const uiCam = createUiCamera(canvas.width, canvas.height);

  engine.graphics.registerLayer(Layers.world, { camera: worldCam, sort: "y" });
  engine.graphics.registerLayer(Layers.ui, { camera: uiCam, sort: "z" });

  const groundId = world.spawn({
    name: "Ground",
    transform: {
      x: -500 + GROUND_WIDTH * 0.5,
      y: GROUND_Y + GROUND_HEIGHT * 0.5,
    },
    shape: {
      kind: "rect",
      width: GROUND_WIDTH,
      height: GROUND_HEIGHT,
      color: Color.rgb(0.2, 0.25, 0.3),
      layer: Layers.world,
    },
    collider: { shape: { kind: "box", width: GROUND_WIDTH, height: GROUND_HEIGHT } },
    collision: {
      response: "solid",
      layers: layers(CollisionGroups.GROUND, CollisionGroups.PLAYER | CollisionGroups.ENEMY),
    },
    rigidBody: { type: "fixed" },
  });

  const playerId = world.spawn({
    name: "Player",
    transform: { x: 400, y: GROUND_Y - PLAYER_SIZE * 0.5 },
    sprite: { region: atlas.player, layer: Layers.world },
    collider: { shape: { kind: "box", width: PLAYER_SIZE, height: PLAYER_SIZE }, friction: 0.8, restitution: 0 },
    collision: {
      response: "solid",
      layers: layers(CollisionGroups.PLAYER, CollisionGroups.PICKUP | CollisionGroups.GROUND | CollisionGroups.ENEMY),
      emitEvents: true,
    },
    rigidBody: {
      type: "dynamic",
      lockRotation: true,
    },
    cameraTarget: { _tag: "cameraTarget" },
  });

  world.spawn({
    name: "Enemy",
    transform: { x: 520, y: GROUND_Y - 16 },
    sprite: { region: atlas.enemy, layer: Layers.world },
    collider: { shape: { kind: "box", width: 28, height: 28 } },
    collision: {
      response: "solid",
      layers: layers(CollisionGroups.ENEMY, CollisionGroups.PLAYER | CollisionGroups.GROUND),
    },
    rigidBody: {
      type: "dynamic",
      lockRotation: true,
    },
  });

  const coinId = world.spawn({
    name: "Coin",
    transform: { x: 280, y: 260 },
    sprite: { region: atlas.coin, layer: Layers.world },
    collider: { shape: { kind: "ball", radius: 12 } },
    collision: {
      response: "sensor",
      layers: layers(CollisionGroups.PICKUP, CollisionGroups.PLAYER),
    },
    spin: { speed: 2 },
  });

  world.spawn({
    name: "Heart 1",
    transform: { x: 24, y: 24 },
    sprite: { region: atlas.uiHeart, layer: Layers.ui, origin: { x: 0, y: 0 } },
  });

  world.spawn({
    name: "Heart 2",
    transform: { x: 60, y: 24 },
    sprite: { region: atlas.uiHeart, layer: Layers.ui, origin: { x: 0, y: 0 } },
  });

  world.addFixedSystem(new PlayerControllerSystem(playerId, physicsState));
  world.addPostPhysicsSystem(
    new PlatformerPhysicsEventsSystem(playerId, groundId, new Set([coinId]), physicsState),
  );
  world.addFixedSystem(new SpinSystem());
  world.addRenderSystem(new CameraFollowSystem(worldCam));
  world.addRenderSystem(new WorldEntityRenderSystem(engine.graphics));
  world.addRenderSystem(new DebugOverlaySystem(engine.graphics, { groundY: GROUND_Y, worldCamera: worldCam }));

  return {
    engine,
    world,
    physics,
    atlas,
    playerId,
    worldCamera: worldCam,
    uiCamera: uiCam,
  };
}

export function bindPlatformerLoop(scene: PlatformerSceneContext): void {
  const { engine, world, physics, uiCamera } = scene;

  engine.setLoop({
    fixedUpdate: (ctx) => {
      world.fixedUpdate({ ...ctx, physics });
    },
    render: ({ graphics, input, width, height, alpha, dt, time, tick }) => {
      uiCamera.x = width * 0.5;
      uiCamera.y = height * 0.5;

      graphics.beginFrame(Color.hex("#0d1117"));
      world.render({ dt, time, tick, input, physics, alpha, width, height });
      graphics.endFrame();
    },
  });
}
