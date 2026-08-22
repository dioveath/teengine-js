export type Easing = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => t * (2 - t),
  quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => --t * t * t + 1,
  cubicInOut: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  sineIn: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t: number) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  elasticOut: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
  },
} as const;

export type TweenOptions = {
  from: number;
  to: number;
  duration: number;
  ease?: Easing;
  onUpdate?: (value: number, t: number) => void;
  onComplete?: () => void;
  loop?: boolean;
};

export class Tween {
  elapsed = 0;
  value: number;

  constructor(private readonly options: TweenOptions) {
    this.value = options.from;
  }

  get done(): boolean {
    return this.elapsed >= this.options.duration && !this.options.loop;
  }

  update(dt: number): void {
    if (this.options.duration <= 0) {
      this.value = this.options.to;
      return;
    }
    this.elapsed += dt;
    const raw = this.options.loop
      ? (this.elapsed % this.options.duration) / this.options.duration
      : Math.min(this.elapsed / this.options.duration, 1);
    const eased = (this.options.ease ?? Easing.linear)(raw);
    this.value = this.options.from + (this.options.to - this.options.from) * eased;
    this.options.onUpdate?.(this.value, raw);
    if (!this.options.loop && raw >= 1) this.options.onComplete?.();
  }
}

export class TweenRunner {
  private readonly tweens: Tween[] = [];

  add(options: TweenOptions): Tween {
    const tween = new Tween(options);
    this.tweens.push(tween);
    return tween;
  }

  update(dt: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tween = this.tweens[i]!;
      tween.update(dt);
      if (tween.done) this.tweens.splice(i, 1);
    }
  }

  clear(): void {
    this.tweens.length = 0;
  }

  get count(): number {
    return this.tweens.length;
  }
}

export class Pool<T> {
  private readonly freeItems: T[] = [];
  private liveCount = 0;

  constructor(
    private readonly factory: () => T,
    private readonly reset: ((item: T) => void) | null = null,
    prefill = 0,
  ) {
    for (let i = 0; i < prefill; i++) this.freeItems.push(factory());
  }

  acquire(): T {
    const item = this.freeItems.pop() ?? this.factory();
    this.liveCount++;
    return item;
  }

  release(item: T): void {
    this.reset?.(item);
    this.freeItems.push(item);
    this.liveCount--;
  }

  get live(): number {
    return Math.max(this.liveCount, 0);
  }

  get pooled(): number {
    return this.freeItems.length;
  }
}
