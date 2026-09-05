"use client";

import { Client, Room } from "colyseus.js";
import { getWebSocketUrl, clearLastError } from "./config";

export const createColyseusClient = (): Client | null => {
  if (typeof window === "undefined") return null;
  const url = getWebSocketUrl();
  return url ? new Client(url) : null;
};

const abortError = () => new DOMException("Room join cancelled", "AbortError");

function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(abortError()); return; }
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** At most three attempts; dispose successful joins that finish after cancellation. */
export const joinRoomWithRetry = async (
  client: Client,
  roomName: string,
  maxRetries = 3,
  signal?: AbortSignal
): Promise<Room> => {
  const attempts = Math.min(3, Math.max(1, Math.floor(maxRetries) || 1));
  let lastError: unknown = new Error("Unable to join room");
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) throw abortError();
    try {
      const joinedRoom = await client.joinOrCreate(roomName);
      if (signal?.aborted) {
        await leaveRoomSafely(joinedRoom);
        throw abortError();
      }
      clearLastError();
      return joinedRoom;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      lastError = error;
      if (attempt + 1 < attempts) await waitForRetry(1000 * 2 ** attempt, signal);
    }
  }
  throw lastError;
};

export const leaveRoomSafely = async (room: unknown): Promise<void> => {
  if (!room || typeof (room as Room).leave !== "function") return;
  try { await (room as Room).leave(); }
  catch { /* The transport may already be closed. */ }
};