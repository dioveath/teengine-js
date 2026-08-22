import {
  Color,
  Mat3,
  type ShapeCircleCommand,
  type ShapeLineCommand,
  type ShapeRectCommand,
} from "@teengine/core";
import { WebGPUContext } from "./WebGPUContext.js";
import { createShapePipeline, type ShapePipeline } from "./shapeShaders.js";
import { VertexStore } from "./VertexStore.js";

const FLOATS_PER_VERTEX = 6;

type ShapeCommand = ShapeRectCommand | ShapeCircleCommand | ShapeLineCommand;

export type ShapeRun = {
  kind: "shape";
  firstVertex: number;
  count: number;
};

export class ShapeBatcher {
  private readonly pipeline: ShapePipeline;
  private readonly store: VertexStore;
  private readonly scratch = { x: 0, y: 0 };
  private viewProjection!: Mat3;

  private constructor(gpu: WebGPUContext, pipeline: ShapePipeline) {
    this.pipeline = pipeline;
    this.store = new VertexStore(gpu.device);
  }

  static create(gpu: WebGPUContext): ShapeBatcher {
    return new ShapeBatcher(gpu, createShapePipeline(gpu.device, gpu.format));
  }

  begin(): void {
    this.store.clear();
  }

  pack(commands: ShapeCommand[], viewProjection: Mat3): ShapeRun[] {
    if (commands.length === 0) return [];

    this.viewProjection = viewProjection;
    const firstVertex = this.store.vertexCount(FLOATS_PER_VERTEX);

    for (const shape of commands) {
      if (shape.kind === "shapeRect") this.addRect(shape);
      else if (shape.kind === "shapeCircle") this.addCircle(shape);
      else this.addLine(shape);
    }

    const count = this.store.vertexCount(FLOATS_PER_VERTEX) - firstVertex;
    return count > 0 ? [{ kind: "shape", firstVertex, count }] : [];
  }

  upload(): void {
    this.store.upload();
  }

  encode(pass: GPURenderPassEncoder, run: ShapeRun): void {
    pass.setPipeline(this.pipeline.pipeline);
    pass.setVertexBuffer(0, this.store.gpuBuffer);
    pass.draw(run.count, 1, run.firstVertex);
  }

  private addRect(cmd: ShapeRectCommand): void {
    const { x, y, width, height, color } = cmd;
    this.pushQuad(x, y, x + width, y, x + width, y + height, x, y + height, color);
  }

  private addCircle(cmd: ShapeCircleCommand): void {
    const { x, y, radius, color, segments } = cmd;
    const [r, g, b, a] = Color.toVec4(color);

    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2;
      const t1 = ((i + 1) / segments) * Math.PI * 2;
      this.vertex(x, y, r, g, b, a);
      this.vertex(x + Math.cos(t0) * radius, y + Math.sin(t0) * radius, r, g, b, a);
      this.vertex(x + Math.cos(t1) * radius, y + Math.sin(t1) * radius, r, g, b, a);
    }
  }

  private addLine(cmd: ShapeLineCommand): void {
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

  private pushQuad(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    color: Color,
  ): void {
    const [r, g, b, a] = Color.toVec4(color);
    this.vertex(x0, y0, r, g, b, a);
    this.vertex(x1, y1, r, g, b, a);
    this.vertex(x2, y2, r, g, b, a);
    this.vertex(x0, y0, r, g, b, a);
    this.vertex(x2, y2, r, g, b, a);
    this.vertex(x3, y3, r, g, b, a);
  }

  private vertex(x: number, y: number, r: number, g: number, b: number, a: number): void {
    Mat3.transformPoint(this.scratch, this.viewProjection, x, y);
    this.store.push(this.scratch.x, this.scratch.y, r, g, b, a);
  }
}
