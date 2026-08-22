import { STRAIGHT_ALPHA_BLEND } from "./spriteShaders.js";

export const SHAPE_SHADER = /* wgsl */ `
struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @location(0) color: vec4<f32>,
  @builtin(position) position: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4(input.position, 0.0, 1.0);
  out.color = input.color;
  return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  return input.color;
}
`;

export type ShapePipeline = {
  pipeline: GPURenderPipeline;
};

export function createShapePipeline(device: GPUDevice, format: GPUTextureFormat): ShapePipeline {
  const module = device.createShaderModule({ code: SHAPE_SHADER });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [] }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 6 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 8, format: "float32x4" },
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

  return { pipeline };
}
