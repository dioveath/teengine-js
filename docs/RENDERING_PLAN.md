# Rendering Pipeline Refactoring Plan

Research-driven plan to rebuild TeEngine's rendering stack into a best-in-class WebGPU 2D pipeline.
Status: proposal. Target: `@teengine/core` (draw list, interfaces) + `@teengine/renderer-webgpu` (GPU).

---

## 1. Research Base

Sources reviewed and the principles extracted from each:

| Source | Key takeaways applied here |
|---|---|
| Toji (B. Jones), *WebGPU Best Practices* — "Buffer Uploads", "Bind Groups", "Compute w/ Vertex Data", "Render Bundles" | `writeBuffer()` as default upload path; map/write staging only for very hot paths; explicit pipeline layouts so bind groups are reused across pipelines; **group resources by frequency of change** (per-frame / per-batch / per-draw); render bundles pre-record static command streams |
| O'Donnell, *FrameGraph: Extensible Rendering Architecture in Frostbite* (GDC 2017); Arntzen, *Render graphs — a deep dive* | Declare passes + resources, let a graph own lifetime/transience; passes declare reads/writes; enables future post-FX without ad-hoc plumbing |
| PixiJS v8 `Batcher` / `GpuBatchAdaptor` source (production TS 2D renderer) | Instruction-set architecture on CPU; **pooled** batch records; one giant shared vertex buffer + shared quad index buffer; batches carry N textures in one bind group instead of flushing per texture; blend mode/topology changes break batches; adaptor swaps only the bind group between batches |
| Nystrom, *Game Programming Patterns* (already cited in RESEARCH.md) | Object pools in every hot path; data locality |
| Fabian, *Data-Oriented Design* (already cited) | No per-frame allocations; contiguous typed arrays; transform math into flat scratch buffers |
| Inigo Quilez, *2D distance functions*; industry-standard SDF practice | Analytic anti-aliased rect/circle/line/rounded-rect/capsule in the fragment shader — replaces CPU-tessellated circles entirely |

## 2. Audit of Current Pipeline

What exists today (all verified in code):

```
Graphics.beginFrame → queue.push(cmd objects)          DrawQueue.ts
Graphics.endFrame → DrawQueue.byLayer() → new Map      (allocates)
WebGpuFrameRenderer.packLayer                          sorts per layer
  ├─ SpriteBatcher.pack   → per-sprite object churn (corners, .map(), closures)
  └─ ShapeBatcher.pack    → circles tessellated on CPU (32 segs default)
VertexStore → single growable Float32Array → writeBuffer once/frame
One render pass, straight-alpha blending, per-texture bind groups cached forever
```

### Problems, ranked by impact

| # | Problem | Evidence | Consequence |
|---|---|---|---|
| P1 | **Per-sprite heap allocations in hot path** | `SpriteBatcher.addSprite`: `corners` array, `.map()` result, arrow closures — allocated per sprite per frame | GC pressure scales with sprite count; violates DOD guidance the project itself cites |
| P2 | **One draw call per texture run** | `SpriteBatcher.pack` flushes whenever texture changes | A scene interleaving 3 tilesets → 3× draw calls; Pixi solves this with multi-texture batches |
| P3 | **Non-indexed triangles** | 6 vertices pushed per quad | 50% more vertex data than indexed quads sharing one global index buffer |
| P4 | **CPU-tessellated circles** | `ShapeBatcher.addCircle`: 32 segments × 3 verts, transformed on CPU | Wasteful; no AA quality control; lines/rects get hard edges while circles are polygonal |
| P5 | **Transform done per-corner on CPU with trig** | cos/sin per sprite, Mat3.transformPoint ×4 | Fine at small scale, but matrix-free instance data (position/size/rotation/uvs/tint) lets the GPU do it |
| P6 | **Bind-group layout not organized by update rate** | Single layout, texture-only; camera VP baked into vertices at pack time | Camera change forces re-pack; toji explicitly recommends frequency-based grouping (frame/batch/draw) |
| P7 | **Unbounded caches** | `textureBindGroups` never evicted; `textAtlases`, textures leak until dispose | Long sessions grow forever |
| P8 | **DrawQueue allocates per frame** | `byLayer()` builds fresh Map + arrays; command objects garbage every frame | Constant GC churn even for empty-ish scenes |
| P9 | **No MSAA / no sRGB story / straight alpha mixed with premultiplied canvas context** | `alphaMode: "premultiplied"` + straight-alpha blend in shader | Composited edges can be subtly wrong; no 4xMSAA option for vector shapes |
| P10 | **Renderer interface leaks layer concept into backends** | `endFrame(layerOrder, grouped, getLayer)` — backend walks layers, sorts, slices arrays (`commands.slice`) | Canvas2D must reimplement sort/group logic; sorting happens inside backend |

## 3. Target Architecture

