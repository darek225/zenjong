"use client";

import { Client } from "colyseus.js";

const COLYSEUS_URL = "http://localhost:2567";

export const createColyseusClient = (): Client => {
  if (typeof window === "undefined") {
    throw new Error("Colyseus client cannot be created during SSR");
  }
  const client = new Client(COLYSEUS_URL);
  return client;
};