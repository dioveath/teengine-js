import type { Graphics, SpriteFrame, TextureHandle } from "teengine";
import { spriteFrame } from "teengine";

export const CELL = 32;

export function createTextureFromRgba(
  graphics: Graphics,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): TextureHandle {
  return graphics.uploadRgba(new Uint8Array(pixels), width, height);
}

export function regionAt(
  texture: TextureHandle,
  texW: number,
  texH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): SpriteFrame {
  return spriteFrame(texture, texW, texH, x, y, w, h);
}

export function regionFromCell(
  texture: TextureHandle,
  texW: number,
  texH: number,
  col: number,
  row: number,
): SpriteFrame {
  return regionAt(texture, texW, texH, col * CELL, row * CELL, CELL, CELL);
}

export function setPixel(
  pixels: Uint8ClampedArray,
  atlasW: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): void {
  if (x < 0 || y < 0 || x >= atlasW) return;
  const i = (y * atlasW + x) * 4;
  if (i + 3 >= pixels.length) return;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

export function fillRect(
  pixels: Uint8ClampedArray,
  atlasW: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
): void {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPixel(pixels, atlasW, px, py, r, g, b);
    }
  }
}
