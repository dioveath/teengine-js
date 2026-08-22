import type { MonData } from "./mon.js";

const SAVE_KEY = "velmora-save-v1";

export type SaveData = {
  version: 1;
  party: MonData[];
  storage: MonData[];
  bag: Array<[string, number]>;
  money: number;
  map: string;
  x: number;
  y: number;
  dir: number;
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  playTicks: number;
};

export const GameSave = {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1 || !Array.isArray(data.party) || data.party.length === 0) return null;
      return data;
    } catch {
      return null;
    }
  },

  persist(data: SaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {}
  },

  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
  },
};
