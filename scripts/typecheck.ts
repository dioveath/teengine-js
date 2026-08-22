const pkgs = [
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

for (const name of pkgs) {
  const proc = Bun.spawn(["bun", "run", "typecheck"], {
    cwd: `packages/${name}`,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) process.exit(code);
}

for (const extra of ["examples/demo", "apps/studio"]) {
  const proc = Bun.spawn(["bun", "run", "typecheck"], {
    cwd: extra,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) process.exit(code);
}
