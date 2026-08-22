import {
  Camera2D,
  Color,
  spriteFrame,
  type Engine,
  type SpriteFrame,
} from "teengine";

const COUNT = 10_000;
const COLS = 100;
const SPRITE_SCALE = 0.16;
const WARMUP_FRAMES = 120;
const MEASURE_FRAMES = 300;

type BenchResults = {
  sprites: number;
  avgFps: number;
  minFps: number;
  p99FrameMs: number;
  avgPackMs: number;
  maxPackMs: number;
  drawCalls: number;
  textureBinds: number;
  heapGrowthMb: number | null;
};

declare global {
  interface Window {
    __BENCH__?: { results: BenchResults | null };
  }
}

async function loadFrames(graphics: Engine["graphics"], count: number): Promise<SpriteFrame[]> {
  const frames: SpriteFrame[] = [];
  for (let id = 1; id <= count; id++) {
    const response = await fetch(`bench/pokemon-${id}.png`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const handle = graphics.uploadImage(bitmap);
    frames.push(spriteFrame(handle, bitmap.width, bitmap.height, 0, 0, bitmap.width, bitmap.height));
    bitmap.close();
  }
  return frames;
}

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("#canvas missing");

  try {
    const { createEngine } = await import("teengine");
    const engine = await createEngine({ canvas });
    run(engine, canvas);
  } catch (error) {
    console.error(error);
    canvas.style.display = "none";
    const fallback = document.getElementById("fallback");
    if (fallback instanceof HTMLElement) fallback.style.display = "block";
  }
}

function run(engine: Engine, canvas: HTMLCanvasElement): void {
  const graphics = engine.graphics;
  const camera = new Camera2D();
  const worldSize = COLS * 14 + 40;
  camera.fitToRect(worldSize, worldSize, canvas.clientWidth, canvas.clientHeight);
  graphics.registerLayer("world", { camera, sort: "none" });

  window.__BENCH__ = { results: null };

  loadFrames(graphics, 8).then((frames) => {
    const frameTimes: number[] = [];
    const packTimes: number[] = [];
    let lastNow = performance.now();
    let measured = 0;
    let heapStart: number | null = null;

    engine.setLoop({
      fixedUpdate: () => {},
      render: ({ graphics, width, height, time }) => {
        camera.fitToRect(worldSize, worldSize, width, height);

        graphics.beginFrame(Color.hex("#0d1117"));
        graphics.beginLayer("world");
        for (let i = 0; i < COUNT; i++) {
          const col = i % COLS;
          const row = (i / COLS) | 0;
          const wobble = Math.sin(time * 2.2 + i * 0.35) * 3;
          graphics.drawSprite(frames[i % frames.length], {
            x: 20 + col * 14 + wobble,
            y: 20 + row * 14 + Math.cos(time * 1.8 + i * 0.5) * 3,
            rotation: Math.sin(time + i) * 0.15,
            scale: { x: SPRITE_SCALE * (Math.sin(time * 3 + i) > 0 ? 1 : -1), y: SPRITE_SCALE },
          });
        }
        graphics.endLayer();
        graphics.endFrame();

        const now = performance.now();
        measured += 1;
        if (measured > WARMUP_FRAMES) {
          if ("memory" in performance && heapStart === null) {
            heapStart = (performance as any).memory.usedJSHeapSize;
          }
          frameTimes.push(now - lastNow);
          packTimes.push(graphics.stats.packMs);
          if (measured === WARMUP_FRAMES + MEASURE_FRAMES) finish();
        }
        lastNow = now;
      },
    });
    engine.start();

    function finish(): void {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const avgFrame = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const heapEnd =
        "memory" in performance ? (performance as any).memory.usedJSHeapSize : null;
      window.__BENCH__!.results = {
        sprites: COUNT,
        avgFps: 1000 / avgFrame,
        minFps: 1000 / sorted[sorted.length - 1],
        p99FrameMs: sorted[Math.floor(sorted.length * 0.99)],
        avgPackMs: packTimes.reduce((a, b) => a + b, 0) / packTimes.length,
        maxPackMs: Math.max(...packTimes),
        drawCalls: graphics.stats.drawCalls,
        textureBinds: graphics.stats.textureBinds,
        heapGrowthMb: heapStart !== null && heapEnd !== null ? (heapEnd - heapStart) / 1048576 : null,
      };
    }
  });
}

void main();
