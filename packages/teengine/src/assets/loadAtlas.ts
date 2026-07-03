import type { Engine } from "../engine/Engine.js";
import type { AtlasRegion, GpuTexture } from "./Atlas.js";

/** JSON atlas descriptor (Aseprite / TexturePacker-style minimal subset). */
export type AtlasJson = {
  meta: {
    image: string;
    size: { w: number; h: number };
  };
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number };
    }
  >;
};

export type LoadedAtlas = Record<string, AtlasRegion>;

/**
 * Load a texture atlas from JSON + image URL.
 * Returns named regions ready for drawSprite().
 */
export async function loadAtlasFromJson(
  engine: Engine,
  jsonUrl: string,
  imageUrl?: string,
): Promise<LoadedAtlas> {
  const device = engine.getGpuDevice();
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to load atlas JSON: ${jsonUrl}`);
  }
  const data = (await response.json()) as AtlasJson;
  const imgSrc = imageUrl ?? jsonUrl.replace(/\.json$/i, ".png");

  const image = await loadImage(imgSrc);
  const texture = uploadTexture(device, image);

  const { w: atlasW, h: atlasH } = data.meta.size;
  const regions: LoadedAtlas = {};

  for (const [name, frame] of Object.entries(data.frames)) {
    const { x, y, w, h } = frame.frame;
    regions[name] = {
      texture,
      u0: x / atlasW,
      v0: y / atlasH,
      u1: (x + w) / atlasW,
      v1: (y + h) / atlasH,
      width: w,
      height: h,
    };
  }

  return regions;
}

function loadImage(src: string): Promise<ImageBitmap> {
  return fetch(src)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load atlas image: ${src}`);
      return r.blob();
    })
    .then((blob) => createImageBitmap(blob));
}

function uploadTexture(device: GPUDevice, bitmap: ImageBitmap): GpuTexture {
  const texture = device.createTexture({
    size: { width: bitmap.width, height: bitmap.height },
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
    bitmap.width,
    bitmap.height,
  ]);

  const view = texture.createView();
  const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
  });

  return {
    texture,
    view,
    sampler,
    width: bitmap.width,
    height: bitmap.height,
  };
}
