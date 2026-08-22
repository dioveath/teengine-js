export const DRAW_SPRITE = 0;
export const DRAW_BOX = 1;
export const DRAW_CIRCLE = 2;
export const DRAW_CAPSULE = 3;

export const RECORD_FLOATS = 20;

export const R = {
  kind: 0,
  p0x: 1,
  p0y: 2,
  rotation: 3,
  scaleX: 4,
  scaleY: 5,
  originX: 6,
  originY: 7,
  u0: 8,
  v0: 9,
  u1: 10,
  v1: 11,
  width: 12,
  height: 13,
  texId: 14,
  z: 15,
  color: 16,
} as const;

const INITIAL_RECORDS = 4096;

export type RenderStats = {
  drawCalls: number;
  instances: number;
  textureBinds: number;
  packMs: number;
};

function createStats(): RenderStats {
  return { drawCalls: 0, instances: 0, textureBinds: 0, packMs: 0 };
}

export class RenderQueue {
  data: Float32Array;
  ranks: Uint16Array;
  order: Int32Array;
  count = 0;
  readonly stats: RenderStats = createStats();

  private tmp: Int32Array;

  constructor() {
    this.data = new Float32Array(INITIAL_RECORDS * RECORD_FLOATS);
    this.ranks = new Uint16Array(INITIAL_RECORDS);
    this.order = new Int32Array(INITIAL_RECORDS);
    this.tmp = new Int32Array(INITIAL_RECORDS);
  }

  reset(): void {
    this.count = 0;
  }

  private grow(): void {
    const capacity = this.data.length / RECORD_FLOATS;
    const next = new Float32Array(capacity * 2 * RECORD_FLOATS);
    next.set(this.data);
    this.data = next;
    this.ranks = growU16(this.ranks);
    this.order = growI32(this.order);
    this.tmp = new Int32Array(capacity * 2);
  }

  pushSprite(
    x: number,
    y: number,
    z: number,
    rotation: number,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    width: number,
    height: number,
    texId: number,
    r: number,
    g: number,
    b: number,
    a: number,
    rank: number,
  ): void {
    if (this.count === this.ranks.length) this.grow();
    const d = this.data;
    const i = this.count * RECORD_FLOATS;
    d[i + R.kind] = DRAW_SPRITE;
    d[i + R.p0x] = x;
    d[i + R.p0y] = y;
    d[i + R.z] = z;
    d[i + R.rotation] = rotation;
    d[i + R.scaleX] = scaleX;
    d[i + R.scaleY] = scaleY;
    d[i + R.originX] = originX;
    d[i + R.originY] = originY;
    d[i + R.u0] = u0;
    d[i + R.v0] = v0;
    d[i + R.u1] = u1;
    d[i + R.v1] = v1;
    d[i + R.width] = width;
    d[i + R.height] = height;
    d[i + R.texId] = texId;
    d[i + R.color] = r;
    d[i + R.color + 1] = g;
    d[i + R.color + 2] = b;
    d[i + R.color + 3] = a;
    this.ranks[this.count] = rank;
    this.count += 1;
  }

  pushShape(
    kind: number,
    p0x: number,
    p0y: number,
    p1x: number,
    p1y: number,
    paramA: number,
    paramB: number,
    z: number,
    r: number,
    g: number,
    b: number,
    a: number,
    rank: number,
  ): void {
    if (this.count === this.ranks.length) this.grow();
    const d = this.data;
    const i = this.count * RECORD_FLOATS;
    d[i + R.kind] = kind;
    d[i + R.p0x] = p0x;
    d[i + R.p0y] = p0y;
    d[i + 3] = p1x;
    d[i + 4] = p1y;
    d[i + 5] = paramA;
    d[i + 6] = paramB;
    d[i + R.z] = z;
    d[i + R.color] = r;
    d[i + R.color + 1] = g;
    d[i + R.color + 2] = b;
    d[i + R.color + 3] = a;
    this.ranks[this.count] = rank;
    this.count += 1;
  }

  finalize(): void {
    const n = this.count;
    for (let i = 0; i < n; i++) this.order[i] = i;
    const src = this.order;
    const dst = this.tmp;
    const data = this.data;
    const ranks = this.ranks;

    const less = (a: number, b: number): boolean => {
      const ra = ranks[a];
      const rb = ranks[b];
      if (ra !== rb) return ra < rb;
      return data[a * RECORD_FLOATS + R.z] < data[b * RECORD_FLOATS + R.z];
    };

    for (let width = 1; width < n; width *= 2) {
      for (let lo = 0; lo < n; lo += width * 2) {
        const mid = Math.min(lo + width, n);
        const hi = Math.min(lo + width * 2, n);
        let i = lo;
        let j = mid;
        let k = lo;
        while (i < mid && j < hi) dst[k++] = less(src[j], src[i]) ? src[j++] : src[i++];
        while (i < mid) dst[k++] = src[i++];
        while (j < hi) dst[k++] = src[j++];
        for (let t = lo; t < hi; t++) src[t] = dst[t];
      }
    }
  }
}

function growU16(prev: Uint16Array): Uint16Array {
  const next = new Uint16Array(prev.length * 2);
  next.set(prev);
  return next;
}

function growI32(prev: Int32Array): Int32Array {
  const next = new Int32Array(prev.length * 2);
  next.set(prev);
  return next;
}
