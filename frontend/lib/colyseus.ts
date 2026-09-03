"use client";

import { Client } from "colyseus.js";

const COLYSEUS_URL = "http://localhost:2567";

export const createColyseusClient = (): Client => {
  const client = new Client(COLYSEUS_URL);
  return client;
};