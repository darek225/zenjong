"use client";

import { Client } from "colyseus.js";
import Config from "./config";
import { showConnectionToast } from "./config";

/**
 * Create a Colyseus client with centralized environment configuration
 * Uses NEXT_PUBLIC_COLYSEUS_URL for production deployment with graceful fallbacks
 */
export const createColyseusClient = (): Client => {
  if (typeof window === "undefined") {
    throw new Error("Colyseus client cannot be created during SSR");
  }

  // Use centralized config with fallback strategy
  const url = Config.getWebSocketUrl?.(true) || "ws://localhost:2567";

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
  try {
    await room.leave();
  } catch (error) {
    console.warn("[Colyseus] Error leaving room:", error);
  }
};