export type EventHandler<T> = (payload: T) => void;

export type EventSubscription = () => void;

type AnyHandler = (payload: unknown) => void;

export class EventBus {
  private readonly handlers = new Map<string, Set<AnyHandler>>();
  private readonly queue: Array<{ type: string; payload: unknown }> = [];
  private draining = false;

  on<T>(type: string, handler: EventHandler<T>): EventSubscription {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as AnyHandler);
    return () => this.off(type, handler);
  }

  once<T>(type: string, handler: EventHandler<T>): EventSubscription {
    const off = this.on<T>(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<T>(type: string, handler: EventHandler<T>): void {
    this.handlers.get(type)?.delete(handler as AnyHandler);
  }

  emit<T>(type: string, payload?: T): void {
    this.queue.push({ type, payload });
  }

  drain(): void {
    if (this.draining) return;
    this.draining = true;
    try {
      const count = this.queue.length;
      for (let i = 0; i < count; i++) {
        const { type, payload } = this.queue[i]!;
        const set = this.handlers.get(type);
        if (!set) continue;
        for (const handler of [...set]) handler(payload);
      }
      this.queue.splice(0, count);
    } finally {
      this.draining = false;
    }
  }

  clear(): void {
    if (!this.draining) this.queue.length = 0;
    this.handlers.clear();
  }

  get queuedCount(): number {
    return this.queue.length;
  }
}
