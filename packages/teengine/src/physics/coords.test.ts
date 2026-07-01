import { describe, expect, it } from "vitest";
import {
  engineGravityToRapier,
  engineToRapier,
  engineVelocityToRapier,
  rapierToEngine,
  rapierVelocityToEngine,
} from "./coords.js";

describe("physics coords", () => {
  it("round-trips position and rotation through engine ↔ Rapier space", () => {
    const engine = { x: 120, y: 340, rotation: 0.75 };
    const rapier = engineToRapier(engine.x, engine.y);
    const back = rapierToEngine(rapier.x, rapier.y, -engine.rotation);

    expect(back.x).toBeCloseTo(engine.x);
    expect(back.y).toBeCloseTo(engine.y);
    expect(back.rotation).toBeCloseTo(engine.rotation);
  });

  it("round-trips linear velocity", () => {
    const engine = { x: 220, y: -180 };
    const rapier = engineVelocityToRapier(engine.x, engine.y);
    const back = rapierVelocityToEngine(rapier.x, rapier.y);

    expect(back.x).toBeCloseTo(engine.x);
    expect(back.y).toBeCloseTo(engine.y);
  });

  it("maps positive engine gravity to downward Rapier acceleration", () => {
    const gravity = engineGravityToRapier(980);
    expect(gravity.x).toBe(0);
    expect(gravity.y).toBe(-980);
  });
});
