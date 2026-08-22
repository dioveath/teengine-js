import { cloneGameProject, parseGameProject, type EntityRecord, type GameProject } from "./schema.js";
import { verifyGame, type Diagnostic } from "./verify.js";

export type HistoryEntry = { label: string; before: GameProject; after: GameProject };

export class Project {
  private doc: GameProject;
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private readonly listeners = new Set<() => void>();
  private lockOwner: string | null = null;

  constructor(doc: GameProject) {
    this.doc = cloneGameProject(doc);
  }

  get document(): GameProject {
    return this.doc;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  lock(owner: string): boolean {
    if (this.lockOwner && this.lockOwner !== owner) return false;
    this.lockOwner = owner;
    return true;
  }

  unlock(owner: string): void {
    if (this.lockOwner === owner) this.lockOwner = null;
  }

  write(label: string, mutate: (doc: GameProject) => GameProject, owner = "ui"): Diagnostic[] {
    if (this.lockOwner && this.lockOwner !== owner) {
      return [{ path: "/", message: `Write locked by ${this.lockOwner}` }];
    }
    const before = cloneGameProject(this.doc);
    const next = mutate(cloneGameProject(this.doc));
    const parsed = parseGameProject(next);
    const result = verifyGame(parsed);
    if (!result.ok) return result.diagnostics;
    this.doc = result.document;
    this.undoStack.push({ label, before, after: cloneGameProject(this.doc) });
    this.redoStack.length = 0;
    this.emit();
    return [];
  }

  spawn(sceneId: string, entity: EntityRecord, owner?: string): Diagnostic[] {
    return this.write(
      "spawn",
      (doc) => {
        const scene = doc.scenes.find((s) => s.id === sceneId);
        if (!scene) throw new Error(`Scene "${sceneId}" not found.`);
        scene.entities.push(entity);
        return doc;
      },
      owner,
    );
  }

  setTransform(
    sceneId: string,
    entityId: string,
    transform: NonNullable<EntityRecord["transform"]>,
    owner?: string,
  ): Diagnostic[] {
    return this.write(
      "setTransform",
      (doc) => {
        const entity = doc.scenes.find((s) => s.id === sceneId)?.entities.find((e) => e.id === entityId);
        if (!entity) throw new Error(`Entity "${entityId}" not found.`);
        entity.transform = { ...entity.transform, ...transform };
        return doc;
      },
      owner,
    );
  }

  replace(doc: GameProject, owner?: string): Diagnostic[] {
    return this.write("replace", () => doc, owner);
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.redoStack.push(entry);
    this.doc = cloneGameProject(entry.before);
    this.emit();
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.undoStack.push(entry);
    this.doc = cloneGameProject(entry.after);
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
