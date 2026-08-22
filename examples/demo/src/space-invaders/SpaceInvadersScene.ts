import type { SpaceInvadersAtlas } from "./createSpaceInvadersAtlas.js";
import { SI_ATLAS } from "./createSpaceInvadersAtlas.js";
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
  MAX_VIEW_H,
  MAX_VIEW_W,
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
  atlas: SpaceInvadersAtlas;
  state: SpaceInvadersState;
  playerId: EntityId;
  worldCamera: ReturnType<typeof createWorldCamera>;
  uiCamera: ReturnType<typeof createUiCamera>;
};

declare global {
  interface Window {
    __TE__?: { snapshot: () => Record<string, unknown> };
  }
}

function sprite(region: string, layer: string, origin?: { x: number; y: number }) {
  return { asset: SI_ATLAS, region, layer, origin };
}

function spawnInvaders(world: World, state: SpaceInvadersState): void {
  for (let row = 0; row < INVADER_ROWS; row++) {
    const kind: InvaderKind = row < 2 ? "A" : "B";
    for (let col = 0; col < INVADER_COLS; col++) {
      const id = world.spawn({
        name: `Invader-${row}-${col}`,
        transform: {
          x: INVADER_START_X + col * INVADER_PAD_X,
          y: INVADER_START_Y + row * INVADER_PAD_Y,
        },
        sprite: sprite(invaderRegion(kind, 0), Layers.world),
      });
      state.invaderIds.push(id);
      state.invaderKinds.set(id, kind);
    }
  }
}

function spawnHudHearts(world: World, state: SpaceInvadersState): void {
  for (let i = 0; i < state.lives; i++) {
    const heartId = world.spawn({
      name: `Life-${i}`,
      transform: { x: 24 + i * 36, y: 24 },
      sprite: sprite("uiHeart", Layers.ui, { x: 0, y: 0 }),
    });
    state.hudHeartIds.push(heartId);
  }
}

export function createSpaceInvadersScene(engine: Engine, atlas: SpaceInvadersAtlas): SpaceInvadersSceneContext {
  const canvas = engine.graphics.viewport;
  const world = new World();
  world.assets.add(SI_ATLAS, atlas);
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
    sprite: sprite("player", Layers.world),
  });

  spawnInvaders(world, state);
  spawnHudHearts(world, state);

  const hud = document.getElementById("hud");

  world.addFixedSystem(new CombatSystem(playerId, state));
  world.addFixedSystem(new PlayerShipSystem(playerId, state));
  world.addFixedSystem(new InvaderFormationSystem(state));
  world.addRenderSystem(new StarfieldRenderSystem(engine.graphics));
  world.addRenderSystem(new WorldEntityRenderSystem(engine.graphics));
  world.addRenderSystem(
    new HudRenderSystem(state, (score, lives, status) => {
      if (hud) {
        const hint = status === "Playing" ? "Arrows move, hold Space to fire" : "Space restarts";
        hud.textContent = `Score: ${score}   Lives: ${lives}   ${status}   — ${hint}`;
        hud.dataset.score = String(score);
        hud.dataset.lives = String(lives);
        hud.dataset.status = status;
      }
      document.title = `Space Invaders — ${score}`;
    }),
  );

  world.inspection.set("state", () => state);
  world.inspection.set("playerX", () => world.get(playerId)?.transform.x ?? 0);
  window.__TE__ = { snapshot: () => world.inspection.snapshot() };

  return { engine, world, atlas, state, playerId, worldCamera: worldCam, uiCamera: uiCam };
}

export function resetSpaceInvaders(scene: SpaceInvadersSceneContext): void {
  const { world, state, playerId } = scene;
  for (const id of state.invaderIds) world.remove(id);
  for (const id of state.hudHeartIds) world.remove(id);
  for (const id of state.enemyBulletIds) world.remove(id);
  if (state.playerBulletId !== null) world.remove(state.playerBulletId);

  Object.assign(state, createSpaceInvadersState());
  spawnInvaders(world, state);
  spawnHudHearts(world, state);

  const player = world.get(playerId);
  if (player) {
    player.transform.x = WORLD_W * 0.5;
    player.transform.y = PLAYER_Y;
  }
}

export function bindSpaceInvadersLoop(scene: SpaceInvadersSceneContext): void {
  const { engine, world, worldCamera, uiCamera } = scene;

  engine.setLoop({
    fixedUpdate: (ctx) => {
      if ((scene.state.gameOver || scene.state.won) && ctx.input.actionPressed("fire")) {
        resetSpaceInvaders(scene);
      }
      world.fixedUpdate(ctx);
    },
    render: ({ graphics, input, width, height, alpha, dt, time, tick }) => {
      worldCamera.fitToRect(WORLD_W, WORLD_H, width, height, {
        maxViewportW: MAX_VIEW_W,
        maxViewportH: MAX_VIEW_H,
      });
      uiCamera.x = width * 0.5;
      uiCamera.y = height * 0.5;

      graphics.beginFrame(Color.hex("#0d1117"));
      world.render({ dt, time, tick, input, alpha, width, height });
      graphics.endFrame();
    },
  });
}
