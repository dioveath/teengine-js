import { Color, Mat3 } from "../math/index.js";
import type { SpriteDrawCommand } from "../graphics/DrawQueue.js";
import { WebGPUContext } from "./WebGPUContext.js";
import {
  createSpritePipeline,
  createTextureBindGroup,
  type SpritePipeline,
} from "./spriteShaders.js";
import { VertexStore } from "./VertexStore.js";

const FLOATS_PER_VERTEX = 8;

export type SpriteRun = {
  kind: "sprite";
  texture: GPUTexture;
  firstVertex: number;
  count: number;
};

export class SpriteBatcher {
  private readonly gpu: WebGPUContext;
  private readonly pipeline: SpritePipeline;
  private readonly store: VertexStore;
  private readonly textureBindGroups = new Map<GPUTexture, GPUBindGroup>();
  private readonly scratch = { x: 0, y: 0 };

  private constructor(gpu: WebGPUContext, pipeline: SpritePipeline) {
    this.gpu = gpu;
    this.pipeline = pipeline;
    this.store = new VertexStore(gpu.device);
  }

  static create(gpu: WebGPUContext): SpriteBatcher {
    return new SpriteBatcher(gpu, createSpritePipeline(gpu.device, gpu.format));
  }

  begin(): void {
    this.store.clear();
  }

  pack(commands: SpriteDrawCommand[], viewProjection: Mat3): SpriteRun[] {
    if (commands.length === 0) return [];

    const runs: SpriteRun[] = [];
    let texture: GPUTexture | null = null;
    let firstVertex = this.store.vertexCount(FLOATS_PER_VERTEX);
    let count = 0;

    const flush = (): void => {
      if (!texture || count === 0) return;
      runs.push({ kind: "sprite", texture, firstVertex, count });
      firstVertex += count;
      count = 0;
    };

    for (const cmd of commands) {
      const tex = cmd.region.texture.texture;
      if (texture !== null && tex !== texture) flush();
      texture = tex;
      this.addSprite(cmd, viewProjection);
      count += 6;
    }
    flush();
    return runs;
  }

  upload(): void {
    this.store.upload();
  }

  encode(pass: GPURenderPassEncoder, run: SpriteRun): void {
    pass.setPipeline(this.pipeline.pipeline);
    pass.setVertexBuffer(0, this.store.gpuBuffer);
    pass.setBindGroup(0, this.getTextureBindGroup(run.texture));
    pass.draw(run.count, 1, run.firstVertex);
  }

  registerTexture(texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler): void {
    if (!this.textureBindGroups.has(texture)) {
      this.textureBindGroups.set(
        texture,
        createTextureBindGroup(this.gpu.device, this.pipeline.textureBindGroupLayout, view, sampler),
      );
    }
  }

  private addSprite(cmd: SpriteDrawCommand, viewProjection: Mat3): void {
    const { region, opts } = cmd;
    const [r, g, b, a] = Color.toVec4(opts.tint);
    const sx = opts.scaleX * (opts.flipX ? -1 : 1);
    const sy = opts.scaleY * (opts.flipY ? -1 : 1);
    const cos = Math.cos(opts.rotation);
    const sin = Math.sin(opts.rotation);

    const corners = [
      { lx: -opts.originX * sx, ly: -opts.originY * sy, u: region.u0, v: region.v0 },
      { lx: (region.width - opts.originX) * sx, ly: -opts.originY * sy, u: region.u1, v: region.v0 },
      { lx: (region.width - opts.originX) * sx, ly: (region.height - opts.originY) * sy, u: region.u1, v: region.v1 },
      { lx: -opts.originX * sx, ly: (region.height - opts.originY) * sy, u: region.u0, v: region.v1 },
    ];

    const clip = corners.map((c) => {
      Mat3.transformPoint(
        this.scratch,
        viewProjection,
        opts.x + c.lx * cos - c.ly * sin,
        opts.y + c.lx * sin + c.ly * cos,
      );
      return { x: this.scratch.x, y: this.scratch.y, u: c.u, v: c.v };
    });

    const push = (p: { x: number; y: number; u: number; v: number }) => {
      this.store.push(p.x, p.y, p.u, p.v, r, g, b, a);
    };
    push(clip[0]); push(clip[1]); push(clip[2]);
    push(clip[0]); push(clip[2]); push(clip[3]);
  }

  private getTextureBindGroup(texture: GPUTexture): GPUBindGroup {
    const bindGroup = this.textureBindGroups.get(texture);
    if (!bindGroup) {
      throw new Error("Texture not registered — call registerTexture() before drawing.");
    }
    return bindGroup;
  }
}
