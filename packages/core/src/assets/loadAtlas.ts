import type { FrameRenderer } from "../graphics/FrameRenderer.js";
import { spriteFrame, type SpriteFrame } from "../graphics/sprite.js";

export type AtlasJson = {
  meta: { image: string; size: { w: number; h: number } };
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
};

export async function loadAtlasFromJson(
  renderer: FrameRenderer,
  jsonUrl: string,
  imageUrl?: string,
): Promise<Record<string, SpriteFrame>> {
  const response = await fetch(jsonUrl);
  if (!response.ok) throw new Error(`Failed to load atlas JSON: ${jsonUrl}`);
  const data = (await response.json()) as AtlasJson;
  const imgSrc = imageUrl ?? jsonUrl.replace(/\.json$/i, ".png");
  const image = await fetch(imgSrc).then((r) => {
    if (!r.ok) throw new Error(`Failed to load atlas image: ${imgSrc}`);
    return r.blob();
  }).then((blob) => createImageBitmap(blob));

  const texture = renderer.uploadImage(image);
  const { w: atlasW, h: atlasH } = data.meta.size;
  const regions: Record<string, SpriteFrame> = {};
  for (const [name, frame] of Object.entries(data.frames)) {
    const { x, y, w, h } = frame.frame;
    regions[name] = spriteFrame(texture, atlasW, atlasH, x, y, w, h);
  }
  return regions;
}
