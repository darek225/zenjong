import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { MahjongRoom } from "./rooms/MahjongRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (_request, response) => response.json({ service: "zenjong-colyseus", status: "ok" }));
app.get("/health", (_request, response) => response.json({ status: "ok" }));

const server = http.createServer(app);
const gameServer = new Server({
  server,
});

gameServer.define("mahjong_room", MahjongRoom);

gameServer.listen(port).then(() => {
  console.log(`Zenjong Colyseus server listening on ws://localhost:${port}`);
});
