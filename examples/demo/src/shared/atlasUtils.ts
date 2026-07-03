import type { AtlasRegion, GpuTexture } from "teengine";

export const CELL = 32;

export function createTextureFromRgba(
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

export function regionFromCell(
  texture: GpuTexture,
  col: number,
  row: number,
  cols: number,
  rows: number,
): AtlasRegion {
  const atlasW = CELL * cols;
  const atlasH = CELL * rows;
  const x = col * CELL;
  const y = row * CELL;
  return {
    texture,
    u0: x / atlasW,
    v0: y / atlasH,
    u1: (x + CELL) / atlasW,
    v1: (y + CELL) / atlasH,
    width: CELL,
    height: CELL,
  };
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
