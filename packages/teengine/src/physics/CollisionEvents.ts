import type { EntityId } from "../ecs/Entity.js";

export type CollisionEventKind = "enter" | "exit";

export type CollisionEvent = {
  self: EntityId;
  other: EntityId;
  kind: CollisionEventKind;
};
