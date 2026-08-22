import {
  Color,
  DRAW_SPRITE,
  Mat3,
  RECORD_FLOATS,
  R,
  type Camera2D,
  type FrameRenderer,
  type RenderQueue,
  type RenderStats,
  type TextureHandle,
} from "@teengine/core";
import { GpuCache, createNearestSampler } from "./GpuCache.js";
import { detectMaxTextures, MAX_TEXTURES } from "./Shaders.js";
import { Materials } from "./Shaders.js";
import { RingBuffer } from "./RingBuffer.js";
import { WebGPUContext } from "./WebGPUContext.js";

const SPRITE_STRIDE = 13;
const SHAPE_STRIDE = 9;

type Scratch = { f32: Float32Array; u32: Uint32Array };

function createScratch(records: number, stride: number): Scratch {
  const buffer = new ArrayBuffer(records * stride * 4);
  return { f32: new Float32Array(buffer), u32: new Uint32Array(buffer) };
}

function growScratch(prev: Scratch, records: number, stride: number): Scratch {
  const next = createScratch(Math.max(records, prev.f32.length / stride * 2), stride);
  new Uint8Array(next.f32.buffer).set(new Uint8Array(prev.f32.buffer, 0, prev.f32.length * 4));
  return next;
}

type Batch = {
  sprite: boolean;
  count: number;
  vertexOffset: number;
  rank: number;
  textures: number[];
};

export class WebGpuFrameRenderer implements FrameRenderer {
  readonly stats: RenderStats = { drawCalls: 0, instances: 0, textureBinds: 0, packMs: 0 };
  private readonly gpu: WebGPUContext;
  private readonly ring: RingBuffer;
  private readonly cache: GpuCache;
  private readonly materials: Materials;
  private globalsBindGroups: GPUBindGroup[] = [];
  private globalsGeneration = -1;
  private readonly batches: Batch[] = [];
  private spriteScratch = createScratch(1024, SPRITE_STRIDE);
  private shapeScratch = createScratch(1024, SHAPE_STRIDE);
  private readonly viewProjection = Mat3.create();
  private readonly uniforms = new Float32Array(12);
  private readonly viewOffsets: number[] = [];
  private width = 1;
  private height = 1;
  private clearColor: Color = Color.hex("#0d1117");

  readonly maxTextures: number;

  private constructor(gpu: WebGPUContext, maxTextures: number) {
    this.gpu = gpu;
    this.ring = new RingBuffer(gpu.device);
    this.maxTextures = maxTextures;
    this.materials = new Materials(gpu.device, gpu.format, this.maxTextures);
    this.cache = new GpuCache(
      gpu.device,
      this.materials.sprites.pipeline.getBindGroupLayout(1),
      createNearestSampler(gpu.device),
    );
  }

