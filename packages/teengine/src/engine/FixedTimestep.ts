export type FixedTimestepState = {
  fixedAccumulator: number;
  tick: number;
  simulationTime: number;
};

export type FixedTimestepConfig = {
  fixedDt: number;
  maxFrameSteps: number;
};

export type FixedStepContext = {
  dt: number;
  tick: number;
  time: number;
};

export type FixedTimestepResult = {
  state: FixedTimestepState;
  alpha: number;
  steps: number;
};

export function createFixedTimestepState(): FixedTimestepState {
  return {
    fixedAccumulator: 0,
    tick: 0,
    simulationTime: 0,
  };
}

/** Clamp raw frame delta to avoid spiral-of-death after tab backgrounding. */
export function clampFrameDt(rawDtSeconds: number): number {
  return Math.min(rawDtSeconds, 0.25);
}

/**
 * Advance fixed simulation for one visual frame.
 * Invokes onStep once per fixed tick (capped at maxFrameSteps).
 */
export function runFixedTimestep(
  state: FixedTimestepState,
  frameDt: number,
  config: FixedTimestepConfig,
  paused: boolean,
  onStep: (ctx: FixedStepContext) => void,
): FixedTimestepResult {
  let { fixedAccumulator, tick, simulationTime } = state;
  let steps = 0;

  if (!paused) {
    fixedAccumulator += frameDt;

    while (fixedAccumulator >= config.fixedDt && steps < config.maxFrameSteps) {
      onStep({
        dt: config.fixedDt,
        tick,
        time: simulationTime,
      });
      simulationTime += config.fixedDt;
      fixedAccumulator -= config.fixedDt;
      tick += 1;
      steps += 1;
    }
  }

  const alpha = fixedAccumulator / config.fixedDt;

  return {
    state: { fixedAccumulator, tick, simulationTime },
    alpha,
    steps,
  };
}
