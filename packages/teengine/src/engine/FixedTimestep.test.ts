import { describe, expect, it } from "vitest";
import {
  clampFrameDt,
  createFixedTimestepState,
  runFixedTimestep,
} from "./FixedTimestep.js";

const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;

describe("FixedTimestep", () => {
  it("runs one fixed step per 60fps frame", () => {
    let state = createFixedTimestepState();
    const ticks: number[] = [];

    ({ state } = runFixedTimestep(
      state,
      FIXED_DT,
      { fixedDt: FIXED_DT, maxFrameSteps: MAX_STEPS },
      false,
      (step) => {
        ticks.push(step.tick);
      },
    ));

    expect(ticks).toEqual([0]);
    expect(state.tick).toBe(1);
    expect(state.fixedAccumulator).toBeCloseTo(0);
  });

  it("caps fixed steps during large frame spikes", () => {
    let state = createFixedTimestepState();
    let steps = 0;

    ({ state, steps } = runFixedTimestep(
      state,
      0.1,
      { fixedDt: FIXED_DT, maxFrameSteps: MAX_STEPS },
      false,
      () => {},
    ));

    expect(steps).toBe(MAX_STEPS);
    expect(state.fixedAccumulator).toBeGreaterThan(0);
  });

  it("exposes render alpha between zero and one after a partial step", () => {
    let state = createFixedTimestepState();

    const first = runFixedTimestep(
      state,
      FIXED_DT * 0.5,
      { fixedDt: FIXED_DT, maxFrameSteps: MAX_STEPS },
      false,
      () => {},
    );

    expect(first.steps).toBe(0);
    expect(first.alpha).toBeCloseTo(0.5);
    expect(first.alpha).toBeGreaterThanOrEqual(0);
    expect(first.alpha).toBeLessThan(1);

    const second = runFixedTimestep(
      first.state,
      FIXED_DT * 0.5,
      { fixedDt: FIXED_DT, maxFrameSteps: MAX_STEPS },
      false,
      () => {},
    );

    expect(second.steps).toBe(1);
    expect(second.alpha).toBeCloseTo(0);
  });

  it("clamps raw frame delta to a quarter second", () => {
    expect(clampFrameDt(1)).toBe(0.25);
    expect(clampFrameDt(0.016)).toBeCloseTo(0.016);
  });

  it("skips fixed steps while paused but still reports alpha", () => {
    let state = createFixedTimestepState();
    state.fixedAccumulator = FIXED_DT * 0.25;

    const result = runFixedTimestep(
      state,
      FIXED_DT,
      { fixedDt: FIXED_DT, maxFrameSteps: MAX_STEPS },
      true,
      () => {
        throw new Error("fixed step should not run while paused");
      },
    );

    expect(result.steps).toBe(0);
    expect(result.state.tick).toBe(0);
    expect(result.alpha).toBeCloseTo(0.25);
  });
});
