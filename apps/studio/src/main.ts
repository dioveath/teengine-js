import { emptyGameProject, Engine, Project, World } from "@teengine/core";
import { mountEditor } from "@teengine/editor";
import { createMemoryRepository } from "@teengine/storage";
import { createEngine } from "teengine";

const canvasEl = document.querySelector("#canvas");
const hostEl = document.querySelector("#editor");
if (!(canvasEl instanceof HTMLCanvasElement) || !(hostEl instanceof HTMLElement)) {
  throw new Error("Studio markup missing #canvas or #editor.");
}
const canvas = canvasEl;
const host = hostEl;

const project = new Project(emptyGameProject("Studio"));
const repo = createMemoryRepository([[{ ownerId: "local", projectId: "studio" }, project.document]]);

let engine: Engine | null = null;

async function play(): Promise<void> {
  engine?.stop();
  engine = await createEngine({ canvas });
  const world = new World();
  engine.setLoop({
    fixedUpdate: (ctx) => world.fixedUpdate(ctx),
    render: ({ graphics }) => {
      graphics.beginFrame({ r: 0.05, g: 0.07, b: 0.09, a: 1 });
      graphics.endFrame();
    },
  });
  engine.start();
  await repo.put({ ownerId: "local", projectId: "studio" }, project.document);
}

function stop(): void {
  engine?.stop();
  engine = null;
}

mountEditor(host, project, { play, stop });
