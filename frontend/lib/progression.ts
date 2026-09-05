export interface LocalProfile {
  version: 1; jade: number; pearls: number; xp: number; level: number;
  games: number; wins: number; bestScore: number; bestTime: number | null;
  ownedItems: string[]; equipped: Record<string, string>; dailyClaim: string | null;
  achievements: string[]; journey: Record<string, { stars: number; bestScore: number }>;
  dailyRecords: Record<string, { seed: number; score: number; time: number; completed: boolean }>;
  dailyStreak: number;
  settings: { reducedMotion: boolean; highContrast: boolean; largeTiles: boolean; colorSafe: boolean; ambientEffects: boolean; tutorialSeen: boolean };
}
const KEY = "zenjong-profile-v1";
export const DEFAULT_PROFILE: LocalProfile = { version: 1, jade: 1000, pearls: 0, xp: 0, level: 1, games: 0, wins: 0, bestScore: 0, bestTime: null, ownedItems: ["default-jade", "classic_green", "default-avatar"], equipped: { tileset: "default-jade", table_skin: "classic_green", avatar: "default-avatar" }, dailyClaim: null, achievements: [], journey: {}, dailyRecords: {}, dailyStreak: 0, settings: { reducedMotion: false, highContrast: false, largeTiles: false, colorSafe: true, ambientEffects: true, tutorialSeen: false } };
export function loadProfile(): LocalProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (value?.version === 1 && typeof value.jade === "number" && Array.isArray(value.ownedItems)) return { ...DEFAULT_PROFILE, ...value, achievements: Array.isArray(value.achievements) ? value.achievements : [], journey: value.journey && typeof value.journey === "object" ? value.journey : {}, dailyRecords: value.dailyRecords && typeof value.dailyRecords === "object" ? value.dailyRecords : {}, dailyStreak: typeof value.dailyStreak === "number" ? value.dailyStreak : 0, settings: { ...DEFAULT_PROFILE.settings, ...(value.settings ?? {}) } }; } catch { /* reset corrupt local saves */ }
  return DEFAULT_PROFILE;
}
export function saveProfile(profile: LocalProfile) { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* offline/private mode */ } }
export const LOCAL_CATALOG = [
  { id: "default-jade", name: "Natural Jade", item_type: "tileset", price: 0, currency_type: "jade", asset_url: "" },
  { id: "default-obsidian", name: "Obsidian Gold", item_type: "tileset", price: 250, currency_type: "jade", asset_url: "" },
  { id: "cyberpunk-neon", name: "Cyberpunk Neon", item_type: "tileset", price: 350, currency_type: "jade", asset_url: "" },
  { id: "carved-walnut", name: "Carved Walnut", item_type: "tileset", price: 300, currency_type: "jade", asset_url: "" },
  { id: "frosted-glass", name: "Frosted Glass", item_type: "tileset", price: 450, currency_type: "jade", asset_url: "" },
  { id: "classic_green", name: "Jade Lantern Pavilion", item_type: "table_skin", price: 0, currency_type: "jade", asset_url: "" },
  { id: "nature_stump", name: "Rain Forest Pavilion", item_type: "table_skin", price: 500, currency_type: "jade", asset_url: "" },
  { id: "mystic_sanctuary", name: "Deep Space Station", item_type: "table_skin", price: 750, currency_type: "jade", asset_url: "" },
  { id: "temple_courtyard", name: "Cloud Temple", item_type: "table_skin", price: 650, currency_type: "jade", asset_url: "" },
  { id: "spotlight_parlor", name: "Golden Parlor", item_type: "table_skin", price: 900, currency_type: "jade", asset_url: "" },
  { id: "default-avatar", name: "Jade Scholar", item_type: "avatar", price: 0, currency_type: "jade", asset_url: "" },
];
export const JOURNEY_STAGES = [
  { id: "intro", name: "First Light", layout: "turtle", target: 5000, reward: 100, requires: null },
  { id: "garden", name: "Quiet Garden", layout: "garden", target: 7000, reward: 150, requires: "intro" },
  { id: "fortress", name: "Stone Fortress", layout: "fortress", target: 8000, reward: 200, requires: "garden" },
  { id: "peaks", name: "Twin Peaks", layout: "twin_peaks", target: 9000, reward: 250, requires: "fortress" },
  { id: "butterfly", name: "Butterfly Gate", layout: "butterfly", target: 10000, reward: 300, requires: "peaks" },
  { id: "dragon", name: "Dragon Ascendant", layout: "dragon", target: 11000, reward: 400, requires: "butterfly" },
] as const;
export function isJourneyStageUnlocked(profile: LocalProfile, stageId: string): boolean {
  const stage = JOURNEY_STAGES.find(candidate => candidate.id === stageId);
  return !!stage && (!stage.requires || (profile.journey[stage.requires]?.stars ?? 0) > 0);
}
export function recordDailyResult(profile: LocalProfile, key: string, seed: number, score: number, time: number): LocalProfile {
  const previous = profile.dailyRecords[key];
  const record = { seed, score: Math.max(score, previous?.score ?? 0), time: previous ? Math.min(time, previous.time) : time, completed: true };
  const wasClaimed = profile.dailyClaim === key;
  return { ...profile, dailyRecords: { ...profile.dailyRecords, [key]: record }, dailyStreak: wasClaimed ? profile.dailyStreak : profile.dailyStreak + 1 };
}
export function buyLocalItem(profile: LocalProfile, itemId: string): LocalProfile | null {
  const item = LOCAL_CATALOG.find(candidate => candidate.id === itemId);
  if (!item || profile.ownedItems.includes(itemId) || profile.jade < item.price) return null;
  return { ...profile, jade: profile.jade - item.price, ownedItems: [...profile.ownedItems, itemId] };
}
export function equipLocalItem(profile: LocalProfile, itemId: string): LocalProfile | null {
  const item = LOCAL_CATALOG.find(candidate => candidate.id === itemId);
  if (!item || !profile.ownedItems.includes(itemId)) return null;
  return { ...profile, equipped: { ...profile.equipped, [item.item_type]: itemId } };
}
export function awardWin(profile: LocalProfile, reward: number, score: number, elapsed: number, modeId = "classic", dateKey?: string): LocalProfile {
  const dailyAlreadyClaimed = modeId === "daily" && !!dateKey && profile.dailyClaim === dateKey;
  const achievements = new Set(profile.achievements);
  achievements.add("first_clear"); if (profile.wins + 1 >= 5) achievements.add("five_clears"); if (score >= 10000) achievements.add("score_10000");
  if (modeId === "daily" && dateKey && profile.dailyClaim !== dateKey) achievements.add("daily_challenge");
  const dailyClaim = modeId === "daily" && dateKey ? dateKey : profile.dailyClaim;
  const payout = dailyAlreadyClaimed ? 0 : reward;
  const next = { ...profile, games: profile.games + 1, wins: profile.wins + 1, jade: profile.jade + payout, xp: profile.xp + payout, bestScore: Math.max(profile.bestScore, score), bestTime: profile.bestTime === null ? elapsed : Math.min(profile.bestTime, elapsed), achievements: Array.from(achievements), dailyClaim };
  next.level = Math.max(1, Math.floor(next.xp / 500) + 1); return next;
}