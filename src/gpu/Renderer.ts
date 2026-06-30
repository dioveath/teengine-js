import { Color, Mat3 } from "../math/index.js";
import { WebGPUContext } from "./WebGPUContext.js";
import {
  createShapePipeline,
  writeProjectionMatrix,
  type GpuPipelineBundle,
} from "./shaders.js";

const MAX_VERTICES = 65_536;
const FLOATS_PER_VERTEX = 6;

type BatchVertex = number;

export class Renderer {
  private readonly gpu: WebGPUContext;
  private readonly pipelineBundle: GpuPipelineBundle;
  private readonly vertexBuffer: GPUBuffer;
  private readonly projection = Mat3.create();
  private vertices: BatchVertex[] = [];
  private width = 1;
  private height = 1;

  private constructor(gpu: WebGPUContext, pipelineBundle: GpuPipelineBundle, vertexBuffer: GPUBuffer) {
    this.gpu = gpu;
    this.pipelineBundle = pipelineBundle;
    this.vertexBuffer = vertexBuffer;
  }

  static async create(gpu: WebGPUContext): Promise<Renderer> {
    const pipelineBundle = createShapePipeline(gpu.device, gpu.format);
    const vertexBuffer = gpu.device.createBuffer({
      size: MAX_VERTICES * FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    return new Renderer(gpu, pipelineBundle, vertexBuffer);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    Mat3.ortho(0, width, height, 0, this.projection);
    writeProjectionMatrix(
      this.gpu.device,
      this.pipelineBundle.uniformBuffer,
      this.projection,
    );
  }

  beginFrame(clearColor: Color): void {
    this.vertices = [];
    this.clearColor = clearColor;
  }

  private clearColor: Color = Color.hex("#0d1117");

  endFrame(): void {
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

    if (this.vertices.length > 0) {
      const data = new Float32Array(this.vertices);
      this.gpu.device.queue.writeBuffer(this.vertexBuffer, 0, data);

      pass.setPipeline(this.pipelineBundle.pipeline);
      pass.setBindGroup(0, this.pipelineBundle.bindGroup);
      pass.setVertexBuffer(0, this.vertexBuffer);
      pass.draw(data.length / FLOATS_PER_VERTEX);
    }

    pass.end();
    this.gpu.device.queue.submit([encoder.finish()]);
  }

  /** Push a colored axis-aligned rectangle in pixel space (top-left origin). */
  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    this.pushQuad(x, y, x + width, y, x + width, y + height, x, y + height, color);
  }

  /** Push a colored quad from four corner points. */
  fillQuad(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    color: Color,
  ): void {
    this.pushQuad(x0, y0, x1, y1, x2, y2, x3, y3, color);
  }

  /** Push a colored circle approximated with a triangle fan. */
  fillCircle(cx: number, cy: number, radius: number, color: Color, segments = 32): void {
    const [r, g, b, a] = Color.toVec4(color);
    const base = this.vertices.length / FLOATS_PER_VERTEX;

    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2;
      const t1 = ((i + 1) / segments) * Math.PI * 2;
      this.vertices.push(cx, cy, r, g, b, a);
      this.vertices.push(
        cx + Math.cos(t0) * radius,
        cy + Math.sin(t0) * radius,
        r,
        g,
        b,
        a,
      );
      this.vertices.push(
        cx + Math.cos(t1) * radius,
        cy + Math.sin(t1) * radius,
        r,
        g,
        b,
        a,
      );
    }

    if (this.vertices.length / FLOATS_PER_VERTEX - base > MAX_VERTICES) {
      throw new Error("Vertex buffer overflow — reduce draw calls or raise MAX_VERTICES.");
    }
  }

  /** Push a line as a thin quad. */
  strokeLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    color: Color,
  ): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const nx = (-dy / len) * (width * 0.5);
    const ny = (dx / len) * (width * 0.5);

    this.pushQuad(
      x0 + nx,
      y0 + ny,
      x1 + nx,
      y1 + ny,
      x1 - nx,
      y1 - ny,
      x0 - nx,
      y0 - ny,
      color,
    );
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private pushQuad(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    color: Color,
  ): void {
    const [r, g, b, a] = Color.toVec4(color);
    this.vertices.push(
      x0,
      y0,
      r,
      g,
      b,
      a,
      x1,
      y1,
      r,
      g,
      b,
      a,
      x2,
      y2,
      r,
      g,
      b,
      a,
      x0,
      y0,
      r,
      g,
      b,
      a,
      x2,
      y2,
      r,
      g,
      b,
      a,
      x3,
      y3,
      r,
      g,
      b,
      a,
    );

    if (this.vertices.length / FLOATS_PER_VERTEX > MAX_VERTICES) {
      throw new Error("Vertex buffer overflow — reduce draw calls or raise MAX_VERTICES.");
    }
  }
}
