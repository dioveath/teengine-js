import { Engine } from "./engine/Engine.js";
import { createDemoAtlas } from "./assets/createDemoAtlas.js";
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

    const worldCam = createWorldCamera(400, 300);
    const uiCam = createUiCamera(canvas.width, canvas.height);

    engine.graphics.registerLayer("world", { camera: worldCam, sort: "y" });
    engine.graphics.registerLayer("ui", { camera: uiCam, sort: "z" });

    engine.setUpdateCallback(({ graphics, time, width, height }) => {
      uiCam.x = width * 0.5;
      uiCam.y = height * 0.5;

      const playerX = 400 + Math.cos(time) * 120;
      const playerY = 300 + Math.sin(time * 1.3) * 80;
      worldCam.lookAt(playerX, playerY);

      graphics.beginFrame(Color.hex("#0d1117"));

      graphics.beginLayer("world");
      graphics.drawSprite(atlas.player, { x: playerX, y: playerY, rotation: Math.sin(time) * 0.3 });
      graphics.drawSprite(atlas.enemy, { x: 520, y: 340 });
      graphics.drawSprite(atlas.coin, { x: 280, y: 260, rotation: time * 2 });
      graphics.drawDebugLine(playerX - 400, 300, playerX + 400, 300, 1, Color.rgb(0.2, 0.25, 0.3, 0.4));
      graphics.endLayer();

      graphics.beginLayer("ui");
      graphics.drawSprite(atlas.uiHeart, { x: 24, y: 24, origin: { x: 0, y: 0 } });
      graphics.drawSprite(atlas.uiHeart, { x: 60, y: 24, origin: { x: 0, y: 0 } });
      graphics.endLayer();

      graphics.endFrame();
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
