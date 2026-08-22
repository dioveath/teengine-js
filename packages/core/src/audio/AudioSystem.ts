export type SfxOptions = {
  type?: OscillatorType;
  freq: number;
  endFreq?: number;
  duration?: number;
  volume?: number;
  delay?: number;
};

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private currentMusic: AudioBufferSourceNode | null = null;
  private muted = false;

  unlock(): void {
    if (!this.ctx) {
      const Ctor = globalThis.AudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private ready(): { ctx: AudioContext; master: GainNode } | null {
    if (this.muted || !this.ctx || !this.masterGain || this.ctx.state !== "running") return null;
    return { ctx: this.ctx, master: this.masterGain };
  }

  sfx(options: SfxOptions): void {
    const r = this.ready();
    if (!r) return;
    const { ctx, master } = r;
    const t0 = ctx.currentTime + (options.delay ?? 0);
    const duration = options.duration ?? 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.type ?? "square";
    osc.frequency.setValueAtTime(options.freq, t0);
    if (options.endFreq !== undefined && options.endFreq !== options.freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFreq), t0 + duration);
    }
    gain.gain.setValueAtTime(Math.min(1, Math.max(0, options.volume ?? 0.25)), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  async decode(data: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      return await this.ctx.decodeAudioData(data.slice(0));
    } catch {
      return null;
    }
  }

  playBuffer(buffer: AudioBuffer, options: { volume?: number; loop?: boolean } = {}): void {
    const r = this.ready();
    if (!r) return;
    const src = r.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = options.loop ?? false;
    const gain = r.ctx.createGain();
    gain.gain.value = options.volume ?? 1;
    src.connect(gain);
    gain.connect(r.master);
    src.start();
  }

  music(buffer: AudioBuffer | null, volume = 0.6): void {
    this.stopMusic();
    const r = this.ready();
    if (!r || !buffer || !this.musicGain) return;
    const src = r.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    this.musicGain.gain.value = volume;
    src.connect(this.musicGain);
    src.start();
    this.currentMusic = src;
  }

  stopMusic(): void {
    if (!this.currentMusic) return;
    this.currentMusic.stop();
    this.currentMusic.disconnect();
    this.currentMusic = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) this.masterGain.gain.value = muted ? 0 : 1;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  destroy(): void {
    this.stopMusic();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
  }
}
