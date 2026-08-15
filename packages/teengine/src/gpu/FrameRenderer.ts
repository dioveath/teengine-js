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
import { ShapeBatcher, type ShapeRun } from "./ShapeBatcher.js";
import { SpriteBatcher, type SpriteRun } from "./SpriteBatcher.js";

type DrawRun = SpriteRun | ShapeRun;

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

  get viewport(): { width: number; height: number } {
    return { width: this.width, height: this.height };
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
      while (i < commands.length && (commands[i].kind === "sprite") === spriteRun) {
        i += 1;
      }
      const batch = commands.slice(start, i);
      if (spriteRun) {
        draws.push(...this.spriteBatcher.pack(batch as SpriteDrawCommand[], this.viewProjection));
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
