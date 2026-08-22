import type { Transform } from "./Transform.js";

export type TransformSnapshot = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export function snapshotTransform(transform: Transform): TransformSnapshot {
  return {
    x: transform.x,
    y: transform.y,
    rotation: transform.rotation,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
  };
}

export function lerpTransform(
  prev: TransformSnapshot,
  current: TransformSnapshot,
  alpha: number,
  out: TransformSnapshot = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
): TransformSnapshot {
  const t = alpha;
  out.x = prev.x + (current.x - prev.x) * t;
  out.y = prev.y + (current.y - prev.y) * t;
  out.rotation = prev.rotation + (current.rotation - prev.rotation) * t;
  out.scaleX = prev.scaleX + (current.scaleX - prev.scaleX) * t;
  out.scaleY = prev.scaleY + (current.scaleY - prev.scaleY) * t;
  return out;
}
