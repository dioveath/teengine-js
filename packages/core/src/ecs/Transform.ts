export type Transform = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export const Transform = {
  create(partial: Partial<Transform> = {}): Transform {
    return {
      x: partial.x ?? 0,
      y: partial.y ?? 0,
      rotation: partial.rotation ?? 0,
      scaleX: partial.scaleX ?? 1,
      scaleY: partial.scaleY ?? 1,
    };
  },
};
