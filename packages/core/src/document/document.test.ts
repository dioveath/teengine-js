import { describe, expect, it } from "vitest";
import { World } from "../ecs/World.js";
import { spriteFrame } from "../graphics/sprite.js";
import { loadScene, sceneFromWorld } from "./hydrate.js";
import { emptyGameProject } from "./schema.js";
import { verifyGame } from "./verify.js";
import { Project } from "./Project.js";

describe("GameProject", () => {
  it("round-trips a spawned sprite entity", () => {
    const world = new World();
    world.assets.add("pack", {
      player: spriteFrame({ id: 1 }, 32, 32, 0, 0, 16, 16),
    });
    world.spawn({
      key: "player",
      name: "Player",
      transform: { x: 40, y: 80 },
      sprite: { asset: "pack", region: "player", layer: "world" },
    });

    const scene = sceneFromWorld(world, "main", "Main");
    expect(scene.entities[0]?.id).toBe("player");
    expect(scene.entities[0]?.sprite?.region).toBe("player");

    const world2 = new World();
    world2.assets.add("pack", {
      player: spriteFrame({ id: 1 }, 32, 32, 0, 0, 16, 16),
    });
    const doc = emptyGameProject();
    doc.scenes = [scene];
    const ids = loadScene(world2, doc);
    expect(ids.get("player")).toBeDefined();
    expect(world2.get(ids.get("player")!)?.transform.x).toBe(40);
  });

  it("rejects unknown assets", () => {
    const doc = emptyGameProject();
    doc.scenes[0]!.entities.push({
      id: "ghost",
      sprite: { asset: "missing", region: "x", layer: "world" },
    });
    const result = verifyGame(doc);
    expect(result.ok).toBe(false);
  });

  it("applies project writes after verify", () => {
    const project = new Project(emptyGameProject());
    const errors = project.spawn("main", { id: "a", transform: { x: 1, y: 2 } });
    expect(errors).toEqual([]);
    expect(project.document.scenes[0]?.entities).toHaveLength(1);
    project.undo();
    expect(project.document.scenes[0]?.entities).toHaveLength(0);
  });
});
