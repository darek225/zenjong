import type { SolitaireLayoutId } from "./solitaire";

export type SoloModeId = "classic" | "zen" | "score_attack" | "daily" | "journey" | "custom";
export interface SoloMode {
  id: SoloModeId;
  name: string;
  description: string;
  layoutId: SolitaireLayoutId;
  timeLimit: number | null;
  multiplier: number;
  assistance: boolean;
  reward: number;
  available: boolean;
}
export interface SoloRules {
  modeId: SoloModeId;
  layoutId: SolitaireLayoutId;
  timeLimit: number | null;
  hintsRemaining: number | null;
  shufflesRemaining: number | null;
  scoreMultiplier: number;
  comboWindowMs: number;
  rewardEligible: boolean;
  recordsEligible: boolean;
}
export const SOLO_MODES: SoloMode[] = [
  { id: "classic", name: "Classic", description: "The complete 144-tile table with relaxed time tracking.", layoutId: "turtle", timeLimit: null, multiplier: 1, assistance: true, reward: 100, available: true },
  { id: "zen", name: "Zen", description: "No clock, no pressure. Learn the shapes and clear the table.", layoutId: "garden", timeLimit: null, multiplier: 1, assistance: true, reward: 75, available: true },
  { id: "score_attack", name: "Score Attack", description: "Race the clock and protect your combo for a higher Jade payout.", layoutId: "fortress", timeLimit: 600, multiplier: 2, assistance: false, reward: 175, available: true },
  { id: "daily", name: "Daily Challenge", description: "One deterministic challenge for everyone, seeded by today.", layoutId: "butterfly", timeLimit: 900, multiplier: 3, assistance: false, reward: 250, available: true },
  { id: "journey", name: "Journey", description: "A curated route through increasingly complex table shapes.", layoutId: "twin_peaks", timeLimit: null, multiplier: 1.5, assistance: true, reward: 150, available: true },
  { id: "custom", name: "Custom Table", description: "Choose a verified layout and make the rules your own.", layoutId: "dragon", timeLimit: null, multiplier: 1, assistance: true, reward: 50, available: true },
];
export const LAYOUT_OPTIONS: { id: SolitaireLayoutId; name: string; description: string }[] = [
  { id: "turtle", name: "Turtle", description: "The classic layered silhouette." },
  { id: "fortress", name: "Fortress", description: "Broad walls with a compact crown." },
  { id: "twin_peaks", name: "Twin Peaks", description: "Two raised towers divide the table." },
  { id: "butterfly", name: "Butterfly", description: "Open wings around a central spine." },
  { id: "dragon", name: "Dragon", description: "A long, rising ceremonial form." },
  { id: "garden", name: "Garden", description: "Wide terraces with a quiet center." },
];
export function getSoloMode(id: SoloModeId) { return SOLO_MODES.find(mode => mode.id === id) ?? SOLO_MODES[0]; }
export function createSoloRules(modeId: SoloModeId, layoutId: SolitaireLayoutId, customTimer?: number): SoloRules {
  const mode = getSoloMode(modeId);
  if (modeId === "zen") return { modeId, layoutId, timeLimit: null, hintsRemaining: null, shufflesRemaining: null, scoreMultiplier: 1, comboWindowMs: 12000, rewardEligible: true, recordsEligible: false };
  if (modeId === "score_attack") return { modeId, layoutId, timeLimit: 600, hintsRemaining: 0, shufflesRemaining: 0, scoreMultiplier: 2, comboWindowMs: 5000, rewardEligible: true, recordsEligible: true };
  if (modeId === "daily") return { modeId, layoutId, timeLimit: 900, hintsRemaining: 0, shufflesRemaining: 0, scoreMultiplier: 3, comboWindowMs: 5000, rewardEligible: true, recordsEligible: true };
  if (modeId === "custom") return { modeId, layoutId, timeLimit: customTimer && customTimer > 0 ? customTimer : null, hintsRemaining: 3, shufflesRemaining: 2, scoreMultiplier: 1, comboWindowMs: 8000, rewardEligible: false, recordsEligible: false };
  return { modeId, layoutId, timeLimit: mode.timeLimit, hintsRemaining: null, shufflesRemaining: null, scoreMultiplier: mode.multiplier, comboWindowMs: 8000, rewardEligible: true, recordsEligible: modeId === "classic" || modeId === "journey" };
}
export function dailySeed(date = new Date()) {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  let hash = 2166136261; for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}