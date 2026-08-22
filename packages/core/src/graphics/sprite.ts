export type TextureHandle = {
  readonly id: number;
};

export type SpriteFrame = {
  texture: TextureHandle;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  width: number;
  height: number;
};

export function spriteFrame(
  texture: TextureHandle,
  texW: number,
  texH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): SpriteFrame {
  return {
    texture,
    u0: x / texW,
    v0: y / texH,
    u1: (x + w) / texW,
    v1: (y + h) / texH,
    width: w,
    height: h,
  };
}
