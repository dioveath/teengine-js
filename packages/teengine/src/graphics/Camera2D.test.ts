import { describe, expect, it } from "vitest";
import { Camera2D } from "./Camera2D.js";

describe("Camera2D", () => {
  it("round-trips world and screen coordinates at default zoom", () => {
    const camera = new Camera2D();
    camera.lookAt(200, 150);

    const viewportW = 800;
    const viewportH = 600;
    const world = { x: 320, y: 210 };

    const screen = camera.worldToScreen(world.x, world.y, viewportW, viewportH);
    expect(screen.x).toBeCloseTo(520, 4);
    expect(screen.y).toBeCloseTo(360, 4);

    const back = camera.screenToWorld(screen.x, screen.y, viewportW, viewportH);
    expect(back.x).toBeCloseTo(world.x, 4);
    expect(back.y).toBeCloseTo(world.y, 4);
  });

  it("round-trips world and screen coordinates when zoomed", () => {
    const camera = new Camera2D();
    camera.lookAt(200, 150);
    camera.zoom = 2;

    const viewportW = 800;
    const viewportH = 600;
    const world = { x: 320, y: 210 };

    const screen = camera.worldToScreen(world.x, world.y, viewportW, viewportH);
    const back = camera.screenToWorld(screen.x, screen.y, viewportW, viewportH);

    expect(back.x).toBeCloseTo(world.x, 4);
    expect(back.y).toBeCloseTo(world.y, 4);
  });

  it("fitToRect uses contain scaling without stretch", () => {
    const camera = new Camera2D();
    camera.fitToRect(800, 600, 1600, 900);

    expect(camera.zoom).toBeCloseTo(1.5, 4);
    expect(camera.x).toBe(400);
    expect(camera.y).toBe(300);
  });

  it("fitToRect caps zoom to max viewport size", () => {
    const camera = new Camera2D();
    camera.fitToRect(800, 600, 2560, 1440, { maxViewportW: 1280, maxViewportH: 960 });

    expect(camera.zoom).toBeCloseTo(1.6, 4);
  });

  it("fitToRect scales down for small viewports", () => {
    const camera = new Camera2D();
    camera.fitToRect(800, 600, 400, 300);

    expect(camera.zoom).toBeCloseTo(0.5, 4);
  });
});
