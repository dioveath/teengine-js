import type { AudioSystem } from "teengine";

const A4 = 440;
const SEMITONES: Record<string, number> = {
  C: -9, "C#": -8, Db: -8, D: -7, "D#": -6, Eb: -6, E: -5, F: -4,
  "F#": -3, Gb: -3, G: -2, "G#": -1, Ab: -1, A: 0, "A#": 1, Bb: 1, B: 2,
};

export function noteHz(note: string): number {
  const match = /^([A-G][#b]?)(\d)$/.exec(note);
  if (!match) throw new Error(`Invalid note: ${note}`);
  return A4 * Math.pow(2, (SEMITONES[match[1]!]! + (Number(match[2]) - 4) * 12) / 12);
}

export type MelodyNote = [note: string | null, beats: number];

export function playMelody(
  audio: AudioSystem,
  notes: MelodyNote[],
  options: { bpm?: number; type?: OscillatorType; volume?: number; delay?: number } = {},
): void {
  const bpm = options.bpm ?? 140;
  const beat = 60 / bpm / 2;
  let t = options.delay ?? 0.01;
  for (const [note, beats] of notes) {
    if (note) {
      audio.sfx({
        freq: noteHz(note),
        duration: beat * beats * 0.9,
        volume: options.volume ?? 0.22,
        type: options.type ?? "square",
        delay: t,
      });
    }
    t += beat * beats;
  }
}

export const Jingle = {
  cursor(audio: AudioSystem): void {
    audio.sfx({ freq: 880, duration: 0.04, volume: 0.12 });
  },
  confirm(audio: AudioSystem): void {
    playMelody(audio, [["C5", 1], ["E5", 1]], { volume: 0.15 });
  },
  cancel(audio: AudioSystem): void {
    audio.sfx({ freq: 330, endFreq: 220, duration: 0.09, volume: 0.14 });
  },
  hit(audio: AudioSystem, superEffective: boolean): void {
    if (superEffective) {
      audio.sfx({ freq: 160, endFreq: 60, duration: 0.18, volume: 0.3, type: "sawtooth" });
    } else {
      audio.sfx({ freq: 220, endFreq: 90, duration: 0.1, volume: 0.2, type: "square" });
    }
  },
  faint(audio: AudioSystem): void {
    audio.sfx({ freq: 500, endFreq: 60, duration: 0.45, volume: 0.24, type: "triangle" });
  },
  heal(audio: AudioSystem): void {
    playMelody(audio, [
      ["B4", 1], ["E5", 1], ["G5", 1], ["B5", 2],
    ], { volume: 0.16, type: "square" });
  },
  levelUp(audio: AudioSystem): void {
    playMelody(audio, [
      ["C5", 1], ["E5", 1], ["G5", 1], ["C6", 2],
    ], { volume: 0.18 });
  },
  ballThrow(audio: AudioSystem): void {
    audio.sfx({ freq: 300, endFreq: 700, duration: 0.15, volume: 0.18, type: "sine" });
  },
  caught(audio: AudioSystem): void {
    playMelody(audio, [
      ["G4", 1], ["C5", 1], ["E5", 1], ["G5", 3],
    ], { volume: 0.2 });
  },
  badge(audio: AudioSystem): void {
    playMelody(audio, [
      ["C5", 2], ["G4", 1], ["A4", 1], ["B4", 2], ["C6", 4],
    ], { volume: 0.2, type: "square" });
  },
};

export type Track = {
  bpm: number;
  waveform: OscillatorType;
  volume: number;
  bassWaveform?: OscillatorType;
  notes: Array<string | null>;
};

const TOWN: Track = {
  bpm: 104,
  waveform: "triangle",
  volume: 0.11,
  notes: [
    "C4", "E4", "G4", "C5", "G4", "E4", "F4", "A4",
    "A4", "F4", "D4", "F4", "G4", "E4", "C4", null,
    "D4", "F4", "A4", "D5", "A4", "F4", "E4", "G4",
    "C5", "G4", "E4", "G4", "C4", null, null, null,
  ],
};

const ROUTE: Track = {
  bpm: 132,
  waveform: "square",
  volume: 0.07,
  notes: [
    "E4", null, "E4", "G4", "A4", null, "G4", null,
    "E4", null, "D4", "E4", "C4", null, null, null,
    "F4", null, "F4", "A4", "B4", null, "A4", null,
    "G4", "E4", "D4", "E4", "C4", null, null, null,
  ],
};

const BATTLE: Track = {
  bpm: 168,
  waveform: "square",
  volume: 0.075,
  notes: [
    "A3", "A3", "A4", "A3", "E4", "A3", "C5", "B4",
    "A4", "E4", "C4", "E4", "A4", null, "G4", "E4",
    "F3", "F3", "F4", "F3", "C4", "F3", "A4", "G4",
    "F4", "C4", "A3", "C4", "F4", "E4", "D4", "C4",
  ],
};

const GYM: Track = {
  bpm: 152,
  waveform: "sawtooth",
  volume: 0.055,
  notes: [
    "D3", "D4", "A3", "D4", "F4", "D4", "A3", "F3",
    "C3", "C4", "G3", "C4", "E4", "C4", "G3", "E3",
    "B2", "B3", "F#3", "B3", "D4", "B3", "F#3", "D3",
    "A2", "A3", "E3", "A3", "C#4", "A3", "E3", "C#3",
  ],
};

export const TRACKS: Record<string, Track> = { town: TOWN, route: ROUTE, battle: BATTLE, gym: GYM };

export class MusicBox {
  private currentKey: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private noteIndex = 0;
  private nextTime = 0;

  constructor(private readonly audio: AudioSystem) {}

  play(key: string | null): void {
    if (this.currentKey === key) return;
    this.stop();
    this.currentKey = key;
    this.noteIndex = 0;
    this.nextTime = 0;
    if (key) this.schedule();
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.currentKey = null;
  }

  private schedule(): void {
    if (!this.currentKey) return;
    const now = this.audio.now;
    if (now === null) {
      this.timer = setTimeout(() => this.schedule(), 300);
      return;
    }
    if (this.nextTime < now) this.nextTime = now + 0.05;
    const track = TRACKS[this.currentKey]!;
    const secondsPerBeat = 30 / track.bpm;
    while (this.nextTime < now + 0.6) {
      const note = track.notes[this.noteIndex % track.notes.length];
      if (note) {
        this.audio.sfx({
          type: track.waveform,
          freq: noteHz(note),
          duration: secondsPerBeat * 0.85,
          volume: track.volume,
          at: this.nextTime,
        });
        this.audio.sfx({
          type: track.bassWaveform ?? "triangle",
          freq: noteHz(note) / 2,
          duration: secondsPerBeat * 0.85,
          volume: track.volume * 0.8,
          at: this.nextTime,
        });
      }
      this.noteIndex++;
      this.nextTime += secondsPerBeat;
    }
    this.timer = setTimeout(() => this.schedule(), 200);
  }
}
