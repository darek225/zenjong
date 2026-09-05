"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import GameHUD from "./components/GameHUD";
import InventoryModal from "./components/InventoryModal";
import MapSelector from "./components/MapSelector";
import { useMahjongGame } from "../hooks/useMahjongGame";
import type { OwnedItem } from "../lib/inventory";

const ZenjongCanvas = dynamic(() => import("./components/ZenjongCanvas"), { ssr: false });

export default function Home() {
  const [mode, setMode] = useState<"arcade" | "multiplayer">("arcade");
  const game = useMahjongGame(mode);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState("classic_green");
  const [topDown, setTopDown] = useState(false);
  const [backColor, setBackColor] = useState("#1f6e3a");
  const [avatar, setAvatar] = useState("Jade Scholar");
  const arcade = mode === "arcade";
  const won = arcade && game.solitaire.tiles.length === 0;
  const players = Array.from(game.gameState?.players ?? []).map(([sessionId, player]) => ({
    ...player, sessionId, isCurrentTurn: sessionId === game.currentTurn, isMe: sessionId === game.room?.sessionId,
  }));
  const equip = (item: OwnedItem) => {
    if (item.item_type === "table_skin") setSelectedMapId(item.id);
    if (item.item_type === "tileset") setBackColor(item.id === "default-obsidian" ? "#302922" : "#1f6e3a");
    if (item.item_type === "avatar") setAvatar(item.name);
  };
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <h1 className="text-lg font-semibold tracking-widest text-amber-100">ZENJONG <span className="text-xs tracking-normal text-white/50">· {avatar}</span></h1>
      <nav aria-label="Game mode" className="flex gap-2 text-sm">
        <button className="rounded border border-white/20 px-3 py-2" aria-pressed={arcade} onClick={() => setMode("arcade")}>Solitaire</button>
        <button className="rounded border border-white/20 px-3 py-2" aria-pressed={!arcade} onClick={() => setMode("multiplayer")}>Multiplayer</button>
      </nav>
    </header>
    <section aria-label="Mahjong table" className="relative h-[calc(100dvh-5rem)] min-h-[650px]">
      <ZenjongCanvas myTiles={game.myTiles} discardPile={arcade ? [] : game.discardPile}
        selectedTiles={game.selectedTiles} onTileClick={game.toggleTileSelection} onTileHover={() => {}}
        isMyTurn={!arcade && game.isMyTurn} discardTile={game.discardTile}
        selectedMapId={selectedMapId} isDualCamera={topDown}
        board={arcade ? game.solitaire.tiles : undefined} freeIds={game.freeIds}
        reaction={game.solitaire.reaction} revision={game.solitaire.revision}
        paused={game.paused || inventoryOpen || mapOpen} backColor={backColor} />
      <GameHUD hudState="IN_GAME" gameMode={mode} isConnected={game.isConnected}
        remainingTiles={arcade ? game.solitaire.tiles.length : game.gameState?.wall.remaining ?? 0}
        activeScore={arcade ? game.solitaire.score : players.find(player => player.isMe)?.score ?? 0}
        timeRemaining={game.elapsed} combo={game.solitaire.combo} pairsRemaining={game.solitaire.tiles.length / 2}
        arcadeActionsEnabled={arcade && !game.paused && !won}
        onUndo={game.undo} onHint={game.hint} onShuffle={game.shuffle}
        onDeclareWin={game.declareWin} onOpenInventory={() => setInventoryOpen(true)}
        players={players} currentTurn={game.currentTurn} turnTimeLeft={game.turnTimeLeft} isMyTurn={game.isMyTurn}
        selectedMapId={selectedMapId} onSelectMap={setSelectedMapId} onToggleCamera={() => setTopDown(value => !value)}
        mapSelectorOpen={mapOpen} onOpenMapSelector={() => setMapOpen(true)} onCloseMapSelector={() => setMapOpen(false)}
        onStartGame={arcade ? game.newGame : undefined} paused={game.paused}
        onTogglePause={arcade ? () => game.setPaused(value => !value) : undefined} />
      {arcade && (won || game.paused || !game.hasMoves) && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div role="status" className="pointer-events-auto max-w-sm rounded-2xl border border-amber-200/40 bg-slate-950/95 p-6 text-center shadow-xl">
          <h2 className="mb-2 text-2xl text-amber-100">{won ? "Table cleared" : game.paused ? "Take a breath" : "No free pairs"}</h2>
          <p className="mb-4 text-sm text-white/70">{won ? `72 pairs · ${game.solitaire.score.toLocaleString()} points` : game.paused ? "Your hand is waiting." : "Shuffle the remaining tiles or undo your last move."}</p>
          <button className="rounded-lg bg-emerald-800 px-4 py-2" onClick={won ? game.newGame : game.paused ? () => game.setPaused(false) : game.shuffle}>
            {won ? "New hand" : game.paused ? "Resume" : "Shuffle"}
          </button>
          {!won && !game.paused && <button className="ml-2 rounded-lg border border-white/20 px-4 py-2" onClick={game.undo}>Undo</button>}
        </div>
      </div>}
      {!arcade && !game.isConnected && <p role="status" className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-slate-950/90 p-3 text-center text-sm">Connecting to multiplayer. Solitaire is available without a server.</p>}
    </section>
    <MapSelector isOpen={mapOpen} onClose={() => setMapOpen(false)} selectedMapId={selectedMapId} onSelectMap={setSelectedMapId} />
    <InventoryModal isOpen={inventoryOpen} onClose={() => setInventoryOpen(false)} userId={game.room?.sessionId ?? "guest"}
      onEquip={equip} onUnequip={item => {
        if (item.item_type === "tileset") setBackColor("#1f6e3a");
        if (item.item_type === "table_skin") setSelectedMapId("classic_green");
        if (item.item_type === "avatar") setAvatar("Guest");
      }} />
  </main>;
}