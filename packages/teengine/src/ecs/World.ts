import type { LayerSortMode } from "../graphics/LayerRegistry.js";
import type { PhysicsBridge } from "../physics/PhysicsBridge.js";
import type { TransformSnapshot } from "./interpolation.js";
import { createEntity, type Entity, type EntityId, type SpawnConfig } from "./Entity.js";
import type { FixedSystem, RenderSystem } from "./System.js";

type LayerBucket = {
  sprites: Entity[];
  shapes: Entity[];
};

export class World {
  private readonly entities = new Map<EntityId, Entity>();
  private readonly fixedSystems: FixedSystem[] = [];
  private readonly renderSystems: RenderSystem[] = [];
  private readonly scratchTransform: TransformSnapshot = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };

  private nextId: EntityId = 1;
  private time = 0;
  private readonly physics: PhysicsBridge | null;

  constructor(physics: PhysicsBridge | null = null) {
    this.physics = physics;
  }

  addFixedSystem(system: FixedSystem): void {
    this.fixedSystems.push(system);
  }

  addRenderSystem(system: RenderSystem): void {
    this.renderSystems.push(system);
  }

  spawn(config: SpawnConfig): EntityId {
    const id = this.nextId++;
    const entity = createEntity(id, config);
    this.entities.set(id, entity);

    if (entity.rigidBody && this.physics) {
      this.physics.register(entity);
    }

    return id;
  }

  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  /** All entities in spawn order. */
  getAll(): readonly Entity[] {
    return [...this.entities.values()];
  }

  remove(id: EntityId): void {
    this.physics?.unregister(id);
    this.entities.delete(id);
  }

  fixedUpdate(ctx: Omit<import("./System.js").FixedSystemContext, "world">): void {
    this.time += ctx.dt;

    const fullCtx = { ...ctx, world: this, physics: this.physics };

    this.physics?.snapshotPreviousTransforms((id) => this.entities.get(id)?.transform);

    for (const system of this.fixedSystems) {
      system.fixedUpdate(fullCtx);
    }

    this.physics?.step(ctx.dt);
    this.physics?.syncToEntities((id) => this.entities.get(id));
  }

  render(ctx: Omit<import("./System.js").RenderSystemContext, "world">): void {
    const fullCtx = { ...ctx, world: this, physics: this.physics };
    for (const system of this.renderSystems) {
      system.render(fullCtx);
    }
  }

  get physicsBridge(): PhysicsBridge | null {
    return this.physics;
  }

  get elapsed(): number {
    return this.time;
  }

  /** Collect renderables into reusable buckets keyed by layer. */
  collectRenderables(out: Map<string, LayerBucket>): Map<string, LayerBucket> {
    for (const bucket of out.values()) {
      bucket.sprites.length = 0;
      bucket.shapes.length = 0;
    }

    for (const entity of this.entities.values()) {
      if (!entity.active) continue;

      if (entity.sprite) {
        this.addToBucket(out, entity.sprite.layer, entity, "sprite");
      }
      if (entity.shape) {
        this.addToBucket(out, entity.shape.layer, entity, "shape");
      }
    }

    return out;
  }

  /** Interpolated transform for rendering (physics bodies lerp between ticks). */
  getRenderTransform(entity: Entity, alpha: number): TransformSnapshot {
    if (this.physics?.hasBody(entity.id)) {
      return this.physics.getInterpolatedTransform(
        entity.id,
        entity.transform,
        alpha,
        this.scratchTransform,
      );
    }
    return {
      x: entity.transform.x,
      y: entity.transform.y,
      rotation: entity.transform.rotation,
      scaleX: entity.transform.scaleX,
      scaleY: entity.transform.scaleY,
    };
  }

  private addToBucket(
    out: Map<string, LayerBucket>,
    layer: string,
    entity: Entity,
    kind: "sprite" | "shape",
  ): void {
    let bucket = out.get(layer);
    if (!bucket) {
      bucket = { sprites: [], shapes: [] };
      out.set(layer, bucket);
    }
    if (kind === "sprite") {
      bucket.sprites.push(entity);
    } else {
      bucket.shapes.push(entity);
    }
  }
}

export function sortEntitiesForLayer(
  entities: Entity[],
  mode: LayerSortMode,
  getSortKey: (entity: Entity) => number,
): void {
  if (mode === "none") return;
  entities.sort((a, b) => getSortKey(a) - getSortKey(b));
}
