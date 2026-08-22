import {
  Color,
  Mat3,
  type DrawCommand,
  type FrameRenderer,
  type LayerConfig,
  type ShapeCircleCommand,
  type ShapeLineCommand,
  type ShapeRectCommand,
  type SpriteDrawCommand,
  type TextureHandle,
} from "@teengine/core";
import { ShapeBatcher, type ShapeRun } from "./ShapeBatcher.js";
import { SpriteBatcher, type SpriteRun } from "./SpriteBatcher.js";
import { WebGPUContext } from "./WebGPUContext.js";

type DrawRun = SpriteRun | ShapeRun;

type GpuTexture = {
  texture: GPUTexture;
  view: GPUTextureView;
  sampler: GPUSampler;
  width: number;
  height: number;
};

export class WebGpuFrameRenderer implements FrameRenderer {
  private readonly gpu: WebGPUContext;
  private readonly spriteBatcher: SpriteBatcher;
  private readonly shapeBatcher: ShapeBatcher;
  private readonly textures = new Map<number, GpuTexture>();
  private readonly viewProjection = Mat3.create();
  private width = 1;
  private height = 1;
  private clearColor: Color = Color.hex("#0d1117");
  private nextTexture = 1;

  private constructor(gpu: WebGPUContext, sprites: SpriteBatcher, shapes: ShapeBatcher) {
    this.gpu = gpu;
    this.spriteBatcher = sprites;
    this.shapeBatcher = shapes;
  }

  static async create(canvas: HTMLCanvasElement): Promise<WebGpuFrameRenderer> {
    const gpu = await WebGPUContext.create({ canvas });
    return new WebGpuFrameRenderer(gpu, SpriteBatcher.create(gpu), ShapeBatcher.create(gpu));
  }

  get canvas(): HTMLCanvasElement {
    return this.gpu.canvas;
  }

  get viewport(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  resizeToDisplaySize(): { width: number; height: number } {
    const size = this.gpu.resizeToDisplaySize();
    this.resize(size.width, size.height);
    return size;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  beginFrame(clearColor: Color): void {
    this.clearColor = clearColor;
  }

  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle {
    const texture = this.gpu.device.createTexture({
      size: { width, height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.gpu.device.queue.writeTexture(
      { texture },
      data as unknown as GPUAllowSharedBufferSource,
      { bytesPerRow: width * 4 },
      { width, height },
    );
    return this.store(texture, width, height);
  }

  uploadImage(bitmap: ImageBitmap): TextureHandle {
    const texture = this.gpu.device.createTexture({
      size: { width: bitmap.width, height: bitmap.height },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.gpu.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
      bitmap.width,
      bitmap.height,
    ]);
    return this.store(texture, bitmap.width, bitmap.height);
  }

  prepareSprite(handle: TextureHandle): void {
    const gpu = this.textures.get(handle.id);
    if (!gpu) throw new Error(`Unknown texture ${handle.id}`);
    this.spriteBatcher.registerTexture(gpu.texture, gpu.view, gpu.sampler);
  }

  endFrame(
    layerOrder: readonly string[],
    grouped: Map<string, DrawCommand[]>,
    getLayer: (name: string) => LayerConfig,
  ): void {
    this.spriteBatcher.begin();
    this.shapeBatcher.begin();
    const draws: DrawRun[] = [];

    for (const layerName of layerOrder) {
      const commands = grouped.get(layerName);
      if (!commands || commands.length === 0) continue;
      this.packLayer(getLayer(layerName), commands, draws);
    }

    this.spriteBatcher.upload();
    this.shapeBatcher.upload();

    const view = this.gpu.getCurrentTextureView();
    const encoder = this.gpu.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: {
            r: this.clearColor.r,
            g: this.clearColor.g,
            b: this.clearColor.b,
            a: this.clearColor.a,
          },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    for (const draw of draws) {
      if (draw.kind === "sprite") this.spriteBatcher.encode(pass, draw);
      else this.shapeBatcher.encode(pass, draw);
    }

    pass.end();
    this.gpu.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    for (const gpu of this.textures.values()) gpu.texture.destroy();
    this.textures.clear();
  }

  private store(texture: GPUTexture, width: number, height: number): TextureHandle {
    const view = texture.createView();
    const sampler = this.gpu.device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
    const id = this.nextTexture++;
    this.textures.set(id, { texture, view, sampler, width, height });
    return { id };
  }

  private packLayer(layer: LayerConfig, commands: DrawCommand[], draws: DrawRun[]): void {
    layer.camera.getViewProjection(this.width, this.height, this.viewProjection);

    if (layer.sort !== "none") {
      commands.sort(
        (a, b) => (a.kind === "sprite" ? a.opts.z : a.z) - (b.kind === "sprite" ? b.opts.z : b.z),
      );
    }

    let i = 0;
    while (i < commands.length) {
      const spriteRun = commands[i].kind === "sprite";
      const start = i;
      i += 1;
      while (i < commands.length && (commands[i].kind === "sprite") === spriteRun) i += 1;
      const batch = commands.slice(start, i);
      if (spriteRun) {
        draws.push(
          ...this.spriteBatcher.pack(
            batch as SpriteDrawCommand[],
            this.viewProjection,
            this.textures,
          ),
        );
      } else {
        draws.push(
          ...this.shapeBatcher.pack(
            batch as Array<ShapeRectCommand | ShapeCircleCommand | ShapeLineCommand>,
            this.viewProjection,
          ),
        );
      }
    }
  }
}

export async function createWebGpuRenderer(canvas: HTMLCanvasElement): Promise<WebGpuFrameRenderer> {
  return WebGpuFrameRenderer.create(canvas);
}
