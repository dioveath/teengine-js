import { Mat3 } from "../math/index.js";

/** 2D camera with center anchor — (x, y) is the world point at the viewport center. Y-down world. */
export class Camera2D {
  x = 0;
  y = 0;
  zoom = 1;
  rotation = 0;

  lookAt(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** World → clip-space matrix for the given viewport size. */
  getViewProjection(viewportW: number, viewportH: number, out: Mat3 = Mat3.create()): Mat3 {
    const cx = viewportW * 0.5;
    const cy = viewportH * 0.5;

    const view = Mat3.create();
    Mat3.translate(view, view, -this.x, -this.y);
    Mat3.scale(view, view, this.zoom, this.zoom);
    if (this.rotation !== 0) {
      Mat3.rotate(view, view, this.rotation);
    }
    Mat3.translate(view, view, cx, cy);

    const proj = Mat3.create();
    Mat3.ortho(0, viewportW, viewportH, 0, proj);
    return Mat3.multiply(out, proj, view);
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
