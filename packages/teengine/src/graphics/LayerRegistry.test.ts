import { describe, expect, it } from "vitest";
import { createUiCamera } from "./Camera2D.js";
import { LayerRegistry } from "./LayerRegistry.js";

describe("LayerRegistry", () => {
  it("registers layers in order and returns their config", () => {
    const registry = new LayerRegistry();
    const worldCam = createUiCamera(800, 600);

    registry.register("world", { camera: worldCam, sort: "y" });
    registry.register("ui", { camera: worldCam, sort: "z" });

    expect(registry.drawOrder).toEqual(["world", "ui"]);
    expect(registry.get("world").sort).toBe("y");
  });

  it("throws when registering a duplicate layer name", () => {
    const registry = new LayerRegistry();
    const camera = createUiCamera(800, 600);
    registry.register("world", { camera, sort: "y" });

    expect(() => registry.register("world", { camera, sort: "none" })).toThrow(
      /already registered/,
    );
  });

  it("throws when getting an unknown layer", () => {
    const registry = new LayerRegistry();
    expect(() => registry.get("missing")).toThrow(/not registered/);
  });
});
