import type { DemoAtlas } from "teengine";
import {
  Color,
  Layers,
  WorldEntityRenderSystem,
  createUiCamera,
  createWorldCamera,
  World,
  type Engine,
  type EntityId,
} from "teengine";
import { CombatSystem } from "./CombatSystem.js";
import { HudRenderSystem, StarfieldRenderSystem } from "./HudRenderSystem.js";
import { InvaderFormationSystem } from "./InvaderFormationSystem.js";
import { PlayerShipSystem } from "./PlayerShipSystem.js";
import {
  INVADER_COLS,
  INVADER_PAD_X,
  INVADER_PAD_Y,
  INVADER_ROWS,
  INVADER_START_X,
  INVADER_START_Y,
  PLAYER_Y,
  WORLD_H,
  WORLD_W,
  createSpaceInvadersState,
  invaderRegion,
  type InvaderKind,
  type SpaceInvadersState,
} from "./spaceInvadersState.js";

export type SpaceInvadersSceneContext = {
  engine: Engine;
  world: World;
  atlas: DemoAtlas;
  state: SpaceInvadersState;
  playerId: EntityId;
  uiCamera: ReturnType<typeof createUiCamera>;
};

function spawnInvaders(world: World, atlas: DemoAtlas, state: SpaceInvadersState): void {
  for (let row = 0; row < INVADER_ROWS; row++) {
    const kind: InvaderKind = row < 2 ? "A" : "B";
    for (let col = 0; col < INVADER_COLS; col++) {
      const id = world.spawn({
        name: `Invader-${row}-${col}`,
        transform: {
          x: INVADER_START_X + col * INVADER_PAD_X,
          y: INVADER_START_Y + row * INVADER_PAD_Y,
        },
        sprite: {
          region: invaderRegion(atlas, kind, 0),
          layer: Layers.world,
        },
      });
      state.invaderIds.push(id);
      state.invaderKinds.set(id, kind);
    }
  }
}

function spawnHudHearts(world: World, atlas: DemoAtlas, lives: number): void {
  for (let i = 0; i < lives; i++) {
    world.spawn({
      name: `Life-${i}`,
      transform: { x: 24 + i * 36, y: 24 },
      sprite: { region: atlas.uiHeart, layer: Layers.ui, origin: { x: 0, y: 0 } },
    });
  }
}

export function createSpaceInvadersScene(engine: Engine, atlas: DemoAtlas): SpaceInvadersSceneContext {
  const canvas = engine.graphics.viewport;
  const world = new World();
  const state = createSpaceInvadersState();

  engine.input.bindAction("move_left", ["ArrowLeft", "KeyA"]);
  engine.input.bindAction("move_right", ["ArrowRight", "KeyD"]);
  engine.input.bindAction("fire", ["Space", "KeyZ", "KeyX"]);

  const worldCam = createWorldCamera(WORLD_W * 0.5, WORLD_H * 0.5);
  const uiCam = createUiCamera(canvas.width, canvas.height);

  engine.graphics.registerLayer(Layers.world, { camera: worldCam, sort: "z" });
  engine.graphics.registerLayer(Layers.ui, { camera: uiCam, sort: "z" });

  const playerId = world.spawn({
    name: "Player",
    transform: { x: WORLD_W * 0.5, y: PLAYER_Y },
    sprite: { region: atlas.player, layer: Layers.world },
    player: { _tag: "player" },
  });

  spawnInvaders(world, atlas, state);
  spawnHudHearts(world, atlas, state.lives);

  const hud = document.getElementById("hud");

  world.addFixedSystem(new PlayerShipSystem(state, atlas.bullet));
  world.addFixedSystem(new InvaderFormationSystem(state, atlas));
  world.addFixedSystem(new CombatSystem(state, atlas.enemyBullet));
  world.addRenderSystem(new StarfieldRenderSystem(engine.graphics));
  world.addRenderSystem(new WorldEntityRenderSystem(engine.graphics));
  world.addRenderSystem(
    new HudRenderSystem(engine.graphics, state, (score, lives, status) => {
      if (hud) {
        hud.textContent = `Score: ${score}   Lives: ${lives}   ${status}   — Arrow keys move, Space fires`;
      }
      document.title = `Space Invaders — ${score}`;
    }),
  );

  return { engine, world, atlas, state, playerId, uiCamera: uiCam };
}

export function bindSpaceInvadersLoop(scene: SpaceInvadersSceneContext): void {
  const { engine, world, uiCamera } = scene;

  engine.setLoop({
    fixedUpdate: (ctx) => {
      world.fixedUpdate({ ...ctx, physics: null });
    },
    render: ({ graphics, input, width, height, alpha, dt, time, tick }) => {
      uiCamera.x = width * 0.5;
      uiCamera.y = height * 0.5;

      graphics.beginFrame(Color.hex("#0d1117"));
      world.render({ dt, time, tick, input, physics: null, alpha, width, height });
      graphics.endFrame();
    },
  });
}
