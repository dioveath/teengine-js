import type { GpuTexture } from "./Atlas.js";

export async function createTextureFromImageBitmap(
  device: GPUDevice,
  bitmap: ImageBitmap,
): Promise<GpuTexture> {
  const texture = device.createTexture({
    size: { width: bitmap.width, height: bitmap.height },
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture },
    { width: bitmap.width, height: bitmap.height },
  );

  const view = texture.createView();
  const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  return {
    texture,
    view,
    sampler,
    width: bitmap.width,
    height: bitmap.height,
  };
}

export function createTextureFromRgba(
  device: GPUDevice,
  pixels: Uint8Array | Uint8ClampedArray,
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
  const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
  });

  return { texture, view, sampler, width, height };
}
