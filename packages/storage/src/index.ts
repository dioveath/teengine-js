import type { GameProject } from "@teengine/core";

export type ProjectRef = { ownerId: string; projectId: string };

export interface ProjectRepository {
  get(ref: ProjectRef): Promise<GameProject | null>;
  put(ref: ProjectRef, doc: GameProject): Promise<void>;
  delete(ref: ProjectRef): Promise<void>;
  list(ownerId: string): Promise<string[]>;
}

function key(ref: ProjectRef): string {
  return `${ref.ownerId}/${ref.projectId}`;
}

export function createMemoryRepository(seed: Iterable<[ProjectRef, GameProject]> = []): ProjectRepository {
  const store = new Map<string, GameProject>();
  for (const [ref, doc] of seed) store.set(key(ref), structuredClone(doc));

  return {
    async get(ref) {
      const doc = store.get(key(ref));
      return doc ? structuredClone(doc) : null;
    },
    async put(ref, doc) {
      store.set(key(ref), structuredClone(doc));
    },
    async delete(ref) {
      store.delete(key(ref));
    },
    async list(ownerId) {
      const prefix = `${ownerId}/`;
      return [...store.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
    },
  };
}