```
                ┌─ gameplay systems (unchanged API: graphics.drawRect/Sprite/Text…)
                ▼
┌──────────────────────────────────────────────────────────┐
│ @teengine/core                                            │
│  Graphics            facade, layer registration           │
│  RenderQueue         SoA draw lists, zero-alloc push      │
│  Viewport/Layer      camera + clear + sort policy         │
│  MaterialRegistry    named materials → (shader, blend)    │
│  FrameRenderer       NEW interface: submit(view, list)    │
└──────────────┬───────────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────┐
│ @teengine/renderer-webgpu                                 │
│  GpuDevice        context, device loss, format            │
│  ResourceCache    textures, samplers, pipelines, BGs     │
│  BufferAllocator  per-frame ring buffer (uniforms+verts) │
│  SpriteBatcher    indexed quads, multi-texture batches   │
│  ShapeBatcher     SDF fragment-shader shapes             │
│  TextBatcher      glyph atlas runs (reuses sprite path)  │
│  PassEncoder      one primary pass; offscreen for filters│
│  RenderGraph      (phase 3+) declarative passes          │
└──────────────────────────────────────────────────────────┘
```

Core design rules (each traceable to a source above):

1. **CPU builds an instruction list; GPU-side owns encoding.** Backends consume a flat, sorted draw list — they no longer see layers or sorting (fixes P10, mirrors PixiJS instruction sets).
2. **Everything in the hot path is pooled or SoA.** Zero allocations after warmup (P1, P8).
3. **Indexed quads + one shared index buffer** uploaded once, ever (P3). Vertex buffer holds per-vertex data only when batching demands it.
4. **Multi-texture batches**: up to N textures (8–16, queried via adapter limits) bound in one bind group; a texture-index attribute picks the slice. Flush only when N exceeded or blend/topology changes (P2).
5. **Frequency-layered bind groups**: group(0) frame globals (VP matrices per view, time, resolution — ring-buffered), group(1) per-batch textures, nothing per-draw except pushes (P6).
6. **SDF shapes**: all primitives become one instanced unit-quad drawn with a fragment shader evaluating analytic distance functions — crisp AA, rotation-free CPU cost, circles cost the same as rects (P4).
7. **ResourceCache with LRU eviction + generation counters**: stale handles fail loudly in dev, silently re-upload in release (P7).
8. **Premultiplied alpha everywhere internally**, convert at the edges; optional 4xMSAA toggle per view (P9).
9. **Ring buffer allocator** sized to peak usage with high-water tracking; `writeBuffer()` per toji unless profiling shows staging wins (all uploads).

## 4. Phased Execution Plan

Each phase ships green: typecheck, vitest, demo e2e, golden images.

### Phase 0 — Instrumentation first (no behavior change)
* `renderer.stats`: draw calls, batches, vertices, texture binds, CPU pack ms, GPU submit ms (timestamp queries where available, rAF delta otherwise).
* Headless golden-image harness: capture PNG of demo scenes, pixel-compare on CI (Playwright already present).
* Stress scene: 10k sprites, 500 shapes, heavy text.
* **Exit criteria:** baseline numbers recorded.

### Phase 1 — Zero-allocation CPU draw list
* Replace `DrawQueue` command objects with `RenderQueue`: per-kind SoA `Float32Array`s + free-list ids; `clear()` resets lengths only.
* Move sorting out of backends into core: stable sort of an index array by `(layerOrder, z)` using reusable Int32Array + precomputed keys (no comparator closures).
* `FrameRenderer` interface becomes `submit(views: RenderView[], queue: RenderQueue): void`.
* Port Canvas2D backend onto same interface (it gets simpler, not harder).
* **Exit criteria:** steady-state 0 allocs in pack path (verified via `performance.measureUserAgentSpecificMemory` sampling or Bun gc trace); golden images identical.

### Phase 2 — Indexed multi-texture sprite batching (the Pixi-grade core)
* Shared quad index buffer created once (`0,1,2, 2,1,3 …` pattern, grown on demand, `mappedAtCreation`).
* Vertex format: pos(2f) uv(2f) tint(4×u8 unorm) texIndex(u32) = 28 bytes/vertex vs today's 32, and ⅔ of today's data per quad thanks to indexing.
* Pack loop writes straight into the ring buffer's mapped/staging view — no intermediate Float32Array copies.
* Multi-texture bind group per batch: `texture_2d<f32>` array binding or N flat bindings (pick by adapter limits); batch breaks only on: >N textures, blend mode, topology.
* Camera VP moves to a frame-uniform bind group → **camera changes no longer force re-pack**, enabling cheap multi-view rendering later (editor previews!).
* **Exit criteria:** stress scene ≥ 10k sprites, ≤ 5 draw calls typical, pack time < 1.5ms; visual parity.

