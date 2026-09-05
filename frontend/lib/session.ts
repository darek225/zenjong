import type { SolitaireLayoutId, SolitaireState } from "./solitaire";
import type { SoloModeId } from "./gameModes";

export interface SavedSolitaireSession {
  version: 1;
  modeId: SoloModeId;
  layoutId: SolitaireLayoutId;
  seed: number;
  elapsed: number;
  savedAt: number;
  state: SolitaireState;
}

const KEY = "zenjong-solo-session-v1";
const layouts = new Set<SolitaireLayoutId>(["turtle", "fortress", "twin_peaks", "butterfly", "dragon", "garden"]);
const modes = new Set<SoloModeId>(["classic", "zen", "score_attack", "daily", "journey", "custom"]);

function validState(value: unknown): value is SolitaireState {
  if (!value || typeof value !== "object") return false;
  const state = value as SolitaireState;
  return Array.isArray(state.tiles) && Array.isArray(state.history) &&
    (state.selected === null || typeof state.selected === "string") && Array.isArray(state.hint) &&
    typeof state.score === "number" && Number.isFinite(state.score) && typeof state.combo === "number" &&
    typeof state.lastMatch === "number" && typeof state.revision === "number" && state.verified === true &&
    typeof state.seed === "number" && layouts.has(state.layoutId);
}

export function loadSession(): SavedSolitaireSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<SavedSolitaireSession> | null;
    if (!value || value.version !== 1 || !modes.has(value.modeId as SoloModeId) ||
      !layouts.has(value.layoutId as SolitaireLayoutId) || typeof value.seed !== "number" ||
      typeof value.elapsed !== "number" || !Number.isFinite(value.elapsed) || !validState(value.state)) return null;
    return value as SavedSolitaireSession;
  } catch { return null; }
}

export function saveSession(session: SavedSolitaireSession): void {
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* private browsing must not stop play */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ }
}