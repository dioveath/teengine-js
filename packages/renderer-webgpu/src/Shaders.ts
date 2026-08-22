export const MAX_TEXTURES = 8;

const GLOBALS_WGSL = `
struct Globals {
  viewProj: mat3x3<f32>,
};
`;

const BINDING_ARRAY_PROBE = `
@group(0) @binding(0) var t: binding_array<texture_2d<f32>, 2>;
@group(0) @binding(1) var s: sampler;
@fragment fn fs_main() -> @location(0) vec4<f32> {
  return textureSampleLevel(t[0], s, vec2<f32>(0.0), 0.0);
}
`;

export async function detectMaxTextures(device: GPUDevice): Promise<number> {
  device.pushErrorScope("validation");
  device.createShaderModule({ code: BINDING_ARRAY_PROBE });
  const error = await device.popErrorScope();
  return error ? 1 : MAX_TEXTURES;
}

export function spriteShader(maxTextures: number): string {
  const declarations =
    maxTextures > 1
      ? `@group(1) @binding(0) var textures: binding_array<texture_2d<f32>, ${maxTextures}>;`
      : "@group(1) @binding(0) var spriteTexture: texture_2d<f32>;";
  const sampleExpression =
    maxTextures > 1
      ? "textureSampleLevel(textures[u32(input.texIndex)], texSampler, input.uv, 0.0)"
      : "textureSampleLevel(spriteTexture, texSampler, input.uv, 0.0)";

  return `
${GLOBALS_WGSL}
@group(0) @binding(0) var<uniform> globals: Globals;
${declarations}
@group(1) @binding(1) var texSampler: sampler;

struct VertexIn {
  @location(0) rect: vec4<f32>,
  @location(1) frame: vec4<f32>,
  @location(2) uv0: vec2<f32>,
  @location(3) uv1: vec2<f32>,
  @location(4) color: vec4<f32>,
};

struct VertexOut {
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) texIndex: f32,
  @builtin(position) position: vec4<f32>,
};

const CORNERS = array<vec2<f32>, 4>(
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(0.0, 1.0),
  vec2<f32>(1.0, 1.0),
);

@vertex
fn vs_main(input: VertexIn, @builtin(vertex_index) vi: u32) -> VertexOut {
  let corner = CORNERS[vi];
  let local = corner * input.rect.zw - input.frame.xy;
  let s = sin(input.frame.z);
  let c = cos(input.frame.z);
  let world = input.rect.xy + vec2<f32>(local.x * c - local.y * s, local.x * s + local.y * c);

  var out: VertexOut;
  out.position = vec4<f32>((globals.viewProj * vec3<f32>(world, 1.0)).xy, 0.0, 1.0);
  out.uv = mix(input.uv0, input.uv1, corner);
  out.color = input.color;
  out.texIndex = input.frame.w;
  return out;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4<f32> {
  let sample = ${sampleExpression};
  return sample * input.color;
}
`;
}

