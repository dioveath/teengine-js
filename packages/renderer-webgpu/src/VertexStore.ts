const INITIAL_FLOATS = 2048;

/** Growable CPU vertex list uploaded once per frame. */
export class VertexStore {
  private data = new Float32Array(INITIAL_FLOATS);
  private used = 0;
  private buffer: GPUBuffer | null = null;

  constructor(private readonly device: GPUDevice) {}

  clear(): void {
    this.used = 0;
  }

  vertexCount(stride: number): number {
    return this.used / stride;
  }

  push(...values: number[]): void {
    const n = values.length;
    this.ensureCpu(this.used + n);
    for (let i = 0; i < n; i++) {
      this.data[this.used++] = values[i];
    }
  }

  get gpuBuffer(): GPUBuffer {
    if (!this.buffer) {
      throw new Error("VertexStore.upload() must run before encode.");
    }
    return this.buffer;
  }

  upload(): void {
    if (this.used === 0) return;

    const bytes = this.used * Float32Array.BYTES_PER_ELEMENT;
    if (!this.buffer || this.buffer.size < bytes) {
      const old = this.buffer;
      this.buffer = this.device.createBuffer({
        size: Math.max(bytes, this.data.byteLength),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      if (old) {
        void this.device.queue.onSubmittedWorkDone().then(() => old.destroy());
      }
    }

    this.device.queue.writeBuffer(this.buffer, 0, this.data.subarray(0, this.used));
  }

  private ensureCpu(needed: number): void {
    if (needed <= this.data.length) return;
    let n = this.data.length;
    while (n < needed) n *= 2;
    const next = new Float32Array(n);
    next.set(this.data.subarray(0, this.used));
    this.data = next;
  }
}
