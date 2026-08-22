import { describe, expect, it, vi } from "vitest";
import { EventBus } from "./Events.js";

describe("EventBus", () => {
  it("delivers queued events on drain()", () => {
    const bus = new EventBus();
    const got: string[] = [];
    bus.on<string>("hit", (p) => got.push(p));
    bus.emit("hit", "a");
    expect(got).toEqual([]); // not yet delivered
    bus.drain();
    expect(got).toEqual(["a"]);
  });

  it("supports multiple handlers and unsubscribe", () => {
    const bus = new EventBus();
    let calls = 0;
    const off = bus.on("tick", () => calls++);
    bus.on("tick", () => calls++);
    bus.emit("tick");
    bus.drain();
    expect(calls).toBe(2);
    off();
    bus.emit("tick");
    bus.drain();
    expect(calls).toBe(3); // only remaining handler
  });

  it("once() unsubscribes after first delivery", () => {
    const bus = new EventBus();
    let calls = 0;
    bus.once("boom", () => calls++);
    bus.emit("boom");
    bus.drain();
    bus.emit("boom");
    bus.drain();
    expect(calls).toBe(1);
  });

  it("defers events emitted during drain to the next drain", () => {
    const bus = new EventBus();
    const order: string[] = [];
    bus.on<string>("outer", () => {
      order.push("outer");
      bus.emit<string>("inner", "queued");
    });
    bus.on<string>("inner", (p) => order.push(`inner:${p}`));
    bus.emit("outer");
    bus.drain();
    expect(order).toEqual(["outer"]);
    bus.drain();
    expect(order).toEqual(["outer", "inner:queued"]);
  });

  it("drain() while draining is a no-op", () => {
    const bus = new EventBus();
    let depth = 0;
    bus.on("x", () => {
      depth++;
      bus.drain(); // must not recurse
    });
    bus.emit("x");
    expect(() => bus.drain()).not.toThrow();
    expect(depth).toBe(1);
  });

  it("clear() drops queue and handlers", () => {
    const bus = new EventBus();
    bus.emit("a", 1);
    bus.clear();
    expect(bus.queuedCount).toBe(0);
    const handler = vi.fn();
    bus.on("a", handler);
    bus.emit("a", 2);
    bus.drain();
    // handlers were cleared by clear(), then re-registered above
    expect(handler).toHaveBeenCalledWith(2);
  });
});
