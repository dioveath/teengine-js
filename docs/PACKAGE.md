# Packages

Bun workspaces. Core is DOM/GPU/Rapier-free except `Input` (canvas events) and `Engine` (rAF).

| Package | Role |
|---------|------|
| `@teengine/core` | Document, ECS, loop, input, graphics API, headless renderer |
| `@teengine/physics` | Rapier adapter |
| `@teengine/renderer-webgpu` | GPU backend |
| `@teengine/renderer-canvas2d` | 2D backend |
| `@teengine/storage` | Project repository |
| `@teengine/gen` | Generation contracts |
| `@teengine/ai` | verify / apply / play-headless |
| `@teengine/editor` | Scene list + play |
| `teengine` | Barrel: core + physics + WebGPU `createEngine` |

`bun run check:independence` enforces the DAG.
