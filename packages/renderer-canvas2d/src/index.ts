import {
  Color,
  DRAW_SPRITE,
  RECORD_FLOATS,
  R,
  type Camera2D,
  type FrameRenderer,
  type RenderQueue,
  type RenderStats,
  type TextureHandle,
} from "@teengine/core";

type StoredTexture = {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  width: number;
  height: number;
};

export class Canvas2DRenderer implements FrameRenderer {
  readonly stats: RenderStats = { drawCalls: 1, instances: 0, textureBinds: 0, packMs: 0 };
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly textures = new Map<number, StoredTexture>();
  private nextTexture = 1;
  private width = 1;
  private height = 1;

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

  uploadRgba(data: Uint8Array, width: number, height: number): TextureHandle {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(width, height);
    image.data.set(data);
    ctx.putImageData(image, 0, 0);
    return this.store(canvas, ctx, width, height);
  }

  uploadImage(bitmap: ImageBitmap): TextureHandle {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    return this.store(canvas, ctx, bitmap.width, bitmap.height);
  }

  disposeTexture(handle: TextureHandle): void {
    this.textures.delete(handle.id);
  }

  render(
    _width: number,
    _height: number,
    clearColor: Color,
    cameras: readonly Camera2D[],
    queue: RenderQueue,
  ): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = css(clearColor);
    ctx.fillRect(0, 0, this.width, this.height);

    let rank = -1;
    let camera: Camera2D | null = null;

    for (let k = 0; k < queue.count; k++) {
      const record = queue.order[k];
      if (queue.ranks[record] !== rank) {
        rank = queue.ranks[record];
        camera = cameras[rank];
      }
      const i = record * RECORD_FLOATS;
      if (queue.data[i + R.kind] === DRAW_SPRITE) {
        this.drawSpriteRecord(queue.data, i, camera!);
      } else {
        this.drawShapeRecord(queue.data, i, camera!);
      }
    }
    this.stats.instances = queue.count;
  }

  dispose(): void {
    this.textures.clear();
  }

  private store(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    width: number,
    height: number,
  ): TextureHandle {
    const id = this.nextTexture++;
    this.textures.set(id, { canvas, ctx, width, height });
    return { id };
  }

  private drawSpriteRecord(d: Float32Array, i: number, camera: Camera2D): void {
    const tex = this.textures.get(d[i + R.texId]);
    if (!tex) return;
    const p = camera.worldToScreen(d[i + R.p0x], d[i + R.p0y], this.width, this.height);
    const sx = d[i + R.u0] * tex.width;
    const sy = d[i + R.v0] * tex.height;
    const sw = (d[i + R.u1] - d[i + R.u0]) * tex.width;
    const sh = (d[i + R.v1] - d[i + R.v0]) * tex.height;
    const scaleX = d[i + R.scaleX];
    const scaleY = d[i + R.scaleY];
    const zoom = camera.zoom;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(d[i + R.rotation]);
    ctx.globalAlpha = d[i + R.color + 3];
    ctx.drawImage(
      tex.canvas as CanvasImageSource,
      sx,
      sy,
      sw,
      sh,
      -d[i + R.originX] * scaleX * zoom,
      -d[i + R.originY] * scaleY * zoom,
      d[i + R.width] * scaleX * zoom,
      d[i + R.height] * scaleY * zoom,
    );
    ctx.restore();
  }

  private drawShapeRecord(d: Float32Array, i: number, camera: Camera2D): void {
    const kind = d[i + R.kind];
    const ctx = this.ctx;
    const color = cssRgb(d, i);
    if (kind === 2) {
      const center = camera.worldToScreen(d[i + R.p0x], d[i + R.p0y], this.width, this.height);
      const edge = camera.worldToScreen(d[i + R.p0x] + d[i + 5], d[i + R.p0y], this.width, this.height);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.abs(edge.x - center.x), 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 3) {
      const a = camera.worldToScreen(d[i + R.p0x], d[i + R.p0y], this.width, this.height);
      const b = camera.worldToScreen(d[i + 3], d[i + 4], this.width, this.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = d[i + 5] * 2 * camera.zoom;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else {
      const halfW = d[i + 5];
      const halfH = d[i + 6];
      const topLeft = camera.worldToScreen(d[i + R.p0x] - halfW, d[i + R.p0y] - halfH, this.width, this.height);
      ctx.fillStyle = color;
      ctx.fillRect(topLeft.x, topLeft.y, halfW * 2 * camera.zoom, halfH * 2 * camera.zoom);
    }
  }
}

function css(color: Color): string {
  return `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
}

function cssRgb(d: Float32Array, i: number): string {
  return `rgba(${d[i + R.color] * 255}, ${d[i + R.color + 1] * 255}, ${d[i + R.color + 2] * 255}, ${
    d[i + R.color + 3]
  })`;
}

export function createCanvas2DRenderer(canvas: HTMLCanvasElement): Canvas2DRenderer {
  return new Canvas2DRenderer(canvas);
}
