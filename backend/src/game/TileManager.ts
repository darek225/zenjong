"use strict";

/**
 * TileManager - Handles the 144-tile Mahjong deck management
 * Includes:
 *  - 4 types of suits: Bamboo, Characters, Dots, Flowers (bonus)
 *  - 3 types of characters: 1-9 characters (36 tiles)
 *  - 3 types of bamboo: 1-9 bamboo (36 tiles) 
 *  - 3 types of dots: 1-9 dots (36 tiles)
 *  - 28 honor tiles: 4 copies of 4 winds and 3 dragons
 *  - 8 bonus tiles: 4 flowers, 4 seasons
 * 
 * Fisher-Yates shuffle algorithm for proper randomization
 * Grid coordinate generator for standard Mahjong board layout
 */
export interface DeckTile {
  id: string;
  type: string;
  value: number;
  name: string;
}

export class TileManager {
  // Tile types
  public static readonly SUITS = {
    BAMBOO: 'bamboo',
    CHARACTERS: 'characters',
    DOTS: 'dots',
    FLOWERS: 'flowers', // bonus
    SEASONS: 'seasons', // bonus
    WINDS: 'winds',     // honors
    DRAGONS: 'dragons'  // honors
  };

  // Tile values
  public static readonly BAMBOO_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  public static readonly CHARACTERS_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  public static readonly DOTS_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  public static readonly WINDS = ['East', 'South', 'West', 'North'];
  public static readonly DRAGONS = ['Red', 'Green', 'White'];
  public static readonly FLOWERS = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
  public static readonly SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

  // Create complete 144-tile deck
  public static createDeck(): DeckTile[] {
    const deck: DeckTile[] = [];
    for (const type of [this.SUITS.BAMBOO, this.SUITS.CHARACTERS, this.SUITS.DOTS]) {
      for (let value = 1; value <= 9; value++) {
        for (let copy = 0; copy < 4; copy++) {
          deck.push({ id: `${type}-${value}-${copy}`, type, value, name: "" });
        }
      }
    }
    const namedTiles: [string, string[], number][] = [
      [this.SUITS.WINDS, this.WINDS, 4],
      [this.SUITS.DRAGONS, this.DRAGONS, 4],
      [this.SUITS.FLOWERS, this.FLOWERS, 1],
      [this.SUITS.SEASONS, this.SEASONS, 1],
    ];
    for (const [type, names, copies] of namedTiles) {
      for (const name of names) {
        for (let copy = 0; copy < copies; copy++) {
          deck.push({ id: `${type}-${name}-${copy}`, type, value: 0, name });
        }
      }
    }
    return deck;
  }

  // Fisher-Yates shuffle algorithm
  public static shuffleDeck<T>(deck: T[]): T[] {
    const shuffled = [...deck]; // Copy to avoid mutation
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Generate grid coordinates for standard Mahjong board layout
  // Standard Mahjong board has 144 tiles arranged in a 12x12 grid
  // We'll use a simplified 12x12 grid representation
  public static generateGridCoordinates(): { row: number; col: number }[] {
    const coordinates: { row: number; col: number }[] = [];
    
    // Standard Mahjong board is typically arranged in rows of 12 tiles
    // We'll create a 12x12 grid (144 positions)
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 12; col++) {
        coordinates.push({ row, col });
      }
    }
    
    return coordinates;
  }

  // Get random tile from deck
  public static getRandomTile(deck: any[]): any {
    const index = Math.floor(Math.random() * deck.length);
    return deck[index];
  }
}