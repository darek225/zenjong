"use client";

import { useState, useEffect, useRef, useReducer, useMemo } from "react";
import { createSolitaire, solitaireReducer, findPair, isFree } from "../lib/solitaire";
import type { SolitaireLayoutId, SolitaireState } from "../lib/solitaire";
import type { SoloRules } from "../lib/gameModes";
import type { Room } from "colyseus.js";
import { createColyseusClient, joinRoomWithRetry, leaveRoomSafely } from "../lib/colyseus";
import { getWebSocketUrl, recordConnectionError } from "../lib/config";
import { GameSnapshot, snapshotGameState, sortTileIds } from "../lib/networkState";

export const useMahjongGame = (mode: "arcade" | "multiplayer" = "arcade", layoutId: SolitaireLayoutId = "turtle", seed?: number, rules?: SoloRules) => {
  const [solitaire, dispatch] = useReducer(solitaireReducer, 1, createSolitaire);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState<number | null>(rules?.hintsRemaining ?? null);
  const [shufflesRemaining, setShufflesRemaining] = useState<number | null>(rules?.shufflesRemaining ?? null);
  const freeIds = useMemo(() => new Set(solitaire.tiles.filter(tile => isFree(tile, solitaire.tiles)).map(tile => tile.id)), [solitaire.tiles]);
  const hasMoves = useMemo(() => !!findPair(solitaire.tiles), [solitaire.tiles]);
  useEffect(() => { dispatch({ type: "new", seed: seed ?? Date.now(), layoutId }); }, [layoutId, seed]);
  useEffect(() => {
    if (mode !== "arcade" || paused || !solitaire.tiles.length || (rules?.timeLimit !== null && rules?.timeLimit !== undefined && elapsed >= rules.timeLimit)) return;
    const timer = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [mode, paused, solitaire.tiles.length, rules?.timeLimit]);
  useEffect(() => { setHintsRemaining(rules?.hintsRemaining ?? null); setShufflesRemaining(rules?.shufflesRemaining ?? null); }, [rules?.modeId, rules?.layoutId, rules?.hintsRemaining, rules?.shufflesRemaining]);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (mode !== "multiplayer") return;
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
        joined.onStateChange(update);
        unsubscribers.push(() => { joined.onStateChange.remove(update); });
        const handleError = (code: number, message?: string) => {
          if (controller.signal.aborted || roomRef.current !== joined) return;
          recordConnectionError(message || `Room error ${code}`, getWebSocketUrl() ?? "offline");
          reset();
          void leaveRoomSafely(joined);
        };
        joined.onError(handleError);
        unsubscribers.push(() => { joined.onError.remove(handleError); });
        const handleLeave = () => {
          if (!controller.signal.aborted && roomRef.current === joined) reset();
        };
        joined.onLeave(handleLeave);
        unsubscribers.push(() => { joined.onLeave.remove(handleLeave); });
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
      reset();
    };
  }, [mode]);

  const myPlayer = room ? gameState?.players.get(room.sessionId) : undefined;
  const myTiles = myPlayer?.hand.map(tile => tile.id) ?? [];
  const isMyTurn = isConnected && !!room && gameState?.currentTurn === room.sessionId;
  const currentTurn = gameState?.currentTurn || null;
  const turnTimeLeft = gameState?.turnState.timeLeft ?? 0;
  const discardPile = gameState?.discardPile.tiles.map(tile => tile.id) ?? [];
  const playerBalances = Object.fromEntries(Array.from(gameState?.players ?? []).map(([id, player]) =>
    [id, { jadeBalance: player.jadeBalance, pearlBalance: player.pearlBalance }]));

  const toggleTileSelection = (tileId: string) => {
    if (mode === "arcade") {
      if (!paused) dispatch({ type: "select", id: tileId, now: Date.now() });
      return;
    }
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
    room, gameState, isConnected, myTiles,
    selectedTiles: mode === "arcade" ? [solitaire.selected, ...solitaire.hint].filter((id): id is string => !!id) : selectedTiles,
    isMyTurn, currentTurn,
    turnTimeLeft, discardPile, playerBalances, toggleTileSelection, sortTiles: sortTileIds,
    drawTile: () => { if (isMyTurn) send("draw"); },
    discardTile,
    discardTiles: () => { if (selectedTiles[0]) discardTile(selectedTiles[0]); },
    declareWin: () => { if (isMyTurn) send("declare_win"); },
    solitaire, freeIds, hasMoves, elapsed, paused, setPaused,
    undo: () => { if (!paused) dispatch({ type: "undo" }); },
    hint: () => { if (!paused && (hintsRemaining === null || hintsRemaining > 0)) { dispatch({ type: "hint" }); if (hintsRemaining !== null) setHintsRemaining(value => Math.max(0, (value ?? 1) - 1)); } },
    shuffle: () => { if (!paused && (shufflesRemaining === null || shufflesRemaining > 0)) { dispatch({ type: "shuffle", seed: Date.now() }); if (shufflesRemaining !== null) setShufflesRemaining(value => Math.max(0, (value ?? 1) - 1)); } },
    hintsRemaining, shufflesRemaining, timeLimit: rules?.timeLimit ?? null,
    newGame: (nextSeed = Date.now(), nextLayout = layoutId) => { dispatch({ type: "new", seed: nextSeed, layoutId: nextLayout }); setElapsed(0); setPaused(false); },
    restoreSession: (state: SolitaireState, seconds: number) => { dispatch({ type: "restore", state }); setElapsed(Math.max(0, Math.floor(seconds))); setPaused(true); },
  };
};