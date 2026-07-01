import { Engine } from "./engine/Engine.js";
import { createDemoAtlas } from "./assets/createDemoAtlas.js";
import { World } from "./ecs/World.js";
import { Color, createUiCamera, createWorldCamera } from "./graphics/Graphics.js";

const MOVE_SPEED = 220;
const GRAVITY = 900;
const JUMP_SPEED = -380;
const GROUND_Y = 300;

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #canvas not found.");
  }

  const fallback = document.getElementById("fallback");

  try {
    const engine = await Engine.create({ canvas });
    const atlas = createDemoAtlas(engine.device);
    const world = new World();

    engine.input.bindAction("move_left", ["ArrowLeft", "KeyA"]);
    engine.input.bindAction("move_right", ["ArrowRight", "KeyD"]);
    engine.input.bindAction("move_up", ["ArrowUp", "KeyW"]);
    engine.input.bindAction("move_down", ["ArrowDown", "KeyS"]);
    engine.input.bindAction("jump", ["Space", "ArrowUp"]);

    const worldCam = createWorldCamera(400, GROUND_Y);
    const uiCam = createUiCamera(canvas.width, canvas.height);

    engine.graphics.registerLayer("world", { camera: worldCam, sort: "y" });
    engine.graphics.registerLayer("ui", { camera: uiCam, sort: "z" });

    let velocityY = 0;
    let grounded = true;

    const playerId = world.spawn({
      transform: { x: 400, y: GROUND_Y },
      sprite: { region: atlas.player, layer: "world" },
      shape: {
        kind: "circle",
        layer: "world",
        radius: 140,
        color: Color.rgb(0.2, 0.25, 0.3, 0.15),
        segments: 48,
      },
    });

    world.spawn({
      transform: { x: 520, y: 340 },
      sprite: { region: atlas.enemy, layer: "world" },
    });

    world.spawn({
      transform: { x: 280, y: 260 },
      sprite: { region: atlas.coin, layer: "world" },
      update: (entity, _dt, time) => {
        entity.transform.rotation = time * 2;
      },
    });

    world.spawn({
      transform: { x: 24, y: 24 },
      sprite: { region: atlas.uiHeart, layer: "ui", origin: { x: 0, y: 0 } },
    });

    world.spawn({
      transform: { x: 60, y: 24 },
      sprite: { region: atlas.uiHeart, layer: "ui", origin: { x: 0, y: 0 } },
    });

    engine.setLoop({
      fixedUpdate: ({ dt, input }) => {
        const player = world.get(playerId);
        if (player) {
          const dx = input.actionAxis("move_left", "move_right");
          player.transform.x += dx * MOVE_SPEED * dt;

          if (input.actionPressed("jump") && grounded) {
            velocityY = JUMP_SPEED;
            grounded = false;
          }

          velocityY += GRAVITY * dt;
          player.transform.y += velocityY * dt;

          if (player.transform.y >= GROUND_Y) {
            player.transform.y = GROUND_Y;
            velocityY = 0;
            grounded = true;
          }
        }

        world.update(dt);
      },
      render: ({ graphics, input, width, height }) => {
        uiCam.x = width * 0.5;
        uiCam.y = height * 0.5;

        const player = world.get(playerId);
        if (player) {
          worldCam.lookAt(player.transform.x, player.transform.y);
        }

        graphics.beginFrame(Color.hex("#0d1117"));
        world.render(graphics);

        graphics.beginLayer("world");
        graphics.drawLine(0, GROUND_Y, 2000, GROUND_Y, 2, Color.rgb(0.2, 0.25, 0.3, 0.5));

        if (input.isMouseInCanvas) {
          const mouse = input.mouseWorld(worldCam, width, height);
          graphics.drawCircle(mouse.x, mouse.y, 8, Color.rgb(0.88, 0.42, 0.52, 0.6), {
            segments: 16,
          });
        }
        graphics.endLayer();

        graphics.endFrame();
      },
    });

    engine.start();
  } catch (error) {
    console.error(error);
    canvas.style.display = "none";
    if (fallback instanceof HTMLElement) {
      fallback.style.display = "block";
      const message = error instanceof Error ? error.message : String(error);
      const detail = document.createElement("p");
      detail.textContent = message;
      fallback.appendChild(detail);
    }
  }
}

void main();
