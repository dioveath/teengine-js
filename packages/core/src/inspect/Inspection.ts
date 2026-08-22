export class Inspection {
  private readonly channels = new Map<string, () => unknown>();

  set(name: string, read: () => unknown): void {
    this.channels.set(name, read);
  }

  get(name: string): unknown {
    return this.channels.get(name)?.();
  }

  snapshot(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [name, read] of this.channels) out[name] = read();
    return out;
  }
}
