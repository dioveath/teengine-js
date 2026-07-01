import type { AtlasRegion, DemoAtlas, GpuTexture } from "teengine";

const CELL = 32;
const COLS = 4;
const SIZE = CELL * COLS;

function createTextureFromRgba(
  device: GPUDevice,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): GpuTexture {
  const data = new Uint8Array(pixels);
  const texture = device.createTexture({
    size: { width, height },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: width * 4 },
    { width, height },
  );
  const view = texture.createView();
  const sampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
  return { texture, view, sampler, width, height };
}

function regionFromCell(texture: GpuTexture, col: number, row: number): AtlasRegion {
  const x = col * CELL;
  const y = row * CELL;
  return {
    texture,
    u0: x / SIZE,
    v0: y / SIZE,
    u1: (x + CELL) / SIZE,
    v1: (y + CELL) / SIZE,
    width: CELL,
    height: CELL,
  };
}

/** Procedural demo atlas — no external image files required. */
export function createDemoAtlas(device: GPUDevice): DemoAtlas {
  const pixels = new Uint8ClampedArray(SIZE * SIZE * 4);

  const fills: Array<[col: number, row: number, r: number, g: number, b: number, a: number]> = [
    [0, 0, 0x58, 0xa6, 0xff, 255], // player — blue
    [1, 0, 0xf7, 0x81, 0x66, 255], // enemy — orange
    [2, 0, 0xff, 0xd7, 0x00, 255], // coin — gold
    [3, 0, 0xff, 0x4d, 0x6d, 255], // heart — red
  ];

  for (const [col, row, r, g, b, a] of fills) {
    for (let py = 0; py < CELL; py++) {
      for (let px = 0; px < CELL; px++) {
        const sx = col * CELL + px;
        const sy = row * CELL + py;
        const border =
          px === 0 || py === 0 || px === CELL - 1 || py === CELL - 1;
        const i = (sy * SIZE + sx) * 4;
        pixels[i] = border ? Math.floor(r * 0.55) : r;
        pixels[i + 1] = border ? Math.floor(g * 0.55) : g;
        pixels[i + 2] = border ? Math.floor(b * 0.55) : b;
        pixels[i + 3] = a;
      }
    }
  }

  const texture = createTextureFromRgba(device, pixels, SIZE, SIZE);
  return {
    player: regionFromCell(texture, 0, 0),
    enemy: regionFromCell(texture, 1, 0),
    coin: regionFromCell(texture, 2, 0),
    uiHeart: regionFromCell(texture, 3, 0),
  };
}
