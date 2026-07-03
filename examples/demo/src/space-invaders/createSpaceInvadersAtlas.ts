import type { AtlasRegion } from "teengine";
import { CELL, createTextureFromRgba, fillRect, regionFromCell } from "../shared/atlasUtils.js";

export type SpaceInvadersAtlas = {
  player: AtlasRegion;
  invaderA: AtlasRegion;
  invaderAAlt: AtlasRegion;
  invaderB: AtlasRegion;
  invaderBAlt: AtlasRegion;
  bullet: AtlasRegion;
  enemyBullet: AtlasRegion;
  uiHeart: AtlasRegion;
};

const COLS = 4;
const ROWS = 2;
const SIZE = CELL * COLS;

function drawPlayerShip(pixels: Uint8ClampedArray, col: number, row: number): void {
  const ox = col * CELL + 8;
  const oy = row * CELL + 8;
  fillRect(pixels, SIZE, ox + 6, oy + 14, 4, 6, 0x3f, 0xbf, 0x7f);
  fillRect(pixels, SIZE, ox + 4, oy + 12, 8, 2, 0x3f, 0xbf, 0x7f);
  fillRect(pixels, SIZE, ox + 2, oy + 10, 12, 2, 0x3f, 0xbf, 0x7f);
  fillRect(pixels, SIZE, ox + 0, oy + 8, 16, 2, 0x3f, 0xbf, 0x7f);
}

function drawInvaderA(pixels: Uint8ClampedArray, col: number, row: number, alt: boolean): void {
  const ox = col * CELL + 6;
  const oy = row * CELL + 8;
  fillRect(pixels, SIZE, ox + 4, oy + 0, 12, 2, 0xf7, 0x81, 0x66);
  fillRect(pixels, SIZE, ox + 2, oy + 2, 16, 2, 0xf7, 0x81, 0x66);
  fillRect(pixels, SIZE, ox + 0, oy + 4, 20, 4, 0xf7, 0x81, 0x66);
  fillRect(pixels, SIZE, ox + 2, oy + 8, 16, 2, 0xf7, 0x81, 0x66);
  if (alt) {
    fillRect(pixels, SIZE, ox + 0, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
    fillRect(pixels, SIZE, ox + 16, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
  } else {
    fillRect(pixels, SIZE, ox + 4, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
    fillRect(pixels, SIZE, ox + 12, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
  }
}

function drawInvaderB(pixels: Uint8ClampedArray, col: number, row: number, alt: boolean): void {
  const ox = col * CELL + 4;
  const oy = row * CELL + 6;
  fillRect(pixels, SIZE, ox + 6, oy + 0, 8, 2, 0xa3, 0x71, 0xf7);
  fillRect(pixels, SIZE, ox + 2, oy + 2, 16, 2, 0xa3, 0x71, 0xf7);
  fillRect(pixels, SIZE, ox + 0, oy + 4, 20, 6, 0xa3, 0x71, 0xf7);
  fillRect(pixels, SIZE, ox + 4, oy + 10, 12, 2, 0xa3, 0x71, 0xf7);
  if (alt) {
    fillRect(pixels, SIZE, ox + 0, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
    fillRect(pixels, SIZE, ox + 14, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
  } else {
    fillRect(pixels, SIZE, ox + 2, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
    fillRect(pixels, SIZE, ox + 12, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
  }
}

function drawBullet(pixels: Uint8ClampedArray, col: number, row: number, enemy: boolean): void {
  const ox = col * CELL + 14;
  const oy = row * CELL + (enemy ? 4 : 10);
  if (enemy) {
    fillRect(pixels, SIZE, ox, oy, 4, 10, 0xff, 0x4d, 0x6d);
  } else {
    fillRect(pixels, SIZE, ox, oy, 4, 6, 0xff, 0xd7, 0x00);
  }
}

function drawHeart(pixels: Uint8ClampedArray, col: number, row: number): void {
  const ox = col * CELL + 8;
  const oy = row * CELL + 10;
  fillRect(pixels, SIZE, ox + 2, oy + 0, 4, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, SIZE, ox + 10, oy + 0, 4, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, SIZE, ox + 0, oy + 2, 16, 4, 0xff, 0x4d, 0x6d);
  fillRect(pixels, SIZE, ox + 2, oy + 6, 12, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, SIZE, ox + 4, oy + 8, 8, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, SIZE, ox + 6, oy + 10, 4, 2, 0xff, 0x4d, 0x6d);
}

/** Procedural Space Invaders atlas — no external image files required. */
export function createSpaceInvadersAtlas(device: GPUDevice): SpaceInvadersAtlas {
  const pixels = new Uint8ClampedArray(SIZE * CELL * ROWS * 4);

  drawPlayerShip(pixels, 0, 0);
  drawInvaderA(pixels, 1, 0, false);
  drawInvaderA(pixels, 2, 0, true);
  drawInvaderB(pixels, 3, 0, false);
  drawInvaderB(pixels, 0, 1, true);
  drawBullet(pixels, 1, 1, false);
  drawBullet(pixels, 2, 1, true);
  drawHeart(pixels, 3, 1);

  const texture = createTextureFromRgba(device, pixels, SIZE, CELL * ROWS);
  return {
    player: regionFromCell(texture, 0, 0, COLS, ROWS),
    invaderA: regionFromCell(texture, 1, 0, COLS, ROWS),
    invaderAAlt: regionFromCell(texture, 2, 0, COLS, ROWS),
    invaderB: regionFromCell(texture, 3, 0, COLS, ROWS),
    invaderBAlt: regionFromCell(texture, 0, 1, COLS, ROWS),
    bullet: regionFromCell(texture, 1, 1, COLS, ROWS),
    enemyBullet: regionFromCell(texture, 2, 1, COLS, ROWS),
    uiHeart: regionFromCell(texture, 3, 1, COLS, ROWS),
  };
}
