import { Engine } from "./engine/Engine.js";
import { createDemoAtlas } from "./assets/createDemoAtlas.js";
import { World } from "./ecs/World.js";
import { Color, createUiCamera, createWorldCamera } from "./graphics/Graphics.js";

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

    const worldCam = createWorldCamera(400, 300);
    const uiCam = createUiCamera(canvas.width, canvas.height);

    engine.graphics.registerLayer("world", { camera: worldCam, sort: "y" });
    engine.graphics.registerLayer("ui", { camera: uiCam, sort: "z" });

    const playerId = world.spawn({
      transform: { x: 400, y: 300 },
      sprite: { region: atlas.player, layer: "world" },
      shape: {
        kind: "circle",
        layer: "world",
        radius: 140,
        color: Color.rgb(0.2, 0.25, 0.3, 0.15),
        segments: 48,
      },
      update: (entity, _dt, time) => {
        entity.transform.x = 400 + Math.cos(time) * 120;
        entity.transform.y = 300 + Math.sin(time * 1.3) * 80;
        entity.transform.rotation = Math.sin(time) * 0.3;
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
      fixedUpdate: ({ dt }) => {
        world.update(dt);
      },
      render: ({ graphics, width, height }) => {
        uiCam.x = width * 0.5;
        uiCam.y = height * 0.5;

        const player = world.get(playerId);
        if (player) {
          worldCam.lookAt(player.transform.x, player.transform.y);
        }

        graphics.beginFrame(Color.hex("#0d1117"));
        world.render(graphics);

        if (player) {
          graphics.beginLayer("world");
          graphics.drawLine(
            player.transform.x - 400,
            300,
            player.transform.x + 400,
            300,
            1,
            Color.rgb(0.2, 0.25, 0.3, 0.4),
          );
          graphics.endLayer();
        }

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
