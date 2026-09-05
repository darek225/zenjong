import type { TileType } from "./tileTextures";

export interface SolitaireTile {
  id: string;
  face: TileType;
  x: number;
  z: number;
  layer: number;
}
export interface SolitaireSnapshot {
  tiles: SolitaireTile[];
  score: number;
  combo: number;
  lastMatch: number;
}
export interface SolitaireState extends SolitaireSnapshot {
  selected: string | null;
  hint: string[];
  history: SolitaireSnapshot[];
  reaction: SolitaireTile[];
  revision: number;
}
export type SolitaireAction =
  | { type: "select"; id: string; now: number }
  | { type: "undo" }
  | { type: "hint" }
  | { type: "shuffle"; seed: number }
  | { type: "new"; seed: number };

/** Seeded Fisher-Yates for replayable casual hands (not a competitive RNG protocol). */
function randomSource(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function matchKey(face: TileType): string {
  if (face.startsWith("FLOWER_")) return "FLOWER";
  if (face.startsWith("SEASON_")) return "SEASON";
  return face;
}
export function isFree(tile: SolitaireTile, tiles: SolitaireTile[]): boolean {
  if (!tiles.some(other => other.id === tile.id)) return false;
  let left = false;
  let right = false;
  for (const other of tiles) {
    if (other.id === tile.id) continue;
    const dx = other.x - tile.x;
    const dz = Math.abs(other.z - tile.z);
    if (other.layer > tile.layer && Math.abs(dx) < 0.99 && dz < 0.99) return false;
    if (other.layer === tile.layer && dz < 0.99) {
      if (dx < 0 && dx >= -1.01) left = true;
      if (dx > 0 && dx <= 1.01) right = true;
    }
  }
  return !left || !right;
}
export function findPair(tiles: SolitaireTile[]): [string, string] | null {
  const seen = new Map<string, string>();
  for (const tile of tiles) {
    if (!isFree(tile, tiles)) continue;
    const key = matchKey(tile.face);
    const previous = seen.get(key);
    if (previous) return [previous, tile.id];
    seen.set(key, tile.id);
  }
  return null;
}
export function createLayout(): SolitaireTile[] {
  const tiles: SolitaireTile[] = [];
  // 96 + 32 + 12 + 4: a compact layered pavilion, within the 14×10 felt.
  [[12, 8], [8, 4], [4, 3], [2, 2]].forEach(([columns, rows], layer) => {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        tiles.push({ id: `tile-${tiles.length}`, face: "DOT_1",
          x: column - (columns - 1) / 2, z: row - (rows - 1) / 2, layer });
      }
    }
  });
  return tiles;
}
function deck(): TileType[] {
  const faces: TileType[] = [];
  for (const suit of ["DOT", "BAM", "WAN"]) {
    for (let rank = 1; rank <= 9; rank++) faces.push(`${suit}_${rank}` as TileType);
  }
  faces.push("WIND_EAST", "WIND_SOUTH", "WIND_WEST", "WIND_NORTH", "DRAGON_RED", "DRAGON_GREEN", "DRAGON_WHITE");
  return [...faces.flatMap(face => Array<TileType>(4).fill(face)),
    "FLOWER_PLUM", "FLOWER_ORCHID", "FLOWER_CHRYSANTHEMUM", "FLOWER_BAMBOO",
    "SEASON_SPRING", "SEASON_SUMMER", "SEASON_AUTUMN", "SEASON_WINTER"];
}

/** Assign pairs to a legal removal sequence so a new/shuffled board is solvable. */
export function deal(positions: SolitaireTile[], faces: TileType[], seed: number): SolitaireTile[] {
  const random = randomSource(seed);
  const buckets = new Map<string, TileType[]>();
  for (const face of faces) {
    const key = matchKey(face);
    buckets.set(key, [...(buckets.get(key) ?? []), face]);
  }
  const pairs: TileType[][] = [];
  for (const bucket of Array.from(buckets.values())) {
    if (bucket.length % 2) throw new Error("Unpaired solitaire deck");
    for (let i = 0; i < bucket.length; i += 2) pairs.push(bucket.slice(i, i + 2));
  }
  const orderedPairs = shuffled(pairs, random);
  for (let attempt = 0; attempt < 100; attempt++) {
    let remaining = [...positions];
    const assigned = new Map<string, TileType>();
    for (const pair of orderedPairs) {
      const free = shuffled(remaining.filter(tile => isFree(tile, remaining)), random)
        .sort((a, b) => b.layer - a.layer);
      if (free.length < 2) break;
      assigned.set(free[0].id, pair[0]);
      assigned.set(free[1].id, pair[1]);
      remaining = remaining.filter(tile => tile.id !== free[0].id && tile.id !== free[1].id);
    }
    if (!remaining.length) return positions.map(tile => ({ ...tile, face: assigned.get(tile.id)! }));
  }
  // Keep an existing hand intact rather than silently lose progress.
  return positions;
}
export function createSolitaire(seed = 1): SolitaireState {
  return { tiles: deal(createLayout(), deck(), seed), selected: null, hint: [], history: [],
    score: 0, combo: 0, lastMatch: 0, reaction: [], revision: 0 };
}
function snapshot(state: SolitaireState): SolitaireSnapshot {
  return { tiles: state.tiles, score: state.score, combo: state.combo, lastMatch: state.lastMatch };
}
export function solitaireReducer(state: SolitaireState, action: SolitaireAction): SolitaireState {
  if (action.type === "new") return createSolitaire(action.seed);
  if (action.type === "hint") return { ...state, selected: null, hint: findPair(state.tiles) ?? [] };
  if (action.type === "undo") {
    const previous = state.history[state.history.length - 1];
    return previous ? { ...state, ...previous, selected: null, hint: [], reaction: [],
      history: state.history.slice(0, -1), revision: state.revision + 1 } : state;
  }
  if (action.type === "shuffle") {
    if (!state.tiles.length) return state;
    const tiles = deal(state.tiles, state.tiles.map(tile => tile.face), action.seed);
    return { ...state, tiles, selected: null, hint: [], combo: 0, lastMatch: 0, reaction: [],
      history: [...state.history, snapshot(state)], revision: state.revision + 1 };
  }
  const tile = state.tiles.find(candidate => candidate.id === action.id);
  if (!tile || !isFree(tile, state.tiles)) return state;
  if (state.selected === tile.id) return { ...state, selected: null, hint: [] };
  const first = state.tiles.find(candidate => candidate.id === state.selected);
  if (!first || !isFree(first, state.tiles) || matchKey(first.face) !== matchKey(tile.face)) {
    return { ...state, selected: tile.id, hint: [] };
  }
  const combo = action.now - state.lastMatch < 8000 ? Math.min(state.combo + 1, 5) : 1;
  return { ...state, tiles: state.tiles.filter(candidate => candidate.id !== tile.id && candidate.id !== first.id),
    selected: null, hint: [], score: state.score + 100 * combo, combo, lastMatch: action.now,
    history: [...state.history, snapshot(state)], reaction: [first, tile], revision: state.revision + 1 };
}