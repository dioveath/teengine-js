const ALIGN = 256;

export class RingBuffer {
  buffer: GPUBuffer | null = null;
  generation = 0;
  private capacity = 0;
  private used = 0;

  constructor(private readonly device: GPUDevice) {}

  begin(): void {
    this.used = 0;
  }

  alloc(bytes: number): number {
    const size = Math.max(1, Math.ceil(bytes / ALIGN) * ALIGN);
    if (this.used + size > this.capacity) this.grow(this.used + size);
    const offset = this.used;
    this.used += size;
    return offset;
  }

  write(data: Float32Array, wordCount: number, byteOffset: number): void {
    if (wordCount === 0) return;
    this.device.queue.writeBuffer(
      this.buffer!,
      byteOffset,
      data.buffer,
      data.byteOffset,
      wordCount * Float32Array.BYTES_PER_ELEMENT,
    );
  }

  destroy(): void {
    this.buffer?.destroy();
    this.buffer = null;
    this.capacity = 0;
    this.generation += 1;
  }

  private grow(needed: number): void {
    const maxBufferSize = this.device.limits.maxBufferSize;
    if (needed > maxBufferSize) {
      throw new Error(
        `Frame buffer needs ${needed} bytes but the adapter allows ${maxBufferSize}.`,
      );
    }
    const capacity = Math.min(Math.max(needed, this.capacity * 2, ALIGN * 64), maxBufferSize);
    const next = this.device.createBuffer({
      size: capacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const previous = this.buffer;
    if (previous) void this.device.queue.onSubmittedWorkDone().then(() => previous.destroy());
    this.buffer = next;
    this.capacity = capacity;
    this.generation += 1;
  }
}
