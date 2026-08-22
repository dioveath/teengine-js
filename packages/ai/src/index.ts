import {
  Engine,
  HeadlessRenderer,
  parseGameDocument,
  verifyGame,
  gameOutline,
  type GameDocument,
  type Project,
  type World,
} from "@teengine/core";

export type ToolSpec = { name: string; usage: string; summary: string; writes: boolean };

export const GAME_TOOLS: readonly ToolSpec[] = [
  { name: "game-outline", usage: "game-outline", summary: "Compact scene/entity projection.", writes: false },
  { name: "game-verify", usage: "game-verify", summary: "Validate schema and references.", writes: false },
  { name: "game-apply", usage: "game-apply <json>", summary: "Replace the document after verify.", writes: true },
  { name: "play-headless", usage: "play-headless <ticks>", summary: "Step the live world without a GPU.", writes: false },
];

export function outline(doc: GameDocument): string {
  return gameOutline(doc);
}

export function verify(data: unknown) {
  const parsed = parseGameDocument(data);
  return verifyGame(parsed);
}

export function apply(project: Project, data: unknown, owner = "ai") {
  const parsed = parseGameDocument(data);
  return project.replace(parsed, owner);
}

export function playHeadless(world: World, ticks: number): Record<string, unknown> {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const engine = Engine.create({ canvas, renderer: new HeadlessRenderer(canvas) });
  engine.setLoop({
    fixedUpdate: (ctx) => world.fixedUpdate(ctx),
    render: () => {},
  });
  engine.step(ticks);
  engine.stop();
  return world.inspection.snapshot();
}

export function systemPrompt(): string {
  return `You edit a TeEngine GameDocument (schema teengine.GameDocument.1).
Entities, assets, input, and layers are data. Gameplay systems are TypeScript in the project — do not invent engine recipes.

${GAME_TOOLS.map((t) => `- \`${t.usage}\`: ${t.summary}`).join("\n")}

Edit scratch JSON, game-verify, then game-apply. Keep existing entity ids when revising.`;
}
