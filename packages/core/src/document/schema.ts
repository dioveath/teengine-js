import { z } from "zod";

export const GAME_PROJECT_SCHEMA = "teengine.GameProject.1" as const;

const ColorSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  a: z.number().default(1),
});

const Vec2Schema = z.object({ x: z.number(), y: z.number() });

const TransformSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
});

const SpriteSchema = z.object({
  asset: z.string().min(1),
  region: z.string().min(1),
  layer: z.string().min(1),
  origin: Vec2Schema.optional(),
  tint: ColorSchema.optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  z: z.number().optional(),
});

const ShapeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("rect"),
    layer: z.string().min(1),
    width: z.number(),
    height: z.number(),
    color: ColorSchema,
    z: z.number().optional(),
  }),
  z.object({
    kind: z.literal("circle"),
    layer: z.string().min(1),
    radius: z.number(),
    color: ColorSchema,
    segments: z.number().optional(),
    z: z.number().optional(),
  }),
  z.object({
    kind: z.literal("line"),
    layer: z.string().min(1),
    endX: z.number(),
    endY: z.number(),
    thickness: z.number(),
    color: ColorSchema,
    z: z.number().optional(),
  }),
]);

const ColliderSchema = z.object({
  shape: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("box"), width: z.number(), height: z.number() }),
    z.object({ kind: z.literal("ball"), radius: z.number() }),
  ]),
  offset: Vec2Schema.optional(),
  friction: z.number().optional(),
  restitution: z.number().optional(),
});

const EntityRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  active: z.boolean().optional(),
  transform: TransformSchema.optional(),
  sprite: SpriteSchema.optional(),
  shape: ShapeSchema.optional(),
  collider: ColliderSchema.optional(),
  collision: z
    .object({
      response: z.enum(["solid", "sensor"]),
      layers: z.object({ category: z.number(), mask: z.number() }).optional(),
      emitEvents: z.boolean().optional(),
    })
    .optional(),
  rigidBody: z
    .object({
      type: z.enum(["dynamic", "fixed", "kinematicPosition"]),
      lockRotation: z.boolean().optional(),
    })
    .optional(),
  cameraTarget: z.boolean().optional(),
  collisionListener: z.boolean().optional(),
  spin: z.object({ speed: z.number() }).optional(),
});

export const GameProjectSchema = z.object({
  schema: z.literal(GAME_PROJECT_SCHEMA),
  meta: z.object({
    title: z.string(),
    world: z.object({ w: z.number(), h: z.number() }),
    clearColor: ColorSchema.optional(),
  }),
  assets: z.array(
    z.object({
      key: z.string().min(1),
      kind: z.enum(["atlas", "image"]),
      src: z.string().min(1),
    }),
  ),
  input: z.record(z.array(z.string())),
  layers: z.array(
    z.object({
      name: z.string().min(1),
      camera: z.enum(["world", "ui"]),
      sort: z.enum(["y", "z", "none"]).optional(),
    }),
  ),
  scenes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      entities: z.array(EntityRecordSchema),
    }),
  ),
  startScene: z.string().min(1),
  systems: z.array(z.string()).optional(),
  data: z.record(z.unknown()).optional(),
});

export type GameProject = z.infer<typeof GameProjectSchema>;
export type EntityRecord = z.infer<typeof EntityRecordSchema>;
export type SceneRecord = GameProject["scenes"][number];
export type AssetRecord = GameProject["assets"][number];

export function emptyGameProject(title = "Untitled"): GameProject {
  return {
    schema: GAME_PROJECT_SCHEMA,
    meta: { title, world: { w: 800, h: 600 } },
    assets: [],
    input: {},
    layers: [
      { name: "world", camera: "world", sort: "z" },
      { name: "ui", camera: "ui", sort: "z" },
    ],
    scenes: [{ id: "main", name: "Main", entities: [] }],
    startScene: "main",
  };
}

export function parseGameProject(data: unknown): GameProject {
  return GameProjectSchema.parse(data);
}

export function cloneGameProject(doc: GameProject): GameProject {
  return structuredClone(doc);
}
