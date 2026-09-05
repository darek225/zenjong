import type { TileType } from "./tileTextures";

const groups: Record<string, readonly string[]> = {
  DOT: Array.from({ length: 9 }, (_, i) => String(i + 1)),
  BAM: Array.from({ length: 9 }, (_, i) => String(i + 1)),
  WAN: Array.from({ length: 9 }, (_, i) => String(i + 1)),
  WIND: ["EAST", "SOUTH", "WEST", "NORTH"],
  DRAGON: ["RED", "GREEN", "WHITE"],
  FLOWER: ["PLUM", "ORCHID", "CHRYSANTHEMUM", "BAMBOO"],
  SEASON: ["SPRING", "SUMMER", "AUTUMN", "WINTER"],
};
const faces = Object.entries(groups).flatMap(([prefix, values]) => values.map(value => `${prefix}_${value}`));
const prefixes: Record<string, string> = {
  dots: "DOT", bamboo: "BAM", characters: "WAN", winds: "WIND",
  dragons: "DRAGON", flowers: "FLOWER", seasons: "SEASON",
};

/** Keep physical IDs intact for commands; resolve faces separately for rendering. */
export function getTileType(id: string): TileType | undefined {
  const [suit, value] = id.split("-");
  const face = prefixes[suit] ? `${prefixes[suit]}_${value?.toUpperCase()}` : id;
  return faces.includes(face) ? face as TileType : undefined;
}

export function sortTileIds(ids: string[]): string[] {
  return ids.filter(id => typeof id === "string" && getTileType(id) !== undefined)
    .slice().sort((a, b) => faces.indexOf(getTileType(a)!) - faces.indexOf(getTileType(b)!));
}

export interface NetworkTile { id: string; }
export interface PlayerSnapshot {
  username: string;
  score: number;
  jadeBalance: number;
  pearlBalance: number;
  hand: NetworkTile[];
}
export interface GameSnapshot {
  players: Map<string, PlayerSnapshot>;
  wall: { remaining: number };
  discardPile: { tiles: NetworkTile[] };
  currentTurn: string;
  turnState: { timeLeft: number };
  gameStarted: boolean;
  roundOver: boolean;
}

const numberOrZero = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? value : 0;

function snapshotTiles(value: any): NetworkTile[] {
  if (!value || typeof value[Symbol.iterator] !== "function") return [];
  return Array.from(value as Iterable<any>)
    .filter(tile => tile && typeof tile.id === "string" && getTileType(tile.id))
    .map(tile => ({ id: tile.id }));
}

/** Copy mutable schemas so every patch produces a fresh React snapshot. */
export function snapshotGameState(state: any): GameSnapshot | null {
  if (!state?.players || typeof state.players.entries !== "function") return null;
  const players = new Map<string, PlayerSnapshot>();
  for (const [id, player] of state.players.entries()) {
    if (typeof id !== "string" || !player) continue;
    players.set(id, {
      username: typeof player.username === "string" ? player.username : "Player",
      score: numberOrZero(player.score), jadeBalance: numberOrZero(player.jadeBalance),
      pearlBalance: numberOrZero(player.pearlBalance), hand: snapshotTiles(player.hand),
    });
  }
  return {
    players, wall: { remaining: numberOrZero(state.wall?.remaining) },
    discardPile: { tiles: snapshotTiles(state.discardPile?.tiles) },
    currentTurn: typeof state.currentTurn === "string" ? state.currentTurn : "",
    turnState: { timeLeft: numberOrZero(state.turnState?.timeLeft) },
    gameStarted: state.gameStarted === true, roundOver: state.roundOver === true,
  };
}