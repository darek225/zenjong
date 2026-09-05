"use client";

import { Client } from "colyseus.js";
import Config from "./config";
import { showConnectionToast } from "./config";

/**
 * Resolve WebSocket endpoint with production-safe fallback
 * - Uses NEXT_PUBLIC_SOCKET_URL if set (preferred for production)
 * - Returns null for production hosts if not configured (prevents ERR_CONNECTION_REFUSED)
 * - Falls back to ws://localhost:2567 only in development
 */
const getWebSocketEndpoint = (): string | null => {
  // Preferred: explicit env var (works in both client and server)
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Next.js exposes NEXT_PUBLIC_* on the client via NEXT_PUBLIC_* vars injected at build time
  if (typeof window !== "undefined") {
    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    // In production, never default to a hardcoded localhost — disable gracefully
    if (!isLocalHost) {
      return null;
    }
  }
  // Development fallback only
  return "ws://localhost:2567";
};

/**
 * Create a Colyseus client with centralized environment configuration
 * Uses NEXT_PUBLIC_COLYSEUS_URL for production deployment with graceful fallbacks
 */
export const createColyseusClient = (): Client => {
  if (typeof window === "undefined") {
    throw new Error("Colyseus client cannot be created during SSR");
  }

  // Use centralized config with fallback strategy
  let url: string | null = Config.getWebSocketUrl?.(true) ?? null;
  if (!url || url === "ws://localhost:2567") {
    url = getWebSocketEndpoint();
  }
  if (!url) {
    const msg = "No WebSocket endpoint configured. Set NEXT_PUBLIC_SOCKET_URL to enable multiplayer.";
    Config.showConnectionToast?.(msg);
    Config.recordConnectionError?.(msg, "unconfigured");
    throw new Error(msg);
  }

  console.info(`[Config] Connecting to WebSocket: ${url}`);

  const client = new Client(url);

  return client;
};

/**
 * Type-safe room joining with connection error handling and exponential backoff
 */
export const joinRoomWithRetry = async (
  client: Client,
  roomName: string,
  maxRetries = 3
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Colyseus] Attempt ${attempt}/${maxRetries} to join room: ${roomName}`);
      const joinedRoom = await client.joinOrCreate(roomName);
      
      // Clear any previous errors on success
      return joinedRoom;
    } catch (error: any) {
      lastError = error;
      console.error(`[Colyseus] Attempt ${attempt} failed:`, error);
      
      // Show user-friendly toast on connection failure
      showConnectionToast(
        `Connection attempt ${attempt} failed. Retrying...`
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted - show user-friendly error
  showConnectionToast(
    "Unable to connect to game server. Please check your connection."
  );

  throw lastError;
};

/**
 * Safely leave a room with cleanup
 */
export const leaveRoomSafely = async (room: any): Promise<void> => {
  if (!room) return;
  // Safely exit room without throwing if the room is not a valid Room instance
  if (typeof room.leave === 'function') {
    try {
      await room.leave();
    } catch (error) {
      console.warn("[Colyseus] Error leaving room:", error);
    }
  }
};