import type { Engine } from "../engine/Engine.js";
import type { GpuTexture } from "./Atlas.js";

/** Upload RGBA pixel data to a GPU texture (procedural art, runtime-generated sprites). */
export function uploadRgbaTexture(
  engine: Engine,
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): GpuTexture {
  const device = engine.getGpuDevice();
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
