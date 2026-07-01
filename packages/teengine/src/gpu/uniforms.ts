/** Upload a 3×3 matrix padded to 48 bytes for WGSL mat3x3 uniform layout. */
export function writeMat3Uniform(
  device: GPUDevice,
  buffer: GPUBuffer,
  matrix: Float32Array,
): void {
  const padded = new Float32Array(12);
  padded.set([
    matrix[0], matrix[1], matrix[2], 0,
    matrix[3], matrix[4], matrix[5], 0,
    matrix[6], matrix[7], matrix[8], 0,
  ]);
  device.queue.writeBuffer(buffer, 0, padded);
}
