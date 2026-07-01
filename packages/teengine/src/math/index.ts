export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export const Color = {
  rgb(r: number, g: number, b: number, a = 1): Color {
    return { r, g, b, a };
  },

  hex(hex: string, a = 1): Color {
    const value = hex.replace("#", "");
    const full =
      value.length === 3
        ? value
            .split("")
            .map((c) => c + c)
            .join("")
        : value;
    const n = Number.parseInt(full, 16);
    return {
      r: ((n >> 16) & 0xff) / 255,
      g: ((n >> 8) & 0xff) / 255,
      b: (n & 0xff) / 255,
      a,
    };
  },

  toVec4(color: Color): [number, number, number, number] {
    return [color.r, color.g, color.b, color.a];
  },
};

export type Mat3 = Float32Array;

export const Mat3 = {
  create(): Mat3 {
    const out = new Float32Array(9);
    return Mat3.identity(out);
  },

  identity(out: Mat3): Mat3 {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  },

  ortho(
    left: number,
    right: number,
    bottom: number,
    top: number,
    out: Mat3 = Mat3.create(),
  ): Mat3 {
    const rl = right - left;
    const tb = top - bottom;
    out[0] = 2 / rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 2 / tb;
    out[5] = 0;
    out[6] = -(right + left) / rl;
    out[7] = -(top + bottom) / tb;
    out[8] = 1;
    return out;
  },

  multiply(out: Mat3, a: Mat3, b: Mat3): Mat3 {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];

    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b10 = b[3];
    const b11 = b[4];
    const b12 = b[5];
    const b20 = b[6];
    const b21 = b[7];
    const b22 = b[8];

    const result = out === a || out === b ? new Float32Array(9) : out;

    result[0] = b00 * a00 + b01 * a10 + b02 * a20;
    result[1] = b00 * a01 + b01 * a11 + b02 * a21;
    result[2] = b00 * a02 + b01 * a12 + b02 * a22;
    result[3] = b10 * a00 + b11 * a10 + b12 * a20;
    result[4] = b10 * a01 + b11 * a11 + b12 * a21;
    result[5] = b10 * a02 + b11 * a12 + b12 * a22;
    result[6] = b20 * a00 + b21 * a10 + b22 * a20;
    result[7] = b20 * a01 + b21 * a11 + b22 * a21;
    result[8] = b20 * a02 + b21 * a12 + b22 * a22;

    if (result !== out) {
      out.set(result);
    }

    return out;
  },

  translate(out: Mat3, m: Mat3, x: number, y: number): Mat3 {
    const t = Mat3.create();
    t[6] = x;
    t[7] = y;
    return Mat3.multiply(out, m, t);
  },

  rotate(out: Mat3, m: Mat3, radians: number): Mat3 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const r = Mat3.create();
    r[0] = c;
    r[1] = s;
    r[3] = -s;
    r[4] = c;
    return Mat3.multiply(out, m, r);
  },

  scale(out: Mat3, m: Mat3, sx: number, sy: number): Mat3 {
    const s = Mat3.create();
    s[0] = sx;
    s[4] = sy;
    return Mat3.multiply(out, m, s);
  },

  transformPoint(out: { x: number; y: number }, m: Mat3, x: number, y: number) {
    out.x = m[0] * x + m[3] * y + m[6];
    out.y = m[1] * x + m[4] * y + m[7];
  },

  invert(out: Mat3, m: Mat3): boolean {
    const a = m[0];
    const b = m[1];
    const c = m[3];
    const d = m[4];
    const tx = m[6];
    const ty = m[7];

    const det = a * d - b * c;
    if (Math.abs(det) < 1e-10) return false;

    const invDet = 1 / det;
    const ia = d * invDet;
    const ib = -b * invDet;
    const ic = -c * invDet;
    const id = a * invDet;

    out[0] = ia;
    out[1] = ib;
    out[2] = 0;
    out[3] = ic;
    out[4] = id;
    out[5] = 0;
    out[6] = -(ia * tx + ic * ty);
    out[7] = -(ib * tx + id * ty);
    out[8] = 1;
    return true;
  },
};

export type Vec2 = { x: number; y: number };
