import { Engine } from "./engine/Engine.js";
import { createDemoAtlas } from "./assets/createDemoAtlas.js";
import { Editor } from "./editor/Editor.js";
import { PhysicsBridge } from "./physics/PhysicsBridge.js";
import { PhysicsWorld } from "./physics/PhysicsWorld.js";
import { bindDemoLoop, createDemoScene } from "./scene/DemoScene.js";

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #canvas not found.");
  }

  const app = document.getElementById("app");
  const fallback = document.getElementById("fallback");

  try {
    const engine = await Engine.create({ canvas });
    const physicsWorld = await PhysicsWorld.create({ gravityY: 980 });
    const physics = new PhysicsBridge(physicsWorld);
    const atlas = createDemoAtlas(engine.device);

    const scene = createDemoScene(engine, physics, atlas);

    let editor: Editor | undefined;
    if (app) {
      editor = new Editor({ engine, world: scene.world, root: app });
    }

    bindDemoLoop(scene, { onRender: () => editor?.update() });
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
