import type { DemoAtlas } from "../assets/Atlas.js";
import type { Engine } from "../engine/Engine.js";
import { CameraFollowSystem } from "../ecs/systems/CameraFollowSystem.js";
import { WorldEntityRenderSystem } from "../ecs/systems/EntityRenderSystem.js";
import { PlayerControllerSystem } from "../ecs/systems/PlayerControllerSystem.js";
import { SpinSystem } from "../ecs/systems/SpinSystem.js";
import { World } from "../ecs/World.js";
import type { EntityId } from "../ecs/Entity.js";
import { Color, createUiCamera, createWorldCamera } from "../graphics/Graphics.js";
import { Layers } from "../graphics/Layers.js";
import type { PhysicsBridge } from "../physics/PhysicsBridge.js";
import { DebugOverlaySystem } from "./DebugOverlaySystem.js";

export const GROUND_Y = 300;
export const PLAYER_SIZE = 28;

export type DemoSceneContext = {
  engine: Engine;
  world: World;
  physics: PhysicsBridge;
  atlas: DemoAtlas;
  playerId: EntityId;
  worldCamera: ReturnType<typeof createWorldCamera>;
  uiCamera: ReturnType<typeof createUiCamera>;
};

export function createDemoScene(
  engine: Engine,
  physics: PhysicsBridge,
  atlas: DemoAtlas,
): DemoSceneContext {
  const canvas = engine.graphics.viewport;
  const world = new World(physics);

  engine.input.bindAction("move_left", ["ArrowLeft", "KeyA"]);
  engine.input.bindAction("move_right", ["ArrowRight", "KeyD"]);
  engine.input.bindAction("jump", ["Space", "ArrowUp"]);

  const worldCam = createWorldCamera(400, GROUND_Y);
  const uiCam = createUiCamera(canvas.width, canvas.height);

  engine.graphics.registerLayer(Layers.world, { camera: worldCam, sort: "y" });
  engine.graphics.registerLayer(Layers.ui, { camera: uiCam, sort: "z" });

  physics.createStaticBox(-500, GROUND_Y, 3000, 40);

  const playerId = world.spawn({
    name: "Player",
    transform: { x: 400, y: GROUND_Y - PLAYER_SIZE * 0.5 },
    sprite: { region: atlas.player, layer: Layers.world },
    shape: {
      kind: "circle",
      layer: Layers.world,
      radius: 140,
      color: Color.rgb(0.2, 0.25, 0.3, 0.15),
      segments: 48,
    },
    rigidBody: {
      type: "dynamic",
      collider: { kind: "box", width: PLAYER_SIZE, height: PLAYER_SIZE },
      friction: 0.8,
      restitution: 0,
      lockRotation: true,
    },
    player: { _tag: "player" },
    cameraTarget: { _tag: "cameraTarget" },
  });

  world.spawn({
    name: "Enemy",
    transform: { x: 520, y: GROUND_Y - 16 },
    sprite: { region: atlas.enemy, layer: Layers.world },
    rigidBody: {
      type: "dynamic",
      collider: { kind: "box", width: 28, height: 28 },
      lockRotation: true,
    },
  });

  world.spawn({
    name: "Coin",
    transform: { x: 280, y: 260 },
    sprite: { region: atlas.coin, layer: Layers.world },
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

  world.addFixedSystem(new PlayerControllerSystem());
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

export function bindDemoLoop(
  scene: DemoSceneContext,
  hooks?: { onRender?: () => void },
): void {
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

      hooks?.onRender?.();
    },
  });
}
