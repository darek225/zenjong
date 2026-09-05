
/**
 * Supabase Realtime WebSocket Board Synchronization
 *
 * Manages a single realtime channel per room and exposes typed event
 * subscriptions that the game client can consume:
 *   - PLAYER_JOIN     – another player entered the room
 *   - TILE_SELECT     – opponent hovered/selected a tile (broadcasts hover highlight)
 *   - TILE_MATCH      – a matched pair was removed from the board
 *   - BOARD_SHUFFLE   – the board was reshuffled
 *
 * Reconnect logic: if the socket drops, exponential-backoff reconnect
 * is attempted (capped at 30 s).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface TilePosition { row: number; col: number; }
export interface PlayerJoinPayload { playerId: string; username: string; joinedAt: string; }
export interface TileSelectPayload { playerId: string; tileIndex: number; position: TilePosition; }
export interface TileMatchPayload { tileIndices: [number, number]; matchedAt: string; }
export interface BoardShufflePayload { newBoard: string[]; shuffledAt: string; }

export type RealtimeEvent =
  | { type: "PLAYER_JOIN"; payload: PlayerJoinPayload }
  | { type: "TILE_SELECT"; payload: TileSelectPayload }
  | { type: "TILE_MATCH"; payload: TileMatchPayload }
  | { type: "BOARD_SHUFFLE"; payload: BoardShufflePayload };

export interface RealtimeClient {
  readonly roomCode: string;
  readonly isConnected: boolean;
  on(event: string, handler: (payload: any) => void): () => void;
  broadcastBoardShuffle(newBoard: string[], shuffledAt: string): void;
  broadcastTileSelect(playerId: string, tileIndex: number, position: TilePosition): void;
  broadcastTileMatch(tileIndices: [number, number]): void;
  joinRoom(roomCode: string): void;
  leaveRoom(): void;
  reconnect(): void;
  destroy(): void;
}

function getSupabaseUrl(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("zenjong_supabase_url");
    if (stored) return stored;
  }
  const url = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : "";
  return url ?? "";
}

function getSupabaseKey(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("zenjong_supabase_anon_key");
    if (stored) return stored;
  }
  const key = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : "";
  return key ?? "";
}

export function createRealtimeClient(): RealtimeClient {
  let roomCode = "";
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;
  let supabase: SupabaseClient | null = null;
  let isConnected = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_DELAY_MS = 1000;
  const MAX_DELAY_MS = 30000;
  const listeners = new Map<string, Array<(payload: any) => void>>();

  function computeDelay(): number { return Math.min(BASE_DELAY_MS * Math.pow(2, reconnectAttempts), MAX_DELAY_MS); }
  function clearReconnectTimer(): void { if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; } }
  function resetReconnectState(): void { clearReconnectTimer(); reconnectAttempts = 0; }

  function scheduleReconnect(): void {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) { console.warn("[supabaseRealtime] Max reconnect attempts reached"); return; }
    reconnectAttempts += 1;
    const delay = computeDelay();
    console.info(`[supabaseRealtime] Scheduling reconnect #${reconnectAttempts} in ${delay}ms`);
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => { if (roomCode) doJoinRoom(roomCode); }, delay);
  }

  function doJoinRoom(code: string): void {
    if (channel && supabase) { supabase.removeChannel(channel); channel = null; }
    roomCode = code;
    channel = createChannel(code);
  }

  function createChannel(code: string): ReturnType<SupabaseClient["channel"]> | null {
    const url = getSupabaseUrl(); const key = getSupabaseKey();
    if (!url || !key) { console.warn("[supabaseRealtime] Supabase URL/key not configured – realtime disabled"); return null; }
    if (!supabase) { supabase = createClient(url, key); }
    const ch = supabase.channel(code, { config: { broadcast: { self: true }, presence: { key: code } } });
    ch.subscribe((status: string) => {
      const wasConnected = isConnected; isConnected = status === "SUBSCRIBED";
      if (isConnected && !wasConnected) resetReconnectState();
      if (!isConnected && wasConnected) scheduleReconnect();
    });
    ch.on("presence", { event: "sync" }, () => {
      const newState = ch.presenceState();
      for (const entry of Object.values(newState).flat()) {
        const typed = entry as { presence_ref: string; playerId?: string; username?: string; joinedAt?: string };
        if (typed.playerId && typed.username) { listeners.get("PLAYER_JOIN")?.forEach(h => h({ playerId: typed.playerId, username: typed.username, joinedAt: typed.joinedAt ?? "" })); }
      }
    });
    ch.on("presence", { event: "join" }, ({ newPresences }: { newPresences: unknown[] }) => {
      for (const p of newPresences as PlayerJoinPayload[]) { listeners.get("PLAYER_JOIN")?.forEach(h => h(p)); }
    });
    ch.on("broadcast", { event: "TILE_SELECT" }, (payload: unknown) => { listeners.get("TILE_SELECT")?.forEach(h => h((payload as { payload: TileSelectPayload }).payload)); });
    ch.on("broadcast", { event: "TILE_MATCH" }, (payload: unknown) => { listeners.get("TILE_MATCH")?.forEach(h => h((payload as { payload: TileMatchPayload }).payload)); });
    ch.on("broadcast", { event: "BOARD_SHUFFLE" }, (payload: unknown) => { listeners.get("BOARD_SHUFFLE")?.forEach(h => h((payload as { payload: BoardShufflePayload }).payload)); });
    return ch;
  }

  return {
    get roomCode() { return roomCode; },
    get isConnected() { return isConnected; },
    on(event, handler) { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event)!.push(handler); return () => { const arr = listeners.get(event); if (arr) { const idx = arr.indexOf(handler); if (idx >= 0) arr.splice(idx, 1); } }; },
    broadcastBoardShuffle(newBoard, shuffledAt) { if (!channel) return; channel.send({ type: "broadcast", event: "BOARD_SHUFFLE", payload: { newBoard, shuffledAt } }); },
    broadcastTileSelect(playerId, tileIndex, position) { if (!channel) return; channel.send({ type: "broadcast", event: "TILE_SELECT", payload: { playerId, tileIndex, position } }); },
    broadcastTileMatch(tileIndices) { if (!channel) return; channel.send({ type: "broadcast", event: "TILE_MATCH", payload: { tileIndices } }); },
    joinRoom(code) { doJoinRoom(code); },
    leaveRoom() { clearReconnectTimer(); if (channel && supabase) { supabase.removeChannel(channel); channel = null; } roomCode = ""; isConnected = false; },
    reconnect() { clearReconnectTimer(); if (roomCode && supabase) doJoinRoom(roomCode); },
    destroy() { clearReconnectTimer(); if (channel && supabase) { supabase.removeChannel(channel); channel = null; } listeners.clear(); roomCode = ""; isConnected = false; supabase = null; },
  };
}

export const realtimeClient = createRealtimeClient();
export default realtimeClient;

