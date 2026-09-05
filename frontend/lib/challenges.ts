import type { SolitaireLayoutId } from "./solitaire";
import type { SoloModeId } from "./gameModes";

export interface ChallengeDefinition {
  mode: SoloModeId;
  layoutId: SolitaireLayoutId;
  seed: number;
  timer: number | null;
  ranked: boolean;
  dailyDate?: string;
}
const layouts = new Set<SolitaireLayoutId>(["turtle", "fortress", "twin_peaks", "butterfly", "dragon", "garden"]);
const modes = new Set<SoloModeId>(["classic", "zen", "score_attack", "daily", "journey", "custom"]);
const layoutCodes: Record<SolitaireLayoutId, string> = { turtle: "TURTLE", fortress: "FORTRESS", twin_peaks: "PEAKS", butterfly: "BUTTERFLY", dragon: "DRAGON", garden: "GARDEN" };
const codeLayouts = Object.fromEntries(Object.entries(layoutCodes).map(([key, value]) => [value, key])) as Record<string, SolitaireLayoutId>;
export function dateKey(date = new Date()) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`; }
export function dailyChallenge(date = new Date(), seed: number): ChallengeDefinition { return { mode: "daily", layoutId: "butterfly", seed, timer: 900, ranked: true, dailyDate: dateKey(date) }; }
export function encodeChallenge(challenge: ChallengeDefinition): string {
  const mode = challenge.mode.toUpperCase();
  const layout = layoutCodes[challenge.layoutId];
  const timer = challenge.timer ?? 0;
  return `ZJ1-${mode}-${layout}-${challenge.seed >>> 0}-${timer}`;
}
export function decodeChallenge(raw: string): ChallengeDefinition | null {
  const parts = raw.trim().toUpperCase().split("-");
  if (parts.length !== 5 || parts[0] !== "ZJ1") return null;
  const mode = parts[1].toLowerCase() as SoloModeId;
  const layoutId = codeLayouts[parts[2]];
  if (!parts[3] || !/^\d+$/.test(parts[3]) || !parts[4] || !/^\d+$/.test(parts[4])) return null;
  const seed = Number(parts[3]); const timer = Number(parts[4]);
  if (!modes.has(mode) || !layouts.has(layoutId) || !Number.isSafeInteger(seed) || seed < 0 || !Number.isInteger(timer) || timer < 0 || timer > 7200) return null;
  return { mode: mode === "daily" ? "custom" : mode, layoutId, seed, timer: timer || null, ranked: false };
}