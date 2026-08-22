const order = [
  "core",
  "physics",
  "renderer-webgpu",
  "renderer-canvas2d",
  "storage",
  "gen",
  "ai",
  "editor",
  "teengine",
];

for (const name of order) {
  const proc = Bun.spawn(["bun", "run", "build"], {
    cwd: `packages/${name}`,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) process.exit(code);
}
