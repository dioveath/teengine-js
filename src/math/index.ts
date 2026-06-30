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
    const m = new Float32Array(9);
    m[0] = 1;
    m[4] = 1;
    m[8] = 1;
    return m;
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

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;
    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;
    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
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
};

export type Vec2 = { x: number; y: number };

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const degToRad = (deg: number): number => (deg / 180) * Math.PI;
