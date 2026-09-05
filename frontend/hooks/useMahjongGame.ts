"use client";

import { useState, useEffect, useRef } from "react";
import { createColyseusClient } from "../lib/colyseus";

export const useMahjongGame = () => {
  const [room, setRoom] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myTiles, setMyTiles] = useState<string[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(0);
  const [discardPile, setDiscardPile] = useState<string[]>([]);
  const [playerBalances, setPlayerBalances] = useState<Record<string, any>>({});
  const roomRef = useRef<any>(null);

  // Keep roomRef in sync with the room state for cleanup access
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    let client: ReturnType<typeof createColyseusClient> | null = null;
    let isMounted = true;

    const connect = async () => {
      try {
        client = createColyseusClient();

        const joinedRoom = await client.joinOrCreate("mahjong_room");
        if (!isMounted) return;

        console.log("Joined room:", joinedRoom.roomId);
        setRoom(joinedRoom);
        setIsConnected(true);

        // Setup room state synchronization listeners
        joinedRoom.onStateChange((state: any) => {
          if (!isMounted) return;
          setGameState(state);

          // Guard against null/undefined state properties
          if (!state || !state.players) {
            setMyTiles([]);
            setCurrentTurn(null);
            setTurnTimeLeft(0);
            setDiscardPile([]);
            setPlayerBalances({});
            setIsMyTurn(false);
            return;
          }

          // Update my hand if I'm in this room
          const myPlayer = state.players.get(joinedRoom.sessionId);
          if (myPlayer && myPlayer.hand) {
            setMyTiles(myPlayer.hand.map((t: any) => t.id));
          } else {
            setMyTiles([]);
          }

          // Update current active player
          setCurrentTurn(state.currentTurn || null);
          // Update turn timer
          setTurnTimeLeft(state.turnState?.timeLeft ?? 0);
          // Update discard pile — guard against null/undefined
          if (state.discardPile && state.discardPile.tiles) {
            setDiscardPile(state.discardPile.tiles.map((t: any) => t.id));
          } else {
            setDiscardPile([]);
          }
          // Update player balances (if available on player schema)
          const balances: Record<string, any> = {};
          if (state.players) {
            for (const [sessionId, player] of state.players.entries()) {
              const balancesObj: any = {};
              if (player.jadeBalance !== undefined)
                balancesObj.jadeBalance = player.jadeBalance;
              if (player.pearlBalance !== undefined)
                balancesObj.pearlBalance = player.pearlBalance;
              if (Object.keys(balancesObj).length > 0) {
                balances[sessionId] = balancesObj;
              }
            }
          }
          setPlayerBalances(balances);
          // Update whether it's the local player's turn
          setIsMyTurn(state.currentTurn === joinedRoom.sessionId);
        });

        joinedRoom.onError((code: number, message?: string) => {
          console.error("Room error:", code, message);
        });

        joinedRoom.onLeave((code: number) => {
          console.log("Left room with code:", code);
          setIsConnected(false);
          setRoom(null);
        });

        joinedRoom.onMessage("tile-played", (message: any) => {
          console.log("Tile played message:", message);
        });
      } catch (error) {
        console.error("Failed to join room:", error);
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    connect();

    // Cleanup function
    return () => {
      isMounted = false;
      // Note: colyseus.js Client has no `close()` method; rooms must be left
      // individually. The room is stored in `roomRef` so we can call leave() on it.
      if (roomRef.current) {
        try {
          roomRef.current.leave?.();
        } catch (err) {
          console.warn("Error leaving room on cleanup:", err);
        }
        roomRef.current = null;
      }
    };
  }, []); // Empty deps means run once on mount

  // Tile selection handling
  const toggleTileSelection = (tileId: string) => {
    if (selectedTiles.includes(tileId)) {
      setSelectedTiles(selectedTiles.filter(id => id !== tileId));
    } else {
      setSelectedTiles([...selectedTiles, tileId]);
    }
  };

  // Sort tiles according to Mahjong rules
  const sortTiles = (tiles: string[]): string[] => {
    // Group tiles by type
    const suits = {
      DOT: [] as string[],
      BAM: [] as string[],
      WAN: [] as string[],
      WIND: [] as string[],
      DRAGON: [] as string[],
      FLOWER: [] as string[],
      SEASON: [] as string[]
    };

    tiles.forEach(tile => {
      if (tile.startsWith("DOT_")) suits.DOT.push(tile);
      else if (tile.startsWith("BAM_")) suits.BAM.push(tile);
      else if (tile.startsWith("WAN_")) suits.WAN.push(tile);
      else if (tile.startsWith("WIND_")) suits.WIND.push(tile);
      else if (tile.startsWith("DRAGON_")) suits.DRAGON.push(tile);
      else if (tile.startsWith("FLOWER_")) suits.FLOWER.push(tile);
      else if (tile.startsWith("SEASON_")) suits.SEASON.push(tile);
    });

    // Sort each suit numerically or by predefined order
    const sortByNumber = (arr: string[]) => 
      arr.slice().sort((a, b) => {
        const numA = parseInt(a.split("_")[1]) || 0;
        const numB = parseInt(b.split("_")[1]) || 0;
        return numA - numB;
      });

    const windOrder = ["WIND_EAST", "WIND_SOUTH", "WIND_WEST", "WIND_NORTH"];
    const dragonOrder = ["DRAGON_RED", "DRAGON_GREEN", "DRAGON_WHITE"];
    const flowerOrder = ["FLOWER_PLUM", "FLOWER_ORCHID", "FLOWER_CHRYSANTHEMUM", "FLOWER_BAMBOO"];
    const seasonOrder = ["SEASON_SPRING", "SEASON_SUMMER", "SEASON_AUTUMN", "SEASON_WINTER"];

    suits.WIND.sort((a, b) => windOrder.indexOf(a) - windOrder.indexOf(b));
    suits.DRAGON.sort((a, b) => dragonOrder.indexOf(a) - dragonOrder.indexOf(b));
    suits.FLOWER.sort((a, b) => flowerOrder.indexOf(a) - flowerOrder.indexOf(b));
    suits.SEASON.sort((a, b) => seasonOrder.indexOf(a) - seasonOrder.indexOf(b));

    // Return sorted tiles in standard Mahjong order: Dots, Bams, Winds, Dragons, Flowers, Seasons
    return [
      ...sortByNumber(suits.DOT),
      ...sortByNumber(suits.BAM),
      ...sortByNumber(suits.WAN),
      ...suits.WIND,
      ...suits.DRAGON,
      ...suits.FLOWER,
      ...suits.SEASON
    ];
  };

  // Draw tiles from wall
  const drawTile = (): void => {
    if (room) {
      room.send("draw");
    }
  };

  // Discard a tile by id (string id matching tiles in player's hand)
  // If tileId is not found, falls back to first selected tile, otherwise last index.
  const discardTile = (tileId: string): void => {
    if (!room) return;

    // Try to match by id (stripped to compare with server tile id)
    const player =
      gameState && gameState.players
        ? gameState.players.get(room.sessionId)
        : null;
    let tileIndex = -1;
    if (player && player.hand) {
      tileIndex = player.hand.findIndex(
        (t: any) => t.id === tileId || `${t.type}-${t.name || t.value}` === tileId
      );
    }
    if (tileIndex === -1 && selectedTiles.length > 0) {
      // Fall back to first selected tile id
      const firstSel = selectedTiles[0];
      if (player && player.hand) {
        tileIndex = player.hand.findIndex(
          (t: any) => t.id === firstSel || `${t.type}-${t.name || t.value}` === firstSel
        );
      }
    }
    if (tileIndex === -1) {
      // Default to discarding the last tile in hand
      tileIndex = player ? player.hand.length - 1 : 0;
    }

    room.send("discard", { tileIndex });
    setSelectedTiles((prev) => prev.filter((id) => id !== tileId));
  };

  // Discard selected tiles (legacy helper for callers using multi-select)
  const discardTiles = (): void => {
    if (selectedTiles.length === 0 || !room) return;
    // For Mahjong, we typically discard one tile at a time
    // Send the first selected tile to discard
    discardTile(selectedTiles[0]);
  };

  // Declare win / "hu" to the room
  const declareWin = (): void => {
    if (!room) return;
    room.send("declare_win");
  };

  return {
    room,
    gameState,
    isConnected,
    myTiles,
    selectedTiles,
    isMyTurn,
    currentTurn,
    turnTimeLeft,
    discardPile,
    playerBalances,
    setMyTiles,
    setIsMyTurn,
    toggleTileSelection,
    sortTiles,
    drawTile,
    discardTile,
    discardTiles,
    declareWin,
    setRoom,
    setGameState
  };
};