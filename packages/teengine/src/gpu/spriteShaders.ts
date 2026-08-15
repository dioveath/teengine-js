export const SPRITE_SHADER = /* wgsl */ `
@group(0) @binding(0) var spriteTexture: texture_2d<f32>;
@group(0) @binding(1) var spriteSampler: sampler;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) color: vec4<f32>,
};

struct VertexOutput {
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @builtin(position) position: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4(input.position, 0.0, 1.0);
  out.uv = input.uv;
  out.color = input.color;
  return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let sample = textureSample(spriteTexture, spriteSampler, input.uv);
  return sample * input.color;
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

export type SpritePipeline = {
  pipeline: GPURenderPipeline;
  textureBindGroupLayout: GPUBindGroupLayout;
};

export function createSpritePipeline(device: GPUDevice, format: GPUTextureFormat): SpritePipeline {
  const module = device.createShaderModule({ code: SPRITE_SHADER });

  const textureBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [textureBindGroupLayout],
    }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 8 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 8, format: "float32x2" },
            { shaderLocation: 2, offset: 16, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{ format, blend: STRAIGHT_ALPHA_BLEND }],
    },
    primitive: { topology: "triangle-list" },
  });

  return { pipeline, textureBindGroupLayout };
}

export function createTextureBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  view: GPUTextureView,
  sampler: GPUSampler,
): GPUBindGroup {
  return device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: view },
      { binding: 1, resource: sampler },
    ],
  });
}
