import { Engine } from "teengine";
import { createSpaceInvadersAtlas } from "./createSpaceInvadersAtlas.js";
import { bindSpaceInvadersLoop, createSpaceInvadersScene } from "./SpaceInvadersScene.js";

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #canvas not found.");
  }

  const fallback = document.getElementById("fallback");

  try {
    const engine = await Engine.create({ canvas });
    const atlas = createSpaceInvadersAtlas(engine.device);

    const scene = createSpaceInvadersScene(engine, atlas);
    bindSpaceInvadersLoop(scene);
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
