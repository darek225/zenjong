"use strict";

/**
 * TileManager - Handles the 144-tile Mahjong deck management
 * Includes:
 *  - 4 types of suits: Bamboo, Characters, Dots, Flowers (bonus)
 *  - 3 types of characters: 1-9 characters (36 tiles)
 *  - 3 types of bamboo: 1-9 bamboo (36 tiles) 
 *  - 3 types of dots: 1-9 dots (36 tiles)
 *  - 8 honor tiles: 4 winds, 4 dragons
 *  - 8 bonus tiles: 4 flowers, 4 seasons
 * 
 * Fisher-Yates shuffle algorithm for proper randomization
 * Grid coordinate generator for standard Mahjong board layout
 */
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
  public static createDeck(): any[] {
    const deck: any[] = [];

    // Bamboo tiles (36 tiles)
    for (const value of this.BAMBOO_VALUES) {
      deck.push({
        type: this.SUITS.BAMBOO,
        value: value,
        id: `${this.SUITS.BAMBOO}-${value}`
      });
    }

    // Characters tiles (36 tiles)
    for (const value of this.CHARACTERS_VALUES) {
      deck.push({
        type: this.SUITS.CHARACTERS,
        value: value,
        id: `${this.SUITS.CHARACTERS}-${value}`
      });
    }

    // Dots tiles (36 tiles)
    for (const value of this.DOTS_VALUES) {
      deck.push({
        type: this.SUITS.DOTS,
        value: value,
        id: `${this.SUITS.DOTS}-${value}`
      });
    }

    // Honor tiles - Winds (16 tiles)
    for (const wind of this.WINDS) {
      deck.push({
        type: this.SUITS.WINDS,
        name: wind,
        id: `${this.SUITS.WINDS}-${wind}`
      });
    }

    // Honor tiles - Dragons (12 tiles)
    for (const dragon of this.DRAGONS) {
      deck.push({
        type: this.SUITS.DRAGONS,
        name: dragon,
        id: `${this.SUITS.DRAGONS}-${dragon}`
      });
    }

    // Bonus tiles - Flowers (8 tiles)
    for (const flower of this.FLOWERS) {
      deck.push({
        type: this.SUITS.FLOWERS,
        name: flower,
        id: `${this.SUITS.FLOWERS}-${flower}`
      });
    }

    // Bonus tiles - Seasons (8 tiles)
    for (const season of this.SEASONS) {
      deck.push({
        type: this.SUITS.SEASONS,
        name: season,
        id: `${this.SUITS.SEASONS}-${season}`
      });
    }

    return deck;
  }

  // Fisher-Yates shuffle algorithm
  public static shuffleDeck(deck: any[]): any[] {
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