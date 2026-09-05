import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Tile extends Schema {
  @type("string") type: string = "";
  @type("number") value: number = 0;
  @type("string") name: string = "";
  @type("string") id: string = "";

  constructor(type: string = "", value: number = 0, name?: string, id?: string) {
    super();
    this.type = type;
    this.value = value;
    this.name = name || "";
    this.id = id ?? `${type}-${name || value}`;
  }
}

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") username: string = "";
  @type([Tile]) hand = new ArraySchema<Tile>();
  @type([Tile]) melds = new ArraySchema<Tile>();
  @type("number") score: number = 0;
  @type("number") jadeBalance: number = 1000;  // Starting balance
  @type("number") pearlBalance: number = 100;   // Starting balance
  @type("boolean") isDealer: boolean = false;
  @type("boolean") ready: boolean = false;
  @type("boolean") isBot: boolean = false;
}

export class Hand extends Schema {
  @type([Tile]) tiles = new ArraySchema<Tile>();
  @type("number") size: number = 0;
}

export class Wall extends Schema {
  @type([Tile]) tiles = new ArraySchema<Tile>();
  @type("number") remaining: number = 0;
}

export class DiscardPile extends Schema {
  @type([Tile]) tiles = new ArraySchema<Tile>();
}

export class TurnState extends Schema {
  @type("string") currentPlayer: string = "";
  @type("number") timeLeft: number = 30;
  @type("boolean") isDrawing: boolean = false;
  @type("boolean") canDiscard: boolean = false;
  @type("boolean") canClaim: boolean = false;
}

export class MahjongState extends Schema {
  @type("string") currentTurn: string = "";
  @type("string") roomId: string = "";
  @type("number") maxPlayers: number = 4;
  @type("number") currentPlayerCount: number = 0;
  
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(Wall) wall = new Wall();
  @type(DiscardPile) discardPile = new DiscardPile();
  @type(TurnState) turnState = new TurnState();
  @type("boolean") gameStarted: boolean = false;
  @type("boolean") roundOver: boolean = false;
}
