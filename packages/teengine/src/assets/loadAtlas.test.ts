import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Engine } from "../engine/Engine.js";
import { loadAtlasFromJson } from "./loadAtlas.js";

function createMockEngine(): Engine {
  return {
    getGpuDevice: () =>
      ({
        createTexture: vi.fn(() => ({
          createView: vi.fn(() => ({})),
        })),
        createSampler: vi.fn(() => ({})),
        queue: {
          copyExternalImageToTexture: vi.fn(),
        },
      }) as unknown as GPUDevice,
  } as Engine;
}

describe("loadAtlasFromJson", () => {
  const fetchMock = vi.fn();
  const createImageBitmapMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    createImageBitmapMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);
    vi.stubGlobal("GPUTextureUsage", {
      TEXTURE_BINDING: 0x04,
      COPY_DST: 0x02,
      RENDER_ATTACHMENT: 0x10,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads atlas JSON and image, returning named regions", async () => {
    const atlasJson = {
      meta: { image: "sprites.png", size: { w: 64, h: 32 } },
      frames: {
        hero: { frame: { x: 0, y: 0, w: 32, h: 32 } },
        coin: { frame: { x: 32, y: 0, w: 16, h: 16 } },
      },
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => atlasJson,
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(),
      });

    createImageBitmapMock.mockResolvedValue({ width: 64, height: 32 });

    const engine = createMockEngine();
    const regions = await loadAtlasFromJson(engine, "/assets/sprites.json");

    expect(regions.hero?.width).toBe(32);
    expect(regions.hero?.u0).toBe(0);
    expect(regions.hero?.u1).toBe(0.5);
    expect(regions.coin?.height).toBe(16);
    expect(fetchMock).toHaveBeenCalledWith("/assets/sprites.json");
  });

  it("throws when atlas JSON fetch fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const engine = createMockEngine();

    await expect(loadAtlasFromJson(engine, "/missing.json")).rejects.toThrow(
      /Failed to load atlas JSON/,
    );
  });

  it("throws when atlas image fetch fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: { image: "sprites.png", size: { w: 64, h: 32 } },
          frames: {},
        }),
      })
      .mockResolvedValueOnce({ ok: false });

    const engine = createMockEngine();
    await expect(loadAtlasFromJson(engine, "/assets/sprites.json")).rejects.toThrow(
      /Failed to load atlas image/,
    );
  });
});
