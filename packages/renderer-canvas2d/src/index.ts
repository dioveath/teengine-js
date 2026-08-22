import {
  Color,
  type DrawCommand,
  type FrameRenderer,
  type LayerConfig,
  type SpriteDrawCommand,
  type TextureHandle,
} from "@teengine/core";

type StoredTexture = {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  width: number;
  height: number;
};

export class Canvas2DRenderer implements FrameRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly textures = new Map<number, StoredTexture>();
  private width = 1;
  private height = 1;
  private nextTexture = 1;
  private clearColor: Color = Color.hex("#0d1117");

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to acquire a 2D canvas context.");
    this.canvas = canvas;
    this.ctx = ctx;
  }

  get viewport(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  resizeToDisplaySize(): { width: number; height: number } {
    const dpr = globalThis.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr || this.canvas.width || 1));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr || this.canvas.height || 1));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.resize(width, height);
    return { width, height };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  beginFrame(clearColor: Color): void {
    this.clearColor = clearColor;
  }

  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create texture canvas.");
    const image = ctx.createImageData(width, height);
    image.data.set(data);
    ctx.putImageData(image, 0, 0);
    const id = this.nextTexture++;
    this.textures.set(id, { canvas, ctx, width, height });
    return { id };
  }

  uploadImage(bitmap: ImageBitmap): TextureHandle {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create texture canvas.");
    ctx.drawImage(bitmap, 0, 0);
    const id = this.nextTexture++;
    this.textures.set(id, { canvas, ctx, width: bitmap.width, height: bitmap.height });
    return { id };
  }

  prepareSprite(_handle: TextureHandle): void {}

  endFrame(
    layerOrder: readonly string[],
    grouped: Map<string, DrawCommand[]>,
    getLayer: (name: string) => LayerConfig,
  ): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(${this.clearColor.r * 255}, ${this.clearColor.g * 255}, ${this.clearColor.b * 255}, ${this.clearColor.a})`;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const name of layerOrder) {
      const commands = grouped.get(name);
      if (!commands?.length) continue;
      this.drawCommands(commands, getLayer(name).camera);
    }
  }

  dispose(): void {
    this.textures.clear();
  }

  private drawCommands(commands: DrawCommand[], camera: LayerConfig["camera"]): void {
    const ctx = this.ctx;
    for (const cmd of commands) {
      if (cmd.kind === "sprite") this.drawSprite(cmd, camera);
      else if (cmd.kind === "shapeRect") {
        const p = camera.worldToScreen(cmd.x, cmd.y, this.width, this.height);
        const q = camera.worldToScreen(cmd.x + cmd.width, cmd.y + cmd.height, this.width, this.height);
        ctx.fillStyle = css(cmd.color);
        ctx.fillRect(p.x, p.y, q.x - p.x, q.y - p.y);
      } else if (cmd.kind === "shapeCircle") {
        const p = camera.worldToScreen(cmd.x, cmd.y, this.width, this.height);
        const edge = camera.worldToScreen(cmd.x + cmd.radius, cmd.y, this.width, this.height);
        ctx.fillStyle = css(cmd.color);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.abs(edge.x - p.x), 0, Math.PI * 2);
        ctx.fill();
      } else {
        const a = camera.worldToScreen(cmd.x0, cmd.y0, this.width, this.height);
        const b = camera.worldToScreen(cmd.x1, cmd.y1, this.width, this.height);
        ctx.strokeStyle = css(cmd.color);
        ctx.lineWidth = cmd.width * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  private drawSprite(cmd: SpriteDrawCommand, camera: LayerConfig["camera"]): void {
    const tex = this.textures.get(cmd.frame.texture.id);
    if (!tex) return;
    const { opts, frame } = cmd;
    const p = camera.worldToScreen(opts.x, opts.y, this.width, this.height);
    const sx = frame.u0 * tex.width;
    const sy = frame.v0 * tex.height;
    const sw = (frame.u1 - frame.u0) * tex.width;
    const sh = (frame.v1 - frame.v0) * tex.height;
    const dw = frame.width * opts.scaleX * camera.zoom;
    const dh = frame.height * opts.scaleY * camera.zoom;
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(opts.rotation);
    this.ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1);
    this.ctx.globalAlpha = opts.tint.a;
    this.ctx.drawImage(tex.canvas, sx, sy, sw, sh, -opts.originX * opts.scaleX * camera.zoom, -opts.originY * opts.scaleY * camera.zoom, dw, dh);
    this.ctx.restore();
  }
}

function css(color: Color): string {
  return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
}

export function createCanvas2DRenderer(canvas: HTMLCanvasElement): Canvas2DRenderer {
  return new Canvas2DRenderer(canvas);
}
