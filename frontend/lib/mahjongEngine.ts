/**
 * Mahjong Engine - Core state machine for tile match logic
 * Now supports multiplayer with ownership flags to prevent race conditions
 */
import { PlayerRole } from './supabaseRealtime';

export type SelectionSource = 'local' | 'remote';

export interface MahjongTile {
  id: string;
  type: string;
  value: number;
  name: string;
  claimedBy: PlayerRole;
  selectionSource: SelectionSource;
  isMatched: boolean;
  isHighlighted: boolean;
}

export type MatchEventSource = 'LOCAL_CLICK' | 'WEBSOCKET';

export interface TileMatchEvent {
  tile1Id: string;
  tile2Id: string;
  source: MatchEventSource;
  claimedBy: PlayerRole;
  timestamp: number;
}

export interface BoardShuffleEvent {
  newBoard: MahjongTile[];
  triggeredBy: PlayerRole;
  source: MatchEventSource;
  timestamp: number;
}

export class MahjongEngine {
  private tiles: MahjongTile[] = [];
  private selectedTiles: string[] = [];
  private claimTimeoutMs = 500;
  private claimTimestamps: Map<string, number> = new Map();

  initializeBoard(initialTiles: MahjongTile[]): void {
    this.tiles = initialTiles.map((tile) => ({
      ...tile,
      claimedBy: null,
      selectionSource: 'local',
      isMatched: false,
      isHighlighted: false,
    }));
    this.selectedTiles = [];
  }

  getTiles(): MahjongTile[] {
    return this.tiles;
  }

  getTile(tileId: string): MahjongTile | undefined {
    return this.tiles.find((t) => t.id === tileId);
  }

  tryClaimTile(tileId: string, role: PlayerRole, source: SelectionSource = 'local'): boolean {
    const tile = this.getTile(tileId);
    if (!tile || tile.isMatched) return false;

    if (tile.claimedBy && tile.claimedBy !== role) {
      const claimTime = this.claimTimestamps.get(tileId);
      if (claimTime && Date.now() - claimTime < this.claimTimeoutMs) {
        return false;
      }
    }

    tile.claimedBy = role;
    tile.selectionSource = source;
    tile.isHighlighted = true;
    this.claimTimestamps.set(tileId, Date.now());

    return true;
  }

  releaseClaim(tileId: string, role: PlayerRole): void {
    const tile = this.getTile(tileId);
    if (tile && tile.claimedBy === role) {
      tile.claimedBy = null;
      tile.isHighlighted = false;
      this.claimTimestamps.delete(tileId);
    }
  }

  areTilesMatching(tile1: MahjongTile, tile2: MahjongTile): boolean {
    if (tile1.id === tile2.id) return false;
    if (tile1.isMatched || tile2.isMatched) return false;

    if (tile1.type === tile2.type) {
      if (tile1.type === 'winds' || tile1.type === 'dragons' ||
          tile1.type === 'flowers' || tile1.type === 'seasons') {
        return tile1.name === tile2.name;
      }
      return tile1.value === tile2.value;
    }
    return false;
  }

  handleLocalMatch(tile1Id: string, tile2Id: string, role: PlayerRole): TileMatchEvent | null {
    const tile1 = this.getTile(tile1Id);
    const tile2 = this.getTile(tile2Id);

    if (!tile1 || !tile2) return null;
    if (!this.areTilesMatching(tile1, tile2)) return null;

    const claim1 = this.tryClaimTile(tile1Id, role, 'local');
    const claim2 = this.tryClaimTile(tile2Id, role, 'local');

    if (!claim1 || !claim2) {
      this.releaseClaim(tile1Id, role);
      this.releaseClaim(tile2Id, role);
      return null;
    }

    tile1.isMatched = true;
    tile2.isMatched = true;

    return {
      tile1Id,
      tile2Id,
      source: 'LOCAL_CLICK',
      claimedBy: role,
      timestamp: Date.now(),
    };
  }

  handleRemoteMatch(event: TileMatchEvent): void {
    const tile1 = this.getTile(event.tile1Id);
    const tile2 = this.getTile(event.tile2Id);
    if (!tile1 || !tile2) return;

    tile1.claimedBy = event.claimedBy;
    tile1.isMatched = true;
    tile1.isHighlighted = true;
    tile1.selectionSource = 'remote';

    tile2.claimedBy = event.claimedBy;
    tile2.isMatched = true;
    tile2.isHighlighted = true;
    tile2.selectionSource = 'remote';
  }

  shuffleBoard(triggeredBy: PlayerRole, source: MatchEventSource = 'LOCAL_CLICK'): BoardShuffleEvent {
    const unmatched = this.tiles.filter((t) => !t.isMatched);
    for (let i = unmatched.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unmatched[i], unmatched[j]] = [unmatched[j], unmatched[i]];
    }

    let unmatchedIdx = 0;
    this.tiles = this.tiles.map((t) => {
      if (t.isMatched) return t;
      return { ...unmatched[unmatchedIdx++], claimedBy: null, isHighlighted: false, selectionSource: 'local' };
    });

    return {
      newBoard: [...this.tiles],
      triggeredBy,
      source,
      timestamp: Date.now(),
    };
  }

  handleRemoteShuffle(event: BoardShuffleEvent): void {
    this.tiles = event.newBoard.map((t) => ({
      ...t,
      claimedBy: null,
      isHighlighted: false,
      selectionSource: 'remote',
    }));
  }

  hasValidMoves(): boolean {
    const unmatched = this.tiles.filter((t) => !t.isMatched);
    for (let i = 0; i < unmatched.length; i++) {
      for (let j = i + 1; j < unmatched.length; j++) {
        if (this.areTilesMatching(unmatched[i], unmatched[j])) {
          return true;
        }
      }
    }
    return false;
  }

  getRemainingCount(): number {
    return this.tiles.filter((t) => !t.isMatched).length;
  }

  reset(): void {
    this.tiles = [];
    this.selectedTiles = [];
    this.claimTimestamps.clear();
  }
}

let engineInstance: MahjongEngine | null = null;

export function getMahjongEngine(): MahjongEngine {
  if (!engineInstance) {
    engineInstance = new MahjongEngine();
  }
  return engineInstance;
}