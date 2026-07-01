import { Color } from "../math/index.js";
import type { SpriteDrawCommand } from "../graphics/DrawQueue.js";
import type { Mat3 } from "../math/index.js";
import { WebGPUContext } from "./WebGPUContext.js";
import {
  createSpritePipeline,
  createTextureBindGroup,
  writeMat3Uniform,
  type SpritePipeline,
} from "./spriteShaders.js";

const MAX_SPRITE_VERTICES = 65_536;
const FLOATS_PER_VERTEX = 8;

type TextureKey = GPUTexture;

export class SpriteBatcher {
  private readonly gpu: WebGPUContext;
  private readonly pipeline: SpritePipeline;
  private readonly vertexBuffer: GPUBuffer;
  private readonly textureBindGroups = new Map<TextureKey, GPUBindGroup>();
  private vertices: number[] = [];

  private constructor(gpu: WebGPUContext, pipeline: SpritePipeline, vertexBuffer: GPUBuffer) {
    this.gpu = gpu;
    this.pipeline = pipeline;
    this.vertexBuffer = vertexBuffer;
  }

  static create(gpu: WebGPUContext): SpriteBatcher {
    const pipeline = createSpritePipeline(gpu.device, gpu.format);
    const vertexBuffer = gpu.device.createBuffer({
      size: MAX_SPRITE_VERTICES * FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    return new SpriteBatcher(gpu, pipeline, vertexBuffer);
  }

  clear(): void {
    this.vertices = [];
  }

  /** Draw sprites grouped by texture to minimize bind-group changes. */
  drawSorted(pass: GPURenderPassEncoder, commands: SpriteDrawCommand[], viewProjection: Mat3): void {
    if (commands.length === 0) return;

    writeMat3Uniform(this.gpu.device, this.pipeline.uniformBuffer, viewProjection);
    pass.setPipeline(this.pipeline.pipeline);
    pass.setBindGroup(0, this.pipeline.uniformBindGroup);

    let currentTexture: GPUTexture | null = null;
    this.vertices = [];

    const flush = (): void => {
      if (this.vertices.length === 0 || !currentTexture) return;
      const bindGroup = this.getTextureBindGroup(currentTexture);
      const data = new Float32Array(this.vertices);
      this.gpu.device.queue.writeBuffer(this.vertexBuffer, 0, data);
      pass.setBindGroup(1, bindGroup);
      pass.setVertexBuffer(0, this.vertexBuffer);
      pass.draw(data.length / FLOATS_PER_VERTEX);
      this.vertices = [];
    };

    for (const cmd of commands) {
      const tex = cmd.region.texture.texture;
      if (currentTexture !== null && tex !== currentTexture) {
        flush();
      }
      currentTexture = tex;
      this.addSpriteToBuffer(cmd);
    }
    flush();
  }

  private addSpriteToBuffer(cmd: SpriteDrawCommand): void {
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

    const world = corners.map((c) => ({
      x: opts.x + c.lx * cos - c.ly * sin,
      y: opts.y + c.lx * sin + c.ly * cos,
      u: c.u,
      v: c.v,
    }));

    this.pushSpriteQuad(world[0], world[1], world[2], world[3], r, g, b, a);
  }

  private getTextureBindGroup(texture: GPUTexture): GPUBindGroup {
    const bindGroup = this.textureBindGroups.get(texture);
    if (!bindGroup) {
      throw new Error("Texture not registered — call registerTexture() before drawing.");
    }
    return bindGroup;
  }

  /** Register bind group using the atlas sampler (call once per atlas texture). */
  registerTexture(texture: GPUTexture, view: GPUTextureView, sampler: GPUSampler): void {
    if (!this.textureBindGroups.has(texture)) {
      this.textureBindGroups.set(
        texture,
        createTextureBindGroup(this.gpu.device, this.pipeline.textureBindGroupLayout, view, sampler),
      );
    }
  }

  private pushSpriteQuad(
    a0: { x: number; y: number; u: number; v: number },
    a1: { x: number; y: number; u: number; v: number },
    a2: { x: number; y: number; u: number; v: number },
    a3: { x: number; y: number; u: number; v: number },
    r: number, g: number, b: number, a: number,
  ): void {
    const push = (p: { x: number; y: number; u: number; v: number }) => {
      this.vertices.push(p.x, p.y, p.u, p.v, r, g, b, a);
    };
    push(a0); push(a1); push(a2);
    push(a0); push(a2); push(a3);

    if (this.vertices.length / FLOATS_PER_VERTEX > MAX_SPRITE_VERTICES) {
      throw new Error("Sprite vertex buffer overflow.");
    }
  }
}
