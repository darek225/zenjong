"use client";

import { useState, useEffect, useRef } from "react";
import type { Room } from "colyseus.js";
import { createColyseusClient, joinRoomWithRetry, leaveRoomSafely } from "../lib/colyseus";
import { getWebSocketUrl, recordConnectionError } from "../lib/config";
import { GameSnapshot, snapshotGameState, sortTileIds } from "../lib/networkState";

export const useMahjongGame = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let activeRoom: Room | null = null;
    const unsubscribers: (() => void)[] = [];
    const reset = () => {
      roomRef.current = null;
      setRoom(null);
      setGameState(null);
      setIsConnected(false);
      setSelectedTiles([]);
    };
    const connect = async () => {
      try {
        const client = createColyseusClient();
        if (!client) { reset(); return; }
        const joined = await joinRoomWithRetry(client, "mahjong_room", 3, controller.signal);
        if (controller.signal.aborted) { await leaveRoomSafely(joined); return; }
        activeRoom = joined;
        roomRef.current = joined;
        setRoom(joined);
        setIsConnected(true);
        const update = (state: unknown) => {
          if (controller.signal.aborted || roomRef.current !== joined) return;
          const snapshot = snapshotGameState(state);
          setGameState(snapshot);
          const hand = snapshot?.players.get(joined.sessionId)?.hand ?? [];
          setSelectedTiles(previous => previous.filter(id => hand.some(tile => tile.id === id)));
        };
        unsubscribers.push(joined.onStateChange(update));
        unsubscribers.push(joined.onError((code, message) => {
          if (controller.signal.aborted || roomRef.current !== joined) return;
          recordConnectionError(message || `Room error ${code}`, getWebSocketUrl() ?? "offline");
          reset();
          void leaveRoomSafely(joined);
        }));
        unsubscribers.push(joined.onLeave(() => {
          if (!controller.signal.aborted && roomRef.current === joined) reset();
        }));
        update(joined.state);
      } catch (error) {
        if (controller.signal.aborted) return;
        recordConnectionError(error instanceof Error ? error.message : "Unable to connect", getWebSocketUrl() ?? "offline");
        reset();
      }
    };
    void connect();
    return () => {
      controller.abort();
      unsubscribers.forEach(unsubscribe => unsubscribe());
      if (roomRef.current === activeRoom) roomRef.current = null;
      void leaveRoomSafely(activeRoom);
    };
  }, []);

  const myPlayer = room ? gameState?.players.get(room.sessionId) : undefined;
  const myTiles = myPlayer?.hand.map(tile => tile.id) ?? [];
  const isMyTurn = isConnected && !!room && gameState?.currentTurn === room.sessionId;
  const currentTurn = gameState?.currentTurn || null;
  const turnTimeLeft = gameState?.turnState.timeLeft ?? 0;
  const discardPile = gameState?.discardPile.tiles.map(tile => tile.id) ?? [];
  const playerBalances = Object.fromEntries(Array.from(gameState?.players ?? []).map(([id, player]) =>
    [id, { jadeBalance: player.jadeBalance, pearlBalance: player.pearlBalance }]));

  const toggleTileSelection = (tileId: string) => {
    setSelectedTiles(previous => previous.includes(tileId)
      ? previous.filter(id => id !== tileId) : [...previous, tileId]);
  };
  const send = (type: string, message?: unknown) => {
    const current = roomRef.current;
    if (!isConnected || !current) return;
    try { current.send(type, message); }
    catch {
      roomRef.current = null;
      setIsConnected(false);
      setRoom(null);
      setGameState(null);
      setSelectedTiles([]);
      void leaveRoomSafely(current);
    }
  };
  const discardTile = (tileId: string) => {
    if (!isMyTurn) return;
    // Use the authoritative order, never the display-sorted position or a guessed index.
    const hand = roomRef.current?.state?.players?.get(roomRef.current.sessionId)?.hand;
    const tileIndex = hand?.findIndex((tile: any) => tile?.id === tileId) ?? -1;
    if (tileIndex < 0) return;
    send("discard", { tileIndex });
    setSelectedTiles(previous => previous.filter(id => id !== tileId));
  };
  return {
    room, gameState, isConnected, myTiles, selectedTiles, isMyTurn, currentTurn,
    turnTimeLeft, discardPile, playerBalances, toggleTileSelection, sortTiles: sortTileIds,
    drawTile: () => { if (isMyTurn) send("draw"); },
    discardTile,
    discardTiles: () => { if (selectedTiles[0]) discardTile(selectedTiles[0]); },
    declareWin: () => { if (isMyTurn) send("declare_win"); },
  };
};