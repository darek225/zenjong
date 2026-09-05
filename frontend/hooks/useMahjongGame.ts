"use client";

import { useState, useEffect, useRef } from "react";
import { createColyseusClient, joinRoomWithRetry, leaveRoomSafely } from "../lib/colyseus";
import Config from "../lib/config";

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
  const clientRef = useRef<any>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        leaveRoomSafely(clientRef.current).catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    clientRef.current = null;

    const connect = async () => {
      if (!isMounted) return;
      try {
        const client = createColyseusClient();
        clientRef.current = client;

        const joinedRoom = await joinRoomWithRetry(client, "mahjong_room");
        if (!isMounted) return;

        console.log("Joined room:", joinedRoom.roomId);
        setRoom(joinedRoom);
        setIsConnected(true);

        joinedRoom.onStateChange((state: any) => {
          if (!isMounted || !state) return;
          if (!state.players) {
            setMyTiles([]);
            setCurrentTurn(null);
            setTurnTimeLeft(0);
            setDiscardPile([]);
            setPlayerBalances({});
            setIsMyTurn(false);
            return;
          }
          const myPlayer = state.players.get(joinedRoom.sessionId);
          if (myPlayer && myPlayer.hand) {
            setMyTiles(myPlayer.hand.map((t: any) => t.id));
          } else {
            setMyTiles([]);
          }
          setCurrentTurn(state.currentTurn || null);
          setTurnTimeLeft(state.turnState?.timeLeft ?? 0);
          if (state.discardPile && state.discardPile.tiles) {
            setDiscardPile(state.discardPile.tiles.map((t: any) => t.id));
          } else {
            setDiscardPile([]);
          }
          const balances: Record<string, any> = {};
          if (state.players) {
            for (const [sessionId, player] of state.players.entries()) {
              const balancesObj: any = {};
              if (player.jadeBalance !== undefined) balancesObj.jadeBalance = player.jadeBalance;
              if (player.pearlBalance !== undefined) balancesObj.pearlBalance = player.pearlBalance;
              if (Object.keys(balancesObj).length > 0) balances[sessionId] = balancesObj;
            }
          }
          setPlayerBalances(balances);
          setIsMyTurn(state.currentTurn === joinedRoom.sessionId);
        });

        joinedRoom.onError((code: number, message?: string) => {
          if (!isMounted) return;
          console.error("Room error:", code, message);
          setIsConnected(false);
          Config.showConnectionToast?.("Room error: " + (message || code));
        });

        joinedRoom.onLeave((code: number) => {
          if (!isMounted) return;
          console.log("Left room with code:", code);
          setIsConnected(false);
          setRoom(null);
          setMyTiles([]);
          setSelectedTiles([]);
          setDiscardPile([]);
        });

        joinedRoom.onMessage("tile-played", (message: any) => {
          if (!isMounted) return;
          console.log("Tile played:", message);
        });

        joinedRoom.onMessage("turn-change", (message: any) => {
          if (!isMounted) return;
          setCurrentTurn(message?.sessionId || null);
          setIsMyTurn(message?.sessionId === joinedRoom.sessionId || false);
        });

      } catch (error: any) {
        if (!isMounted) return;
        console.error("Failed to join room:", error);
        setIsConnected(false);
        Config.showConnectionToast?.(error.message || "Unable to connect to game server");
      }
    };

    connect();
    return () => {
      isMounted = false;
      if (clientRef.current) {
        leaveRoomSafely(clientRef.current).catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  const toggleTileSelection = (tileId: string) => {
    if (selectedTiles.includes(tileId)) {
      setSelectedTiles(selectedTiles.filter((id) => id !== tileId));
    } else {
      setSelectedTiles([...selectedTiles, tileId]);
    }
  };

  const sortTiles = (tiles: string[]): string[] => {
    const suits = {
      DOT: [] as string[], BAM: [] as string[], WAN: [] as string[],
      WIND: [] as string[], DRAGON: [] as string[],
      FLOWER: [] as string[], SEASON: [] as string[],
    };
    tiles.forEach((tile) => {
      if (tile.startsWith("DOT_")) suits.DOT.push(tile);
      else if (tile.startsWith("BAM_")) suits.BAM.push(tile);
      else if (tile.startsWith("WAN_")) suits.WAN.push(tile);
      else if (tile.startsWith("WIND_")) suits.WIND.push(tile);
      else if (tile.startsWith("DRAGON_")) suits.DRAGON.push(tile);
      else if (tile.startsWith("FLOWER_")) suits.FLOWER.push(tile);
      else if (tile.startsWith("SEASON_")) suits.SEASON.push(tile);
    });
    const sortByNumber = (arr: string[]) => arr.slice().sort((a, b) => {
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
    return [...sortByNumber(suits.DOT), ...sortByNumber(suits.BAM), ...sortByNumber(suits.WAN),
            ...suits.WIND, ...suits.DRAGON, ...suits.FLOWER, ...suits.SEASON];
  };

  const drawTile = (): void => { if (room) room.send("draw"); };

  const discardTile = (tileId: string): void => {
    if (!room) return;
    const player = gameState && gameState.players ? gameState.players.get(room.sessionId) : null;
    let tileIndex = -1;
    if (player && player.hand) {
      tileIndex = player.hand.findIndex((t: any) => t.id === tileId || (t.type + "-" + (t.name || t.value)) === tileId);
    }
    if (tileIndex === -1 && selectedTiles.length > 0) {
      const firstSel = selectedTiles[0];
      if (player && player.hand) {
        tileIndex = player.hand.findIndex((t: any) => t.id === firstSel || (t.type + "-" + (t.name || t.value)) === firstSel);
      }
    }
    if (tileIndex === -1) tileIndex = player ? player.hand.length - 1 : 0;
    room.send("discard", { tileIndex });
    setSelectedTiles((prev) => prev.filter((id) => id !== tileId));
  };

  const discardTiles = (): void => { if (selectedTiles.length === 0 || !room) return; discardTile(selectedTiles[0]); };
  const declareWin = (): void => { if (!room) return; room.send("declare_win"); };

  return {
    room, gameState, isConnected, myTiles, selectedTiles, isMyTurn, currentTurn,
    turnTimeLeft, discardPile, playerBalances, setMyTiles, setIsMyTurn,
    toggleTileSelection, sortTiles, drawTile, discardTile, discardTiles, declareWin,
    setRoom, setGameState,
  };
};