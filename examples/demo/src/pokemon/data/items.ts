export type ItemKind = "heal" | "cure" | "ball";

export type ItemDef = {
  key: string;
  displayName: string;
  kind: ItemKind;
  price: number;
  description: string;
};

export const ITEMS: Record<string, ItemDef> = {
  potion: { key: "potion", displayName: "POTION", kind: "heal", price: 200, description: "Restores 20 HP." },
  "super-potion": { key: "super-potion", displayName: "SUPER POTION", kind: "heal", price: 700, description: "Restores 50 HP." },
  "hyper-potion": { key: "hyper-potion", displayName: "HYPER POTION", kind: "heal", price: 1200, description: "Restores 120 HP." },
  antidote: { key: "antidote", displayName: "ANTIDOTE", kind: "cure", price: 150, description: "Cures poisoning." },
  "paralyze-heal": { key: "paralyze-heal", displayName: "PARALYZ HEAL", kind: "cure", price: 200, description: "Cures paralysis." },
  awakening: { key: "awakening", displayName: "AWAKENING", kind: "cure", price: 250, description: "Wakes a sleeping monster." },
  "poke-ball": { key: "poke-ball", displayName: "POKE BALL", kind: "ball", price: 200, description: "A device for catching wild monsters." },
  "great-ball": { key: "great-ball", displayName: "GREAT BALL", kind: "ball", price: 600, description: "A good ball with a higher catch rate." },
  "ultra-ball": { key: "ultra-ball", displayName: "ULTRA BALL", kind: "ball", price: 1200, description: "An excellent ball with a superb catch rate." },
};

export const MART_STOCK = ["poke-ball", "great-ball", "potion", "super-potion", "antidote", "paralyze-heal", "awakening"] as const;

export function itemName(key: string): string {
  return ITEMS[key]?.displayName ?? key.toUpperCase();
}
