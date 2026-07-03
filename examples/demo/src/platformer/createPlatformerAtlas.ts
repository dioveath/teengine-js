import type { AtlasRegion } from "teengine";
import { CELL, createTextureFromRgba, regionFromCell } from "../shared/atlasUtils.js";

export type PlatformerAtlas = {
  player: AtlasRegion;
  enemy: AtlasRegion;
  coin: AtlasRegion;
  uiHeart: AtlasRegion;
};

const COLS = 4;
const ROWS = 1;
const SIZE = CELL * COLS;

/** Procedural platformer atlas — no external image files required. */
export function createPlatformerAtlas(device: GPUDevice): PlatformerAtlas {
  const pixels = new Uint8ClampedArray(SIZE * CELL * ROWS * 4);

  const fills: Array<[col: number, row: number, r: number, g: number, b: number, a: number]> = [
    [0, 0, 0x58, 0xa6, 0xff, 255],
    [1, 0, 0xf7, 0x81, 0x66, 255],
    [2, 0, 0xff, 0xd7, 0x00, 255],
    [3, 0, 0xff, 0x4d, 0x6d, 255],
  ];

  for (const [col, row, r, g, b, a] of fills) {
    for (let py = 0; py < CELL; py++) {
      for (let px = 0; px < CELL; px++) {
        const sx = col * CELL + px;
        const sy = row * CELL + py;
        const border = px === 0 || py === 0 || px === CELL - 1 || py === CELL - 1;
        const i = (sy * SIZE + sx) * 4;
        pixels[i] = border ? Math.floor(r * 0.55) : r;
        pixels[i + 1] = border ? Math.floor(g * 0.55) : g;
        pixels[i + 2] = border ? Math.floor(b * 0.55) : b;
        pixels[i + 3] = a;
      }
    }
  }

  const texture = createTextureFromRgba(device, pixels, SIZE, CELL * ROWS);
  return {
    player: regionFromCell(texture, 0, 0, COLS, ROWS),
    enemy: regionFromCell(texture, 1, 0, COLS, ROWS),
    coin: regionFromCell(texture, 2, 0, COLS, ROWS),
    uiHeart: regionFromCell(texture, 3, 0, COLS, ROWS),
  };
}
