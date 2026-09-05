"use client";

import { Client } from "colyseus.js";

// Use environment variable with fallback for local development
// In production, NEXT_PUBLIC_COLYSEUS_URL should be set to the production WebSocket server
const COLYSEUS_URL =
  process.env.NEXT_PUBLIC_COLYSEUS_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "wss://zenjong-backend.onrender.com"
    : "http://localhost:2567");

export const createColyseusClient = (): Client => {
  if (typeof window === "undefined") {
    throw new Error("Colyseus client cannot be created during SSR");
  }
  const client = new Client(COLYSEUS_URL);
  return client;
};