export const SHAPE_SHADER = /* wgsl */ `
${GLOBALS_WGSL}
@group(0) @binding(0) var<uniform> globals: Globals;

const KIND_BOX = 1.0;
const KIND_CIRCLE = 2.0;
const KIND_CAPSULE = 3.0;

struct VertexIn {
  @location(0) endpoints: vec4<f32>,
  @location(1) params: vec4<f32>,
  @location(2) color: vec4<f32>,
};

struct VertexOut {
  @location(0) local: vec2<f32>,
  @location(1) sdfParams: vec2<f32>,
  @location(2) kind: f32,
  @location(3) color: vec4<f32>,
  @builtin(position) position: vec4<f32>,
};

const CORNERS = array<vec2<f32>, 4>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>(1.0, -1.0),
  vec2<f32>(-1.0, 1.0),
  vec2<f32>(1.0, 1.0),
);

@vertex
fn vs_main(input: VertexIn, @builtin(vertex_index) vi: u32) -> VertexOut {
  let c = CORNERS[vi];
  let kind = input.params.z;
  var world: vec2<f32>;
  var local: vec2<f32>;
  var sdfParams: vec2<f32>;

  if (kind == KIND_CAPSULE) {
    let p0 = input.endpoints.xy;
    let p1 = input.endpoints.zw;
    let axis = p1 - p0;
    let len = max(length(axis), 1e-5);
    let dir = axis / len;
    let normal = vec2<f32>(-dir.y, dir.x);
    let halfWidth = input.params.x;
    world = mix(p0, p1, c.x) + normal * (c.y * halfWidth);
    let mid = (p0 + p1) * 0.5;
    let rel = world - mid;
    local = vec2<f32>(dot(rel, dir), dot(rel, normal));
    sdfParams = vec2<f32>(len * 0.5, halfWidth);
  } else if (kind == KIND_CIRCLE) {
    let radius = input.params.x;
    world = input.endpoints.xy + c * radius;
    local = c * radius;
    sdfParams = vec2<f32>(radius, 0.0);
  } else {
    let half = vec2<f32>(input.params.x, input.params.y);
    world = input.endpoints.xy + c * half;
    local = c * half;
    sdfParams = half;
  }

  var out: VertexOut;
  out.position = vec4<f32>((globals.viewProj * vec3<f32>(world, 1.0)).xy, 0.0, 1.0);
  out.local = local;
  out.sdfParams = sdfParams;
  out.kind = kind;
  out.color = input.color;
  return out;
}

fn sdBox(p: vec2<f32>, b: vec2<f32>) -> f32 {
  let d = abs(p) - b;
  return length(max(d, vec2<f32>(0.0))) + min(max(d.x, d.y), 0.0);
}

fn sdCapsuleX(p: vec2<f32>, halfLength: f32, radius: f32) -> f32 {
  let outside = length(max(abs(p) - vec2<f32>(halfLength, 0.0), vec2<f32>(0.0)));
  return outside + min(max(abs(p.x) - halfLength, p.y), 0.0) - radius;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4<f32> {
  var d: f32;
  if (input.kind == KIND_CAPSULE) {
    d = sdCapsuleX(input.local, input.sdfParams.x, input.sdfParams.y);
  } else if (input.kind == KIND_CIRCLE) {
    d = length(input.local) - input.sdfParams.x;
  } else {
    d = sdBox(input.local, input.sdfParams);
  }

  let aa = max(fwidth(d), 1e-6);
  let coverage = 1.0 - smoothstep(-aa, aa, d);
  return vec4<f32>(input.color.rgb, input.color.a * coverage);
}
`;

export const STRAIGHT_ALPHA_BLEND: GPUBlendState = {
  color: {
    srcFactor: "src-alpha",
    dstFactor: "one-minus-src-alpha",
    operation: "add",
  },
  alpha: {
    srcFactor: "one",
    dstFactor: "one-minus-src-alpha",
    operation: "add",
  },
};

type PipelineSpec = {
  code: string;
  instanceStrideBytes: number;
  attributes: GPUVertexAttribute[];
  device: GPUDevice;
  format: GPUTextureFormat;
};

export type MaterialPipeline = {
  pipeline: GPURenderPipeline;
  instanceStrideBytes: number;
};

function createMaterialPipeline(spec: PipelineSpec): MaterialPipeline {
  const module = spec.device.createShaderModule({ code: spec.code });
  const pipeline = spec.device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: spec.instanceStrideBytes,
          stepMode: "instance",
          attributes: spec.attributes,
        },
      ],
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{ format: spec.format, blend: STRAIGHT_ALPHA_BLEND }],
    },
    primitive: { topology: "triangle-strip" },
  });
  return { pipeline, instanceStrideBytes: spec.instanceStrideBytes };
}

export class Materials {
  readonly maxTextures: number;
  readonly sprites: MaterialPipeline;
  readonly shapes: MaterialPipeline;

  constructor(device: GPUDevice, format: GPUTextureFormat, maxTextures: number) {
    this.maxTextures = maxTextures;
    const spriteSpec = {
      device,
      format,
      code: spriteShader(maxTextures),
      instanceStrideBytes: 13 * 4,
      attributes: ([
        { shaderLocation: 0, offset: 0, format: "float32x4" },
        { shaderLocation: 1, offset: 16, format: "float32x4" },
        { shaderLocation: 2, offset: 32, format: "float32x2" },
        { shaderLocation: 3, offset: 40, format: "float32x2" },
        { shaderLocation: 4, offset: 48, format: "unorm8x4" },
      ]) as GPUVertexAttribute[],
    };
    const shapeSpec = {
      device,
      format,
      code: SHAPE_SHADER,
      instanceStrideBytes: 9 * 4,
      attributes: ([
        { shaderLocation: 0, offset: 0, format: "float32x4" },
        { shaderLocation: 1, offset: 16, format: "float32x4" },
        { shaderLocation: 2, offset: 32, format: "unorm8x4" },
      ]) as GPUVertexAttribute[],
    };
    this.sprites = createMaterialPipeline(spriteSpec);
    this.shapes = createMaterialPipeline(shapeSpec);
  }

  get globalsLayout(): GPUBindGroupLayout {
    return this.sprites.pipeline.getBindGroupLayout(0);
  }

  get texturesLayout(): GPUBindGroupLayout {
    return this.sprites.pipeline.getBindGroupLayout(1);
  }
}
