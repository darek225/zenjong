"use client";

import { Vector3 } from "three";

export interface Tile {
  id: string;
  position: Vector3;
  rotation: Vector3;
  isFaceUp?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  isBlockedTop?: boolean;
  isBlockedLeft?: boolean;
  isBlockedRight?: boolean;
}

/**
 * Mahjong Rules Engine
 * Implements logic for determining if a tile can be legally selected
 */

/**
 * Check if a tile's top face is unblocked
 * A tile's top is blocked if another tile is positioned directly above it
 */
export function isTopUnblocked(tile: Tile, allTiles: Tile[]): boolean {
  if (!tile || !tile.position) return true;
  const tilePos = tile.position;
  const tolerance = 0.5; // Distance threshold to detect overlap

  for (const otherTile of (allTiles ?? [])) {
    if (!otherTile || otherTile.id === tile.id) continue;
    if (!otherTile.position) continue;

    const otherPos = otherTile.position;
    const otherRot = otherTile.rotation || new Vector3(0, 0, 0);

    // Check if another tile is above this tile (y position higher)
    const yDiff = otherPos.y - tilePos.y;

    // Tile is considered on top if it's within tolerance above and within x-z bounds
    if (yDiff > 0 && yDiff < 0.8) {
      const xDiff = Math.abs(otherPos.x - tilePos.x);
      const zDiff = Math.abs(otherPos.z - tilePos.z);

      if (xDiff < 0.6 && zDiff < 0.6) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a tile's left side is free
 * Left side is defined as the negative X direction relative to tile orientation
 */
export function isLeftSideFree(tile: Tile, allTiles: Tile[]): boolean {
  if (!tile || !tile.position) return true;
  const tilePos = tile.position;
  const tileRot = tile.rotation || new Vector3(0, 0, 0);
  const tileWidth = 1;
  const tolerance = 0.5;

  // Check tiles to the left (negative X in tile's local space)
  for (const otherTile of (allTiles ?? [])) {
    if (!otherTile || otherTile.id === tile.id) continue;
    if (!otherTile.position) continue;
    if (!isTopUnblocked(otherTile, allTiles)) continue; // Only check tiles not blocked on top

    const otherPos = otherTile.position;
    const otherRot = otherTile.rotation || new Vector3(0, 0, 0);

    // Calculate relative position in tile's local coordinate system
    const deltaX = otherPos.x - tilePos.x;
    const deltaZ = otherPos.z - tilePos.z;
    const deltaY = otherPos.y - tilePos.y;

    // Project onto tile's left direction (negative X axis after rotation)
    const cosY = Math.cos(tileRot.y);
    const sinY = Math.sin(tileRot.y);

    const localLeft = deltaX * (-cosY) + deltaZ * sinY;
    const localRight = deltaX * cosY - deltaZ * sinY;

    // Check if tile is to the left and adjacent
    if (localLeft > 0 && localLeft < tileWidth + tolerance && Math.abs(deltaY) < 0.3) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a tile's right side is free
 * Right side is defined as the positive X direction relative to tile orientation
 */
export function isRightSideFree(tile: Tile, allTiles: Tile[]): boolean {
  if (!tile || !tile.position) return true;
  const tilePos = tile.position;
  const tileRot = tile.rotation || new Vector3(0, 0, 0);
  const tileWidth = 1;
  const tolerance = 0.5;

  // Check tiles to the right (positive X in tile's local space)
  for (const otherTile of (allTiles ?? [])) {
    if (!otherTile || otherTile.id === tile.id) continue;
    if (!otherTile.position) continue;
    if (!isTopUnblocked(otherTile, allTiles)) continue; // Only check tiles not blocked on top

    const otherPos = otherTile.position;
    const deltaX = otherPos.x - tilePos.x;
    const deltaZ = otherPos.z - tilePos.z;
    const deltaY = otherPos.y - tilePos.y;

    // Project onto tile's right direction (positive X axis after rotation)
    const cosY = Math.cos(tileRot.y);
    const sinY = Math.sin(tileRot.y);

    const localRight = deltaX * cosY + deltaZ * (-sinY);

    // Check if tile is to the right and adjacent
    if (localRight > 0 && localRight < tileWidth + tolerance && Math.abs(deltaY) < 0.3) {
      return false;
    }
  }

  return true;
}

/**
 * Main function: Determine if a tile can be legally selected
 * A tile can be selected if:
 * 1. Its top face is completely unblocked, AND
 * 2. Either its left or right side is free
 * 
 * @param tileId - The ID of the tile to check
 * @param allTiles - All tiles currently on the board
 * @param tileMap - Optional map of tile IDs to Tile objects for efficient lookup
 * @returns boolean indicating if the tile can be selected
 */
export function isTileFree(
  tileId: string,
  allTiles: Tile[],
  tileMap?: Map<string, Tile>
): boolean {
  const targetTile = tileMap?.get(tileId) || allTiles.find(t => t.id === tileId);
  
  if (!targetTile) {
    return false;
  }
  
  // Tile must be face up to be selectable
  if (targetTile.isFaceUp === false) {
    return false;
  }
  
  // Condition 1: Top face must be unblocked
  if (!isTopUnblocked(targetTile, allTiles)) {
    return false;
  }
  
  // Condition 2: Either left or right side must be free
  const leftFree = isLeftSideFree(targetTile, allTiles);
  const rightFree = isRightSideFree(targetTile, allTiles);
  
  if (!leftFree && !rightFree) {
    return false;
  }
  
  return true;
}

/**
 * Get all tiles that are currently free to be selected
 * Defensive: filters out null/undefined entries before calling isTileFree
 */
export function getFreeTiles(allTiles: Tile[], tileMap?: Map<string, Tile>): Tile[] {
  // Defensive: filter null/undefined entries to prevent .reduce/.filter crashes
  const safeTiles = (allTiles ?? []).filter(
    (tile): tile is Tile => tile !== null && tile !== undefined
  );
  return safeTiles.filter((tile) => {
    if (!tile || !tile.id) return false;
    return isTileFree(tile.id, safeTiles, tileMap);
  });
}

/**
 * Validate a move (taking tiles) from the board
 * Returns true if both tiles in a pair are free and matching
 */
export function isValidTilePair(
  tileId1: string,
  tileId2: string,
  allTiles: Tile[],
  tileMap?: Map<string, Tile>
): boolean {
  if (tileId1 === tileId2) return false;
  if (!tileId1 || !tileId2) return false;

  // Defensive: filter null/undefined entries before isTileFree
  const safeTiles = (allTiles ?? []).filter(
    (tile): tile is Tile => tile !== null && tile !== undefined
  );

  const tile1Free = isTileFree(tileId1, safeTiles, tileMap);
  const tile2Free = isTileFree(tileId2, safeTiles, tileMap);

  return tile1Free && tile2Free;
}