  static async create(canvas: HTMLCanvasElement): Promise<WebGpuFrameRenderer> {
    const gpu = await WebGPUContext.create({ canvas });
    return new WebGpuFrameRenderer(gpu, await detectMaxTextures(gpu.device));
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

  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle {
    return { id: this.cache.uploadRgba(data, width, height) };
  }

  uploadImage(bitmap: ImageBitmap): TextureHandle {
    return { id: this.cache.uploadImage(bitmap) };
  }

  dispose(): void {
    this.cache.dispose();
    this.ring.destroy();
  }

  render(
    width: number,
    height: number,
    clearColor: Color,
    cameras: readonly Camera2D[],
    queue: RenderQueue,
  ): void {
    const packStart = performance.now();
    this.clearColor = clearColor;
    this.ring.begin();

    for (let rank = 0; rank < cameras.length; rank++) {
      cameras[rank].getViewProjection(width, height, this.viewProjection);
      Mat3.writeUniform(this.viewProjection, this.uniforms, 0);
      const offset = this.ring.alloc(48);
      this.viewOffsets.push(offset);
      this.ring.write(this.uniforms, 12, offset);
    }
    this.ensureGlobalsBindGroups();

    if (this.spriteScratch.f32.length / SPRITE_STRIDE < queue.count + MAX_TEXTURES) {
      this.spriteScratch = growScratch(this.spriteScratch, queue.count + MAX_TEXTURES, SPRITE_STRIDE);
    }
    if (this.shapeScratch.f32.length / SHAPE_STRIDE < queue.count) {
      this.shapeScratch = growScratch(this.shapeScratch, queue.count, SHAPE_STRIDE);
    }

    this.batches.length = 0;
    let rank = -1;
    let slots: number[] = [];
    let spriteBase = 0;
    let shapeBase = 0;
    let spriteCount = 0;
    let shapeCount = 0;

    const closeBatches = (): void => {
      if (spriteCount > 0) {
        this.batches.push({
          sprite: true,
          count: spriteCount,
          vertexOffset: spriteBase * SPRITE_STRIDE * 4,
          rank,
          textures: slots.slice(),
        });
        spriteBase += spriteCount;
        spriteCount = 0;
      }
      if (shapeCount > 0) {
        this.batches.push({
          sprite: false,
          count: shapeCount,
          vertexOffset: shapeBase * SHAPE_STRIDE * 4,
          rank,
          textures: [],
        });
        shapeBase += shapeCount;
        shapeCount = 0;
      }
    };

    for (let k = 0; k < queue.count; k++) {
      const record = queue.order[k];
      if (queue.ranks[record] !== rank) {
        closeBatches();
        rank = queue.ranks[record];
        slots = [];
      }
      const i = record * RECORD_FLOATS;
      const d = queue.data;
      if (d[i + R.kind] === DRAW_SPRITE) {
        let slot = slots.indexOf(d[i + R.texId]);
        if (slot < 0) {
          if (slots.length >= this.maxTextures) {
            closeBatches();
            slots = [];
            slot = 0;
          } else {
            slot = slots.length;
          }
          slots.push(d[i + R.texId]);
        }
        this.writeSprite(d, i, spriteBase + spriteCount, slot);
        spriteCount += 1;
      } else {
        this.writeShape(d, i, shapeBase + shapeCount);
        shapeCount += 1;
      }
    }
    closeBatches();

    if (spriteBase + spriteCount > 0) {
      const words = (spriteBase + spriteCount) * SPRITE_STRIDE;
      this.ring.write(this.spriteScratch.f32, words, this.ring.alloc(words * 4));
    }
    if (shapeBase + shapeCount > 0) {
      const words = (shapeBase + shapeCount) * SHAPE_STRIDE;
      this.ring.write(this.shapeScratch.f32, words, this.ring.alloc(words * 4));
    }

    this.stats.packMs = performance.now() - packStart;
    this.stats.instances = spriteBase + spriteCount + shapeBase + shapeCount;
    this.stats.drawCalls = this.encode();
  }

  private ensureGlobalsBindGroups(): void {
    if (!this.ring.buffer || this.globalsGeneration === this.ring.generation) return;
    this.globalsBindGroups = this.viewOffsets.map((offset) =>
      this.gpu.device.createBindGroup({
        layout: this.materials.globalsLayout,
        entries: [{ binding: 0, resource: { buffer: this.ring.buffer!, offset, size: 48 } }],
      }),
    );
    this.globalsGeneration = this.ring.generation;
  }

  private writeSprite(d: Float32Array, i: number, out: number, slot: number): void {
    const f = this.spriteScratch.f32;
    const base = out * SPRITE_STRIDE;
    f[base] = d[i + R.p0x];
    f[base + 1] = d[i + R.p0y];
    f[base + 2] = d[i + R.width] * d[i + R.scaleX];
    f[base + 3] = d[i + R.height] * d[i + R.scaleY];
    f[base + 4] = d[i + R.originX];
    f[base + 5] = d[i + R.originY];
    f[base + 6] = d[i + R.rotation];
    f[base + 7] = slot;
    f[base + 8] = d[i + R.u0];
    f[base + 9] = d[i + R.v0];
    f[base + 10] = d[i + R.u1];
    f[base + 11] = d[i + R.v1];
    this.spriteScratch.u32[base + 12] = rgbaToU32(
      d[i + R.color],
      d[i + R.color + 1],
      d[i + R.color + 2],
      d[i + R.color + 3],
    );
  }

  private writeShape(d: Float32Array, i: number, out: number): void {
    const f = this.shapeScratch.f32;
    const base = out * SHAPE_STRIDE;
    f[base] = d[i + R.p0x];
    f[base + 1] = d[i + R.p0y];
    f[base + 2] = d[i + 3];
    f[base + 3] = d[i + 4];
    f[base + 4] = d[i + 5];
    f[base + 5] = d[i + 6];
    f[base + 6] = d[i + R.kind];
    this.shapeScratch.u32[base + 8] = rgbaToU32(
      d[i + R.color],
      d[i + R.color + 1],
      d[i + R.color + 2],
      d[i + R.color + 3],
    );
  }

  private encode(): number {
    if (this.batches.length === 0 || !this.ring.buffer) return 0;



    const encoder = this.gpu.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.gpu.getCurrentTextureView(),
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

    let lastPipeline: GPURenderPipeline | null = null;
    let lastRank = -1;
    let lastTextures: number[] | null = null;
    let textureBinds = 0;

    for (const batch of this.batches) {
      const material = batch.sprite ? this.materials.sprites : this.materials.shapes;
      if (material.pipeline !== lastPipeline) {
        pass.setPipeline(material.pipeline);
        lastPipeline = material.pipeline;
      }
      pass.setVertexBuffer(0, this.ring.buffer, batch.vertexOffset);
      if (batch.rank !== lastRank) {
        pass.setBindGroup(0, this.globalsBindGroups[batch.rank]);
        lastRank = batch.rank;
      }
      if (!sameTextures(batch.textures, lastTextures)) {
        pass.setBindGroup(1, this.cache.bindGroup(batch.textures));
        lastTextures = batch.textures;
        textureBinds += 1;
      }
      pass.draw(4, batch.count);
    }

    pass.end();
    this.gpu.device.queue.submit([encoder.finish()]);
    this.stats.textureBinds = textureBinds;
    return this.batches.length;
  }
}

export function rgbaToU32(r: number, g: number, b: number, a: number): number {
  return (
    ((Math.min(255, a * 255) | 0) << 24) |
    ((Math.min(255, b * 255) | 0) << 16) |
    ((Math.min(255, g * 255) | 0) << 8) |
    (Math.min(255, r * 255) | 0)
  );
}

function sameTextures(a: number[] | null, b: number[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export async function createWebGpuRenderer(canvas: HTMLCanvasElement): Promise<WebGpuFrameRenderer> {
  return WebGpuFrameRenderer.create(canvas);
}
