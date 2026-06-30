export const SHADER_SOURCE = /* wgsl */ `
struct Globals {
  projection: mat3x3<f32>,
};

@group(0) @binding(0) var<uniform> globals: Globals;

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
  let projected = globals.projection * vec3(input.position, 1.0);
  out.position = vec4(projected.xy, 0.0, 1.0);
  out.color = input.color;
  return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  return input.color;
}
`;

export type GpuPipelineBundle = {
  pipeline: GPURenderPipeline;
  bindGroupLayout: GPUBindGroupLayout;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

export function createShapePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
): GpuPipelineBundle {
  const module = device.createShaderModule({ code: SHADER_SOURCE });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
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
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const uniformBuffer = device.createBuffer({
    size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  return { pipeline, bindGroupLayout, uniformBuffer, bindGroup };
}

/** Upload a 3x3 matrix padded to 48 bytes for WGSL std140-style layout. */
export function writeProjectionMatrix(
  device: GPUDevice,
  buffer: GPUBuffer,
  matrix: Float32Array,
): void {
  const padded = new Float32Array(12);
  padded.set([
    matrix[0],
    matrix[1],
    matrix[2],
    0,
    matrix[3],
    matrix[4],
    matrix[5],
    0,
    matrix[6],
    matrix[7],
    matrix[8],
    0,
  ]);
  device.queue.writeBuffer(buffer, 0, padded);
}
