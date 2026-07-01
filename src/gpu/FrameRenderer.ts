import { Color, Mat3 } from "../math/index.js";
import type {
  DrawCommand,
  ShapeCircleCommand,
  ShapeLineCommand,
  ShapeRectCommand,
  SpriteDrawCommand,
} from "../graphics/DrawQueue.js";
import type { LayerConfig } from "../graphics/LayerRegistry.js";
import { WebGPUContext } from "./WebGPUContext.js";
import { ShapeBatcher } from "./ShapeBatcher.js";
import { SpriteBatcher } from "./SpriteBatcher.js";

export class FrameRenderer {
  readonly spriteBatcher: SpriteBatcher;
  readonly shapeBatcher: ShapeBatcher;

  private readonly gpu: WebGPUContext;
  private readonly viewProjection = Mat3.create();
  private width = 1;
  private height = 1;
  private clearColor: Color = Color.hex("#0d1117");

  private constructor(gpu: WebGPUContext, spriteBatcher: SpriteBatcher, shapeBatcher: ShapeBatcher) {
    this.gpu = gpu;
    this.spriteBatcher = spriteBatcher;
    this.shapeBatcher = shapeBatcher;
  }

  static async create(gpu: WebGPUContext): Promise<FrameRenderer> {
    return new FrameRenderer(
      gpu,
      SpriteBatcher.create(gpu),
      ShapeBatcher.create(gpu),
    );
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  beginFrame(clearColor: Color): void {
    this.clearColor = clearColor;
  }

  endFrame(
    layerOrder: readonly string[],
    grouped: Map<string, DrawCommand[]>,
    getLayer: (name: string) => LayerConfig,
  ): void {
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

    for (const layerName of layerOrder) {
      const commands = grouped.get(layerName);
      if (!commands || commands.length === 0) continue;
      this.flushLayer(pass, getLayer(layerName), commands);
    }

    pass.end();
    this.gpu.device.queue.submit([encoder.finish()]);
  }

  private flushLayer(
    pass: GPURenderPassEncoder,
    layer: LayerConfig,
    commands: DrawCommand[],
  ): void {
    layer.camera.getViewProjection(this.width, this.height, this.viewProjection);

    const sprites: SpriteDrawCommand[] = [];
    const shapes: Array<ShapeRectCommand | ShapeCircleCommand | ShapeLineCommand> = [];

    for (const cmd of commands) {
      if (cmd.kind === "sprite") {
        sprites.push(cmd);
      } else {
        shapes.push(cmd);
      }
    }

    this.sortSprites(sprites, layer.sort);
    shapes.sort((a, b) => a.z - b.z);

    this.spriteBatcher.drawSorted(pass, sprites, this.viewProjection);

    this.shapeBatcher.clear();
    for (const shape of shapes) {
      if (shape.kind === "shapeRect") {
        this.shapeBatcher.addRect(shape);
      } else if (shape.kind === "shapeCircle") {
        this.shapeBatcher.addCircle(shape);
      } else if (shape.kind === "shapeLine") {
        this.shapeBatcher.addLine(shape);
      }
    }
    this.shapeBatcher.draw(pass, this.viewProjection);
  }

  get viewport(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private sortSprites(sprites: SpriteDrawCommand[], mode: LayerConfig["sort"]): void {
    if (mode === "none") return;
    sprites.sort((a, b) => a.opts.z - b.opts.z);
  }
}
