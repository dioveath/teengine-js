import { Engine, PhysicsBridge, PhysicsWorld } from "teengine";
import { createPlatformerAtlas } from "./createPlatformerAtlas.js";
import { bindPlatformerLoop, createPlatformerScene } from "./PlatformerScene.js";

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #canvas not found.");
  }

  const fallback = document.getElementById("fallback");

  try {
    const engine = await Engine.create({ canvas });
    const physicsWorld = await PhysicsWorld.create({ gravityY: 980 });
    const physics = new PhysicsBridge(physicsWorld);
    const atlas = createPlatformerAtlas(engine.device);

    const scene = createPlatformerScene(engine, physics, atlas);
    bindPlatformerLoop(scene);
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
