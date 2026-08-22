export {
  GAME_DOCUMENT_SCHEMA,
  GameDocumentSchema,
  emptyDocument,
  parseGameDocument,
  cloneDocument,
} from "./schema.js";
export type { GameDocument, EntityRecord, SceneRecord, AssetRecord } from "./schema.js";
export { hydrateScene, recordToSpawn, entityToRecord, sceneFromWorld } from "./hydrate.js";
export { verifyGame, gameOutline } from "./verify.js";
export type { Diagnostic, VerifyResult } from "./verify.js";
export { Project } from "./Project.js";
