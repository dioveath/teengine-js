import { Engine } from "./engine/Engine.js";
import { Color, degToRad } from "./math/index.js";

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #canvas not found.");
  }

  const fallback = document.getElementById("fallback");

  try {
    const engine = await Engine.create({ canvas });

    engine.setUpdateCallback(({ graphics, time, width, height }) => {
      graphics.beginFrame(Color.hex("#0d1117"));

      // Background grid hint
      graphics.strokeLine(0, height * 0.5, width, height * 0.5, 1, Color.rgb(0.2, 0.25, 0.3, 0.5));
      graphics.strokeLine(width * 0.5, 0, width * 0.5, height, 1, Color.rgb(0.2, 0.25, 0.3, 0.5));

      // Animated demo shapes (replaces the old canvas fillRect loop)
      const cx = width * 0.5;
      const cy = height * 0.5;
      const orbit = Math.min(width, height) * 0.25;

      graphics.save();
      graphics.translate(cx, cy);
      graphics.rotate(time * 0.6);
      graphics.fillRect(-80, -40, 160, 80, Color.hex("#58a6ff"));
      graphics.restore();

      graphics.fillCircle(
        cx + Math.cos(time) * orbit,
        cy + Math.sin(time * 1.3) * orbit * 0.6,
        28,
        Color.hex("#f78166"),
      );

      graphics.save();
      graphics.translate(cx, cy);
      graphics.rotate(degToRad(45) + Math.sin(time * 2) * 0.2);
      graphics.scale(1.2, 0.6);
      graphics.fillRect(-50, -50, 100, 100, Color.hex("#3fb950", 0.85));
      graphics.restore();

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
