export {
  GAME_PROJECT_SCHEMA,
  GameProjectSchema,
  emptyGameProject,
  parseGameProject,
  cloneGameProject,
} from "./schema.js";
export type { GameProject, EntityRecord, SceneRecord, AssetRecord } from "./schema.js";
export { loadScene, recordToSpawn, entityToRecord, sceneFromWorld } from "./hydrate.js";
export { verifyGame, gameOutline } from "./verify.js";
export type { Diagnostic, VerifyResult } from "./verify.js";
export { Project } from "./Project.js";
