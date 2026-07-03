export type GpuTexture = {
  texture: GPUTexture;
  view: GPUTextureView;
  sampler: GPUSampler;
  width: number;
  height: number;
};

/** A sub-rectangle inside a texture atlas (UVs + source pixel size). */
export type AtlasRegion = {
  texture: GpuTexture;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  width: number;
  height: number;
};

export type DemoAtlas = {
  player: AtlasRegion;
  invaderA: AtlasRegion;
  invaderAAlt: AtlasRegion;
  invaderB: AtlasRegion;
  invaderBAlt: AtlasRegion;
  bullet: AtlasRegion;
  enemyBullet: AtlasRegion;
  uiHeart: AtlasRegion;
};
