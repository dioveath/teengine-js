import { MAX_TEXTURES } from "./Shaders.js";

type GpuTexture = { texture: GPUTexture; view: GPUTextureView };

const MAX_CACHED_BIND_GROUPS = 512;

export class GpuCache {
  private readonly textures = new Map<number, GpuTexture>();
  private readonly bindGroups = new Map<string, GPUBindGroup>();
  private nextId = 1;

  constructor(
    private readonly device: GPUDevice,
    private readonly layout: GPUBindGroupLayout,
    private readonly sampler: GPUSampler,
  ) {}

  uploadRgba(data: Uint8Array, width: number, height: number): number {
    const texture = this.device.createTexture({
      size: { width, height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture },
      data as unknown as GPUAllowSharedBufferSource,
      { bytesPerRow: width * 4 },
      { width, height },
    );
    return this.store(texture);
  }

  uploadImage(bitmap: ImageBitmap): number {
    const texture = this.device.createTexture({
      size: { width: bitmap.width, height: bitmap.height },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
      bitmap.width,
      bitmap.height,
    ]);
    return this.store(texture);
  }

  has(id: number): boolean {
    return this.textures.has(id);
  }

  disposeTexture(id: number): void {
    const entry = this.textures.get(id);
    if (!entry) return;
    entry.texture.destroy();
    this.textures.delete(id);
    for (const key of [...this.bindGroups.keys()]) {
      if (key.split(",").includes(String(id))) this.bindGroups.delete(key);
    }
  }

  bindGroup(ids: readonly number[]): GPUBindGroup {
    const key = ids.join(",");
    let group = this.bindGroups.get(key);
    if (!group) {
      if (this.bindGroups.size >= MAX_CACHED_BIND_GROUPS) this.bindGroups.clear();
      const views: GPUTextureView[] = [];
      for (const id of ids) {
        const entry = this.textures.get(id);
        if (!entry) throw new Error(`Unknown texture ${id} — upload it before drawing.`);
        views.push(entry.view);
      }
      group = this.device.createBindGroup({
        layout: this.layout,
        entries: [
          ...views.map((view) => ({ binding: 0, resource: view })),
          { binding: 1, resource: this.sampler },
        ],
      });
      this.bindGroups.set(key, group);
    }
    return group;
  }

  dispose(): void {
    for (const entry of this.textures.values()) entry.texture.destroy();
    this.textures.clear();
    this.bindGroups.clear();
  }

  private store(texture: GPUTexture): number {
    const id = this.nextId++;
    this.textures.set(id, { texture, view: texture.createView() });
    return id;
  }
}

export function createNearestSampler(device: GPUDevice): GPUSampler {
  return device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
}

export { MAX_TEXTURES };
