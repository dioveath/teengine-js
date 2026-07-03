import { Engine, PhysicsBridge, PhysicsWorld } from "teengine";
import { createPlatformerAtlas } from "./createPlatformerAtlas.js";
import { bindPlatformerLoop, createPlatformerScene } from "./PlatformerScene.js";

function showFallback(fallback: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const isWebGpuError = /webgpu/i.test(message);

  const title = fallback.querySelector("#fallback-title");
  const detail = fallback.querySelector("#fallback-detail");

  if (title instanceof HTMLElement) {
    title.textContent = isWebGpuError ? "WebGPU not available" : "Unable to start demo";
  }

  if (detail instanceof HTMLElement) {
    detail.textContent = isWebGpuError
      ? "TeEngine requires a browser with WebGPU support (Chrome 113+, Edge 113+, or Firefox Nightly with the flag enabled)."
      : message;
  }

  fallback.style.display = "block";
}

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
      showFallback(fallback, error);
    }
  }
}

void main();
