import { Color, Mat3, type Vec2 } from "../math/index.js";
import { Renderer } from "../gpu/Renderer.js";

/**
 * Canvas-style 2D graphics API backed by WebGPU.
 *
 * Coordinates use a top-left origin with +Y downward, matching the old
 * Canvas 2D code. Transforms are applied via a matrix stack.
 */
export class Graphics {
  private readonly renderer: Renderer;
  private readonly stack: Float32Array[] = [];
  private current = Mat3.create();
  private readonly scratch = { x: 0, y: 0 };

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.stack.push(Mat3.create());
  }

  beginFrame(clearColor: Color): void {
    this.renderer.beginFrame(clearColor);
  }

  endFrame(): void {
    this.renderer.endFrame();
  }

  save(): void {
    this.stack.push(new Float32Array(this.current));
  }

  restore(): void {
    const restored = this.stack.pop();
    if (!restored) {
      throw new Error("Graphics.restore() called without matching save().");
    }
    this.current = restored;
  }

  resetTransform(): void {
    this.current = Mat3.create();
  }

  translate(x: number, y: number): void {
    Mat3.translate(this.current, this.current, x, y);
  }

  rotate(radians: number): void {
    Mat3.rotate(this.current, this.current, radians);
  }

  scale(sx: number, sy: number): void {
    Mat3.scale(this.current, this.current, sx, sy);
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    const p0 = this.transformPoint(x, y);
    const p1 = this.transformPoint(x + width, y);
    const p2 = this.transformPoint(x + width, y + height);
    const p3 = this.transformPoint(x, y + height);
    this.renderer.fillQuad(
      p0.x,
      p0.y,
      p1.x,
      p1.y,
      p2.x,
      p2.y,
      p3.x,
      p3.y,
      color,
    );
  }

  fillCircle(x: number, y: number, radius: number, color: Color, segments = 32): void {
    const center = this.transformPoint(x, y);
    const edge = this.transformPoint(x + radius, y);
    const scaledRadius = Math.hypot(edge.x - center.x, edge.y - center.y);
    this.renderer.fillCircle(center.x, center.y, scaledRadius, color, segments);
  }

  strokeLine(x0: number, y0: number, x1: number, y1: number, width: number, color: Color): void {
    const a = this.transformPoint(x0, y0);
    const b = this.transformPoint(x1, y1);
    this.renderer.strokeLine(a.x, a.y, b.x, b.y, width, color);
  }

  get viewport(): { width: number; height: number } {
    return this.renderer.size;
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  private transformPoint(x: number, y: number): Vec2 {
    Mat3.transformPoint(this.scratch, this.current, x, y);
    return { x: this.scratch.x, y: this.scratch.y };
  }
}

export { Color };