### Phase 3 — SDF shape renderer
* One instanced unit-quad pipeline; per-instance data: rect(center,halfSize,tint,type,params…).
* Fragment shader implements iq-style 2D SDFs: box, circle, segment (capsule), rounded box; AA via `fwidth`; optional border/fill params.
* Circles/lines/rects collapse into one pipeline, one draw per batch. Delete CPU tessellation.
* Optional 4xMSAA sample count toggle for the whole pass (sprites unaffected visually).
* **Exit criteria:** 500 shapes ≤ 2 draw calls; zoomed screenshot shows smooth AA edges at any scale.

### Phase 4 — Resource lifecycle & pipeline cache
* `ResourceCache`: textures keyed by handle + generation; LRU eviction with configurable budget (MB); `destroy()` on evict; debug mode asserts on use-after-evict.
* Sampler cache (nearest/linear × clamp/repeat) — today every texture allocates its own sampler.
* `PipelineCache` keyed by `{shaderId, format, blend, topology, msaa, targets}` — explicit shared `GPUPipelineLayout` so bind groups stay valid across pipelines (toji bind-groups guidance).
* Bind group layout unification: group 0 globals, group 1 batch textures — identical across sprite/text pipelines.
* **Exit criteria:** 30-min soak test shows flat memory; pipeline creation count logged and bounded.

### Phase 5 — Frame buffering & submission hygiene
* Ring-buffer allocator for all per-frame data (globals + vertices): N=2–3 frames in flight, high-water mark tracked, growth doubles.
* One `writeBuffer` per region per frame; measure staging/mapped alternative behind a flag.
* Device-loss handling: recreate device, rebuild caches from generation counters, emit event.
* **Exit criteria:** no `onSubmittedWorkDone` stalls in traces; tab-background recovery clean.

### Phase 6 — Features unlocked by the new base
* Custom material/shader API: register WGSL snippet + blend state → auto pipeline-cache entry; user uniforms ride the ring buffer.
* Post-FX/filter passes (blur, bloom, color grade) via minimal render graph: offscreen target nodes, transient allocation, automatic barriers — FrameGraph lite, no over-engineering.
* Instanced particle system (position/velocity/life in one buffer, updated on GPU via compute per toji compute-vertex-data, or CPU-packed initially).
* Static-layer render bundles: UI/HUD layers that don't change get pre-recorded command buffers, replayed per frame.
* Text: keep GlyphAtlas, route through sprite batching; optional MSDF atlas upgrade later.

### Phase 7 — Scale & polish (optional/stretch)
* Compute-based culling + binning for very large scenes (100k+).
* Occlusion-free z-prepass unnecessary in 2D — skip deliberately.
* WebGL2 fallback backend implementing same `FrameRenderer` (shares RenderQueue untouched).

## 5. File-Level Change Map

**New (`packages/core/src/render/`):**
- `RenderQueue.ts` — SoA lists, pooling, sort-keys
- `RenderView.ts` — camera + clear + viewport + scissor
- `Material.ts` — material registry, blend modes
- `FrameRenderer.ts` — new slim interface (replaces old)

**Rewritten (`packages/renderer-webgpu/src/`):**
- `DeviceContext.ts` (ex-WEBGPUContext) + loss handling
- `ResourceCache.ts`, `PipelineCache.ts`, `SamplerCache.ts`
- `RingBuffer.ts` (ex-VertexStore, generalized)
- `SpriteBatcher.ts`, `ShapeBatcher.ts` (SDF), shaders rewritten in WGSL
- `encode.ts` — single place that walks views → passes → batches

**Deleted:** `core/graphics/DrawQueue.ts`, `LayerRegistry.sort-inside-backend` logic, per-texture samplers.

**Untouched public API:** `graphics.drawSprite/drawRect/...`, `registerLayer` semantics preserved — games and demo scenes compile unchanged.

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Multi-texture bind group limits vary by device | Query `maxSampledTexturesPerShaderStage`/`maxBindingsPerBindGroup`; fall back to smaller N gracefully |
| SDF shapes change edge appearance slightly vs tessellation | Golden images regenerated in Phase 3 intentionally; AA quality is a feature, note diff |
| Ring buffer sizing bugs → mid-frame overflow | High-water tracking + assert in dev; auto-grow with warning in release |
| Big-bang rewrite risk | Phases land independently; old interface shimmed until Phase 4 deletes it |
| Canvas2D drift | Same `FrameRenderer` interface + shared golden images keep both honest |

## 7. Success Metrics

- **10,000 animated sprites @ 60fps** on integrated GPU (Chrome, 1080p)
- **≤ 10 draw calls** for the stress scene (today: dozens)
- **< 1.5 ms CPU** total pack+sort+submit at 10k sprites; zero steady-state allocations
- **Memory flat** over 30-min soak; texture eviction works under budget
- Golden images pass for platformer + space-invaders demos throughout
