import { Room, Client } from "colyseus";
import { MahjongState, Tile, Player } from "./schema/MahjongState";
import { TileManager } from "../game/TileManager";

const TURN_TIMER_SECONDS = 30;
const OPENING_HAND_SIZE = 13;
const LOBBY_BOT_TIMER_SECONDS = 10;
const BOT_TURN_DELAY_MS = 1500;
const BOT_CLAIM_DELAY_MS = 1000;
const BOT_NAMES = ["ZenBot_Alpha", "ZenBot_Beta", "ZenBot_Gamma"];

export class MahjongRoom extends Room<MahjongState> {
  private turnTimer: ReturnType<typeof this.clock.setInterval> | null = null;
  private lobbyTimer: ReturnType<typeof this.clock.setTimeout> | null = null;
  private playerOrder: string[] = [];
  private botNameIndex = 0;

  onCreate(options: any) {
    this.setState(new MahjongState());
    this.state.roomId = this.roomId;
    this.state.maxPlayers = options.maxPlayers || 4;
    this.registerMessageHandlers();
    console.log("MahjongRoom created");
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.username = options.username || `Player${this.state.currentPlayerCount + 1}`;
    player.isBot = false;
    this.state.players.set(client.sessionId, player);
    this.state.currentPlayerCount++;
    if (this.state.currentPlayerCount === 1) {
      player.isDealer = true;
      this.startLobbyTimer();
    }
    if (this.state.currentPlayerCount >= this.state.maxPlayers) {
      this.startGame();
    }
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player && !player.isBot && this.state.gameStarted) {
      player.isBot = true;
      player.username = this.generateBotName();
      if (this.state.currentTurn === client.sessionId) {
        this.clock.setTimeout(() => {
          if (this.state.gameStarted && this.state.currentTurn === client.sessionId) {
            this.executeBotTurn(client.sessionId);
          }
        }, BOT_TURN_DELAY_MS);
      }
    }
    this.state.players.delete(client.sessionId);
    this.state.currentPlayerCount--;
    if (!this.state.gameStarted && this.state.currentPlayerCount > 0) {
      this.restartLobbyTimer();
    }
  }

  onDispose() {
    if (this.turnTimer) this.turnTimer.clear();
    if (this.lobbyTimer) this.lobbyTimer.clear();
  }

  private registerMessageHandlers() {
    this.onMessage("discard", (client, msg) => this.handleDiscard(client, msg.tileIndex));
    this.onMessage("draw", (client) => this.handleDraw(client));
    this.onMessage("ready", (client) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.ready = true;
    });
    this.onMessage("declare_win", (client) => this.handleDeclareWin(client));
  }

  private handleDeclareWin(client: Client) {
    if (client.sessionId !== this.state.currentTurn) return;
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    console.log(`Player ${p.username} declared win!`);
    this.broadcast("player_won", {
      winnerSessionId: client.sessionId,
      winnerUsername: p.username,
    });
    this.endRound();
  }

  private startLobbyTimer() {
    if (this.lobbyTimer) this.lobbyTimer.clear();
    this.lobbyTimer = this.clock.setTimeout(() => {
      this.fillRemainingSlotsWithBots();
    }, LOBBY_BOT_TIMER_SECONDS * 1000);
  }

  private restartLobbyTimer() {
    if (!this.state.gameStarted && this.state.currentPlayerCount < this.state.maxPlayers) {
      this.startLobbyTimer();
    }
  }

  private fillRemainingSlotsWithBots() {
    const neededBots = this.state.maxPlayers - this.state.currentPlayerCount;
    for (let i = 0; i < neededBots; i++) {
      this.addBotPlayer();
    }
    if (this.state.currentPlayerCount >= this.state.maxPlayers) {
      this.startGame();
    }
  }

  private addBotPlayer() {
    const botName = this.generateBotName();
    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const botPlayer = new Player();
    botPlayer.sessionId = botId;
    botPlayer.username = botName;
    botPlayer.isBot = true;
    this.state.players.set(botId, botPlayer);
    this.state.currentPlayerCount++;
    console.log(`Added bot: ${botName} (${botId})`);
  }

  private generateBotName(): string {
    const name = BOT_NAMES[this.botNameIndex % BOT_NAMES.length];
    this.botNameIndex++;
    return name;
  }

  private startGame() {
    if (this.state.gameStarted) return;
    this.lobbyTimer?.clear();
    this.lobbyTimer = null;
    this.state.gameStarted = true;
    const deck = TileManager.createDeck();
    const shuffled = TileManager.shuffleDeck(deck);
    this.state.wall.tiles.clear();
    for (const t of shuffled) {
      this.state.wall.tiles.push(new Tile(t.type, t.value, t.name, t.id));
    }
    this.state.wall.remaining = this.state.wall.tiles.length;
    this.playerOrder = Array.from(this.state.players.keys());
    for (const sid of this.playerOrder) {
      const p = this.state.players.get(sid);
      if (p) {
        p.hand.clear();
        for (let i = 0; i < OPENING_HAND_SIZE; i++) {
          const tile = this.getNextTile();
          if (tile) p.hand.push(tile);
        }
      }
    }
    this.startTurn(this.playerOrder[0]);
  }

  private getNextTile(): Tile | null {
    const tile = this.state.wall.tiles.pop() ?? null;
    this.state.wall.remaining = this.state.wall.tiles.length;
    return tile;
  }

  private startTurn(playerId: string) {
    this.state.currentTurn = playerId;
    this.state.turnState.currentPlayer = playerId;
    this.state.turnState.timeLeft = TURN_TIMER_SECONDS;
    this.state.turnState.canDiscard = false;
    this.state.turnState.canClaim = false;
    if (this.turnTimer) this.turnTimer.clear();
    let t = TURN_TIMER_SECONDS;
    this.turnTimer = this.clock.setInterval(() => {
      t--;
      this.state.turnState.timeLeft = t;
      if (t <= 0) this.handleTimeout(playerId);
    }, 1000);
    const currentPlayer = this.state.players.get(playerId);
    if (currentPlayer && currentPlayer.isBot) {
      this.clock.setTimeout(() => {
        if (this.state.gameStarted && this.state.currentTurn === playerId) {
          this.executeBotTurn(playerId);
        }
      }, BOT_TURN_DELAY_MS);
    }
  }

  private executeBotTurn(playerId: string) {
    const player = this.state.players.get(playerId);
    if (!player || !player.isBot) return;
    if (player.hand.length > 0) {
      let discardIndex = 0;
      for (let i = 0; i < player.hand.length; i++) {
        const tile = player.hand[i];
        if (tile && tile.type !== "dragon" && tile.type !== "wind") {
          discardIndex = i;
          break;
        }
      }
      const tileToDiscard = player.hand[discardIndex];
      const tileIndex = tileToDiscard ? player.hand.indexOf(tileToDiscard) : -1;
      if (tileIndex !== -1) {
        const dummyClient = { sessionId: playerId } as Client;
        this.handleDiscard(dummyClient, tileIndex);
      }
    }
  }

  private handleTimeout(playerId: string) {
    if (this.turnTimer) this.turnTimer.clear();
    const p = this.state.players.get(playerId);
    if (p && p.hand.length > 0) {
      const tile = p.hand[p.hand.length - 1];
      if (tile) {
        this.state.discardPile.tiles.push(tile);
        p.hand.pop();
      }
    }
    this.nextTurn();
  }

  private handleDraw(client: Client) {
    if (client.sessionId !== this.state.currentTurn) return;
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    const tile = this.getNextTile();
    if (tile) {
      p.hand.push(tile);
      this.state.turnState.isDrawing = false;
      this.state.turnState.canDiscard = true;
    } else {
      this.state.roundOver = true;
      this.endRound();
    }
  }

  private handleDiscard(client: Client, idx: number) {
    if (client.sessionId !== this.state.currentTurn) return;
    const p = this.state.players.get(client.sessionId);
    if (!p || idx < 0 || idx >= p.hand.length) return;
    const tile = p.hand[idx];
    if (!tile) return;
    p.hand.splice(idx, 1);
    this.state.discardPile.tiles.push(tile);
    this.state.turnState.canDiscard = false;
    this.state.turnState.canClaim = true;
    this.nextTurn();
  }

  private nextTurn() {
    if (this.turnTimer) this.turnTimer.clear();
    const cur = this.playerOrder.indexOf(this.state.currentTurn);
    let nxt = (cur + 1) % this.playerOrder.length;
    let tries = 0;
    while (tries < this.playerOrder.length) {
      if (this.state.players.has(this.playerOrder[nxt])) break;
      nxt = (nxt + 1) % this.playerOrder.length;
      tries++;
    }
    if (tries >= this.playerOrder.length) {
      this.endRound();
      return;
    }
    this.startTurn(this.playerOrder[nxt]);
  }

  private endRound() {
    console.log("Round ended");
    this.state.roundOver = true;
    this.state.gameStarted = false;
    if (this.turnTimer) this.turnTimer.clear();
    let best = 0, winner: string | null = null;
    for (const [sid, p] of this.state.players.entries()) {
      if (p.score > best) { best = p.score; winner = sid; }
    }
    if (winner) console.log(`Winner: ${winner}`);
  }
}

