import { Mat3 } from "../math/index.js";

export type FitToRectMode = "contain" | "cover";

export type FitToRectOptions = {
  mode?: FitToRectMode;
  maxViewportW?: number;
  maxViewportH?: number;
};

export class Camera2D {
  x = 0;
  y = 0;
  zoom = 1;
  rotation = 0;

  private shakeTime = 0;
  private shakeDuration = 0;
  private shakeIntensity = 0;
  private readonly viewMatrix = Mat3.create();
  private readonly inverseView = Mat3.create();
  private readonly orthoMatrix = Mat3.create();

  shake(intensity: number, duration: number): void {

    if (this.shakeDuration <= 0 || intensity >= this.shakeIntensity) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
      this.shakeTime = 0;
    }
  }

  updateShake(dt: number): void {
    if (this.shakeDuration > 0) {
      this.shakeTime += dt;
      if (this.shakeTime >= this.shakeDuration) {
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeTime = 0;
      }
    }
  }

  get isShaking(): boolean {
    return this.shakeDuration > 0;
  }

  private currentShakeOffset(): { x: number; y: number } {
    if (this.shakeDuration <= 0) return { x: 0, y: 0 };
    const decay = 1 - this.shakeTime / this.shakeDuration;
    const t = this.shakeTime * 60;
    const amp = this.shakeIntensity * decay * decay;
    return {
      x: Math.sin(t * 12.9898) * amp,
      y: Math.cos(t * 78.233) * amp,
    };
  }

  lookAt(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  fitToRect(
    worldW: number,
    worldH: number,
    viewportW: number,
    viewportH: number,
    options: FitToRectOptions = {},
  ): void {
    const mode = options.mode ?? "contain";
    const scaleX = viewportW / worldW;
    const scaleY = viewportH / worldH;
    let zoom = mode === "contain" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);

    if (options.maxViewportW !== undefined) {
      zoom = Math.min(zoom, options.maxViewportW / worldW);
    }
    if (options.maxViewportH !== undefined) {
      zoom = Math.min(zoom, options.maxViewportH / worldH);
    }

    this.zoom = zoom;
    this.lookAt(worldW * 0.5, worldH * 0.5);
  }

  getViewProjection(viewportW: number, viewportH: number, out: Mat3 = Mat3.create()): Mat3 {
    const view = this.getViewMatrix(viewportW, viewportH, this.viewMatrix);
    Mat3.ortho(0, viewportW, viewportH, 0, this.orthoMatrix);
    return Mat3.multiply(out, this.orthoMatrix, view);
  }

  worldToScreen(
    worldX: number,
    worldY: number,
    viewportW: number,
    viewportH: number,
    out: { x: number; y: number } = { x: 0, y: 0 },
  ): { x: number; y: number } {
    const view = this.getViewMatrix(viewportW, viewportH, this.viewMatrix);
    Mat3.transformPoint(out, view, worldX, worldY);
    return out;
  }

  screenToWorld(
    screenX: number,
    screenY: number,
    viewportW: number,
    viewportH: number,
    out: { x: number; y: number } = { x: 0, y: 0 },
  ): { x: number; y: number } {
    const view = this.getViewMatrix(viewportW, viewportH, this.viewMatrix);
    if (!Mat3.invert(this.inverseView, view)) {
      out.x = screenX;
      out.y = screenY;
      return out;
    }
    Mat3.transformPoint(out, this.inverseView, screenX, screenY);
    return out;
  }

  private getViewMatrix(viewportW: number, viewportH: number, out: Mat3): Mat3 {
    const cx = viewportW * 0.5;
    const cy = viewportH * 0.5;
    const shake = this.currentShakeOffset();

    Mat3.identity(out);
    Mat3.translate(out, out, cx, cy);
    if (this.rotation !== 0) Mat3.rotate(out, out, this.rotation);
    Mat3.scale(out, out, this.zoom, this.zoom);
    Mat3.translate(out, out, -this.x - shake.x, -this.y - shake.y);
    return out;
  }
}

export function createUiCamera(viewportW: number, viewportH: number): Camera2D {
  const cam = new Camera2D();
  cam.x = viewportW * 0.5;
  cam.y = viewportH * 0.5;
  cam.zoom = 1;
  return cam;
}

export function createWorldCamera(x = 0, y = 0): Camera2D {
  const cam = new Camera2D();
  cam.x = x;
  cam.y = y;
  return cam;
}
