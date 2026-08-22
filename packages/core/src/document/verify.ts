import type { GameDocument } from "./schema.js";
import { cloneDocument } from "./schema.js";

export type Diagnostic = { path: string; message: string };

export type VerifyResult =
  | { ok: true; document: GameDocument; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

export function verifyGame(doc: GameDocument): VerifyResult {
  const diagnostics: Diagnostic[] = [];
  const assetKeys = new Set(doc.assets.map((a) => a.key));
  const sceneIds = new Set(doc.scenes.map((s) => s.id));

  if (!sceneIds.has(doc.startScene)) {
    diagnostics.push({ path: "/startScene", message: `Unknown scene "${doc.startScene}"` });
  }

  const layerNames = new Set(doc.layers.map((l) => l.name));
  const entityIds = new Set<string>();

  for (const [si, scene] of doc.scenes.entries()) {
    for (const [ei, entity] of scene.entities.entries()) {
      const path = `/scenes/${si}/entities/${ei}`;
      if (entityIds.has(entity.id)) {
        diagnostics.push({ path: `${path}/id`, message: `Duplicate entity id "${entity.id}"` });
      }
      entityIds.add(entity.id);

      if (entity.sprite) {
        if (!assetKeys.has(entity.sprite.asset)) {
          diagnostics.push({
            path: `${path}/sprite/asset`,
            message: `Unknown asset "${entity.sprite.asset}"`,
          });
        }
        if (!layerNames.has(entity.sprite.layer)) {
          diagnostics.push({
            path: `${path}/sprite/layer`,
            message: `Unknown layer "${entity.sprite.layer}"`,
          });
        }
      }
      if (entity.shape && !layerNames.has(entity.shape.layer)) {
        diagnostics.push({
          path: `${path}/shape/layer`,
          message: `Unknown layer "${entity.shape.layer}"`,
        });
      }
    }
  }

  if (diagnostics.length) return { ok: false, diagnostics };
  return { ok: true, document: cloneDocument(doc), diagnostics };
}

export function gameOutline(doc: GameDocument): string {
  const lines = [
    `${doc.meta.title} ${doc.meta.world.w}x${doc.meta.world.h}`,
    `scenes: ${doc.scenes.map((s) => s.id).join(", ")} (start ${doc.startScene})`,
    `assets: ${doc.assets.map((a) => a.key).join(", ") || "(none)"}`,
    `layers: ${doc.layers.map((l) => l.name).join(", ")}`,
    `input: ${Object.keys(doc.input).join(", ") || "(none)"}`,
  ];
  for (const scene of doc.scenes) {
    lines.push(`# ${scene.id} (${scene.entities.length})`);
    for (const e of scene.entities) {
      const bits = [e.id, e.sprite ? `${e.sprite.asset}:${e.sprite.region}` : "", e.shape?.kind ?? ""]
        .filter(Boolean)
        .join(" ");
      lines.push(`  - ${bits}`);
    }
  }
  return lines.join("\n");
}
