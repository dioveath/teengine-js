import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockResizeToDisplaySize = vi.fn(() => ({ width: 640, height: 480 }));
const mockGraphicsResize = vi.fn();

vi.mock("../gpu/WebGPUContext.js", () => ({
  WebGPUContext: {
    create: vi.fn(async (options: { canvas: HTMLCanvasElement }) => ({
      canvas: options.canvas,
      device: {},
      resizeToDisplaySize: mockResizeToDisplaySize,
    })),
  },
}));

vi.mock("../graphics/Graphics.js", () => ({
  Graphics: {
    create: vi.fn(async () => ({
      viewport: { width: 640, height: 480 },
      resize: mockGraphicsResize,
    })),
  },
}));

import { Engine } from "./Engine.js";

describe("Engine", () => {
  let canvas: HTMLCanvasElement;
  let rafCallback: FrameRequestCallback | null;
  let rafId: number;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    rafCallback = null;
    rafId = 1;

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallback = cb;
      return rafId++;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates with graphics, input, and default fixed timestep", async () => {
    const engine = await Engine.create({ canvas });
    expect(engine.graphics.viewport.width).toBe(640);
    expect(engine.fixedTimestep).toBeCloseTo(1 / 60);
    engine.stop();
  });

  it("invokes fixedUpdate and render when the loop ticks", async () => {
    const engine = await Engine.create({ canvas });
    const fixedUpdate = vi.fn();
    const render = vi.fn();

    engine.setLoop({ fixedUpdate, render });
    engine.start();

    expect(rafCallback).toBeTypeOf("function");
    const startTime = performance.now();
    rafCallback!(startTime + 1000 / 60);

    expect(fixedUpdate).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0]?.[0].width).toBe(640);

    engine.stop();
  });

  it("skips fixed updates while paused but still renders", async () => {
    const engine = await Engine.create({ canvas });
    const fixedUpdate = vi.fn();
    const render = vi.fn();

    engine.setLoop({ fixedUpdate, render });
    engine.setPaused(true);
    engine.start();

    rafCallback!(2000);

    expect(fixedUpdate).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);

    engine.stop();
  });

  it("resizes graphics when the display size changes", async () => {
    mockResizeToDisplaySize.mockReturnValueOnce({ width: 1024, height: 768 });
    const engine = await Engine.create({ canvas });
    expect(mockGraphicsResize).toHaveBeenCalledWith(1024, 768);
    engine.stop();
  });

  it("stop prevents further loop ticks", async () => {
    const engine = await Engine.create({ canvas });
    const render = vi.fn();
    engine.setLoop({ fixedUpdate: vi.fn(), render });
    engine.start();
    engine.stop();

    rafCallback!(3000);
    expect(render).not.toHaveBeenCalled();
  });
});
