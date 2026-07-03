import { Mat3 } from "../math/index.js";

export type FitToRectMode = "contain" | "cover";

export type FitToRectOptions = {
  /** Uniform scale mode. Default `contain` (full rect visible, letterboxed). */
  mode?: FitToRectMode;
  /** Cap zoom so the world width maps to at most this many viewport pixels. */
  maxViewportW?: number;
  /** Cap zoom so the world height maps to at most this many viewport pixels. */
  maxViewportH?: number;
};

/** 2D camera with center anchor — (x, y) is the world point at the viewport center. Y-down world. */
export class Camera2D {
  x = 0;
  y = 0;
  zoom = 1;
  rotation = 0;

  private readonly viewMatrix = Mat3.create();
  private readonly inverseView = Mat3.create();

  lookAt(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Uniformly scale and center the camera on a fixed world rectangle.
   * Updates zoom and look-at to the world center.
   */
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

  /** World → clip-space matrix for the given viewport size. */
  getViewProjection(viewportW: number, viewportH: number, out: Mat3 = Mat3.create()): Mat3 {
    const view = this.getViewMatrix(viewportW, viewportH, this.viewMatrix);
    const proj = Mat3.create();
    Mat3.ortho(0, viewportW, viewportH, 0, proj);
    return Mat3.multiply(out, proj, view);
  }

  /** World → screen pixel coordinates. */
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

  /** Screen pixel → world coordinates. */
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

    Mat3.identity(out);
    Mat3.translate(out, out, -this.x, -this.y);
    Mat3.scale(out, out, this.zoom, this.zoom);
    if (this.rotation !== 0) {
      Mat3.rotate(out, out, this.rotation);
    }
    Mat3.translate(out, out, cx, cy);
    return out;
  }
}

/** Screen-space camera: place at viewport center so (0,0) maps to top-left. */
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
