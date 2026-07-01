import { Color, Mat3 } from "../math/index.js";
import type { DebugLineCommand, DebugRectCommand } from "../graphics/DrawQueue.js";
import { WebGPUContext } from "./WebGPUContext.js";
import { createShapePipeline, writeMat3Uniform, type ShapePipeline } from "./shapeShaders.js";

const MAX_VERTICES = 65_536;
const FLOATS_PER_VERTEX = 6;

export class DebugBatcher {
  private readonly gpu: WebGPUContext;
  private readonly pipeline: ShapePipeline;
  private readonly vertexBuffer: GPUBuffer;
  private vertices: number[] = [];

  private constructor(gpu: WebGPUContext, pipeline: ShapePipeline, vertexBuffer: GPUBuffer) {
    this.gpu = gpu;
    this.pipeline = pipeline;
    this.vertexBuffer = vertexBuffer;
  }

  static create(gpu: WebGPUContext): DebugBatcher {
    const pipeline = createShapePipeline(gpu.device, gpu.format);
    const vertexBuffer = gpu.device.createBuffer({
      size: MAX_VERTICES * FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    return new DebugBatcher(gpu, pipeline, vertexBuffer);
  }

  clear(): void {
    this.vertices = [];
  }

  addRect(cmd: DebugRectCommand): void {
    const { x, y, width, height, color } = cmd;
    this.pushQuad(x, y, x + width, y, x + width, y + height, x, y + height, color);
  }

  addLine(cmd: DebugLineCommand): void {
    const { x0, y0, x1, y1, width, color } = cmd;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const nx = (-dy / len) * (width * 0.5);
    const ny = (dx / len) * (width * 0.5);
    this.pushQuad(
      x0 + nx, y0 + ny,
      x1 + nx, y1 + ny,
      x1 - nx, y1 - ny,
      x0 - nx, y0 - ny,
      color,
    );
  }

  draw(pass: GPURenderPassEncoder, viewProjection: Mat3): void {
    if (this.vertices.length === 0) return;

    writeMat3Uniform(this.gpu.device, this.pipeline.uniformBuffer, viewProjection);
    const data = new Float32Array(this.vertices);
    this.gpu.device.queue.writeBuffer(this.vertexBuffer, 0, data);

    pass.setPipeline(this.pipeline.pipeline);
    pass.setBindGroup(0, this.pipeline.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(data.length / FLOATS_PER_VERTEX);
  }

  private pushQuad(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    color: Color,
  ): void {
    const [r, g, b, a] = Color.toVec4(color);
    this.vertices.push(
      x0, y0, r, g, b, a,
      x1, y1, r, g, b, a,
      x2, y2, r, g, b, a,
      x0, y0, r, g, b, a,
      x2, y2, r, g, b, a,
      x3, y3, r, g, b, a,
    );
    if (this.vertices.length / FLOATS_PER_VERTEX > MAX_VERTICES) {
      throw new Error("Debug vertex buffer overflow.");
    }
  }
}
