import type { AtlasRegion, DemoAtlas, GpuTexture } from "teengine";

const CELL = 32;
const COLS = 4;
const ROWS = 2;
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
    v0: y / (CELL * ROWS),
    u1: (x + CELL) / SIZE,
    v1: (y + CELL) / (CELL * ROWS),
    width: CELL,
    height: CELL,
  };
}

function setPixel(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): void {
  if (x < 0 || y < 0 || x >= SIZE || y >= CELL * ROWS) return;
  const i = (y * SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function fillRect(
  pixels: Uint8ClampedArray,
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
      setPixel(pixels, px, py, r, g, b);
    }
  }
}

function drawPlayerShip(pixels: Uint8ClampedArray, col: number, row: number): void {
  const ox = col * CELL + 8;
  const oy = row * CELL + 8;
  fillRect(pixels, ox + 6, oy + 14, 4, 6, 0x3f, 0xbf, 0x7f);
  fillRect(pixels, ox + 4, oy + 12, 8, 2, 0x3f, 0xbf, 0x7f);
  fillRect(pixels, ox + 2, oy + 10, 12, 2, 0x3f, 0xbf, 0x7f);
  fillRect(pixels, ox + 0, oy + 8, 16, 2, 0x3f, 0xbf, 0x7f);
}

function drawInvaderA(pixels: Uint8ClampedArray, col: number, row: number, alt: boolean): void {
  const ox = col * CELL + 6;
  const oy = row * CELL + 8;
  fillRect(pixels, ox + 4, oy + 0, 12, 2, 0xf7, 0x81, 0x66);
  fillRect(pixels, ox + 2, oy + 2, 16, 2, 0xf7, 0x81, 0x66);
  fillRect(pixels, ox + 0, oy + 4, 20, 4, 0xf7, 0x81, 0x66);
  fillRect(pixels, ox + 2, oy + 8, 16, 2, 0xf7, 0x81, 0x66);
  if (alt) {
    fillRect(pixels, ox + 0, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
    fillRect(pixels, ox + 16, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
  } else {
    fillRect(pixels, ox + 4, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
    fillRect(pixels, ox + 12, oy + 10, 4, 4, 0xf7, 0x81, 0x66);
  }
}

function drawInvaderB(pixels: Uint8ClampedArray, col: number, row: number, alt: boolean): void {
  const ox = col * CELL + 4;
  const oy = row * CELL + 6;
  fillRect(pixels, ox + 6, oy + 0, 8, 2, 0xa3, 0x71, 0xf7);
  fillRect(pixels, ox + 2, oy + 2, 16, 2, 0xa3, 0x71, 0xf7);
  fillRect(pixels, ox + 0, oy + 4, 20, 6, 0xa3, 0x71, 0xf7);
  fillRect(pixels, ox + 4, oy + 10, 12, 2, 0xa3, 0x71, 0xf7);
  if (alt) {
    fillRect(pixels, ox + 0, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
    fillRect(pixels, ox + 14, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
  } else {
    fillRect(pixels, ox + 2, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
    fillRect(pixels, ox + 12, oy + 12, 6, 4, 0xa3, 0x71, 0xf7);
  }
}

function drawBullet(pixels: Uint8ClampedArray, col: number, row: number, enemy: boolean): void {
  const ox = col * CELL + 14;
  const oy = row * CELL + (enemy ? 4 : 10);
  if (enemy) {
    fillRect(pixels, ox, oy, 4, 10, 0xff, 0x4d, 0x6d);
  } else {
    fillRect(pixels, ox, oy, 4, 6, 0xff, 0xd7, 0x00);
  }
}

function drawHeart(pixels: Uint8ClampedArray, col: number, row: number): void {
  const ox = col * CELL + 8;
  const oy = row * CELL + 10;
  fillRect(pixels, ox + 2, oy + 0, 4, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, ox + 10, oy + 0, 4, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, ox + 0, oy + 2, 16, 4, 0xff, 0x4d, 0x6d);
  fillRect(pixels, ox + 2, oy + 6, 12, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, ox + 4, oy + 8, 8, 2, 0xff, 0x4d, 0x6d);
  fillRect(pixels, ox + 6, oy + 10, 4, 2, 0xff, 0x4d, 0x6d);
}

/** Procedural Space Invaders atlas — no external image files required. */
export function createDemoAtlas(device: GPUDevice): DemoAtlas {
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
    player: regionFromCell(texture, 0, 0),
    invaderA: regionFromCell(texture, 1, 0),
    invaderAAlt: regionFromCell(texture, 2, 0),
    invaderB: regionFromCell(texture, 3, 0),
    invaderBAlt: regionFromCell(texture, 0, 1),
    bullet: regionFromCell(texture, 1, 1),
    enemyBullet: regionFromCell(texture, 2, 1),
    uiHeart: regionFromCell(texture, 3, 1),
  };
}
