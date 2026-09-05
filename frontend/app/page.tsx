"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ZenjongCanvas = dynamic(() => import("./components/ZenjongCanvas"), { ssr: false });
import GameHUD from "./components/GameHUD";
import InventoryModal from "./components/InventoryModal";
import MapSelector from "./components/MapSelector";
import { useMahjongGame } from "../hooks/useMahjongGame";

export interface PlayerInfo {
  sessionId: string;
  username: string;
  score: number;
  jadeBalance: number;
  pearlBalance: number;
  isCurrentTurn: boolean;
  isMe: boolean;
}

export default function Home() {
  // Colyseus multiplayer state
  const {
    room,
    gameState,
    isConnected,
    myTiles,
    selectedTiles,
    isMyTurn,
    currentTurn,
    turnTimeLeft,
    discardPile,
    toggleTileSelection,
    sortTiles,
    discardTile,
    declareWin,
  } = useMahjongGame();

  const [hoveredTiles, setHoveredTiles] = useState<Set<string>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [remainingTiles, setRemainingTiles] = useState(144);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string>("temple_courtyard");
  const [isDualCamera, setIsDualCamera] = useState(false);
  const [mapSelectorOpen, setMapSelectorOpen] = useState(false);

  // Derive score from game state (simplified)
  const activeScore = gameState?.players?.get(room?.sessionId)?.score ?? 0;

  const handleTileClick = (tileId: string) => {
    // Only allow discarding when it's the local player's turn
    if (!isMyTurn) {
      // Just select the tile for viewing, don't discard
      toggleTileSelection(tileId);
      return;
    }
    // Discard the tile via Colyseus
    discardTile(tileId);
  };

  const handleTileHover = (tileId: string, isHovering: boolean) => {
    setHoveredTiles((prev) => {
      const next = new Set(prev);
      if (isHovering) {
        next.add(tileId);
      } else {
        next.delete(tileId);
      }
      return next;
    });
  };

  // Update remaining tiles from wall state
  useEffect(() => {
    if (gameState?.wall?.remaining !== undefined) {
      setRemainingTiles(gameState.wall.remaining);
    }
  }, [gameState?.wall?.remaining]);

  // Simple elapsed timer (client-side)
  useEffect(() => {
    if (!gameOver && remainingTiles > 0) {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameOver, remainingTiles]);

  const displayTimeRemaining = turnTimeLeft > 0 ? turnTimeLeft : Math.max(0, 300 - timeElapsed);

  const handleUndo = () => {
    // In multiplayer, undo is not typically allowed - just clear selection
    if (selectedTiles.length > 0) {
      selectedTiles.forEach((id) => toggleTileSelection(id));
    }
  };

  const handleHint = () => {
    alert("Hint: Look for matching pairs!");
  };

  const handleShuffle = () => {
    // Reset (demo) - in multiplayer this would trigger a new round
    setRemainingTiles(144);
    setTimeElapsed(0);
  };

  const handleDeclareWin = () => {
    declareWin();
  };

  // Build list of player info from gameState
  const players: PlayerInfo[] = gameState
    ? Array.from(
        gameState.players.entries() as Iterable<[string, any]>
      ).map(([sessionId, p]) => ({
        sessionId,
        username: p.username,
        score: p.score,
        jadeBalance: p.jadeBalance ?? 1000,
        pearlBalance: p.pearlBalance ?? 100,
        isCurrentTurn: sessionId === currentTurn,
        isMe: sessionId === room?.sessionId,
      }))
    : [];

  // Sort my tiles for display
  const sortedMyTiles = sortTiles(myTiles);
  
  // Development fallback: generate mock tiles if not connected and no tiles from backend
  const devMyTiles = isConnected ? sortedMyTiles : [
    // Default 14 tiles for development when backend is unavailable
    "DOT_1", "DOT_2", "DOT_3", "DOT_4", "DOT_5",
    "BAM_1", "BAM_2", "BAM_3", "BAM_4", "BAM_5",
    "WIND_EAST", "WIND_SOUTH", "WIND_WEST", "WIND_NORTH",
  ];

  return (
    <main className="relative min-h-screen bg-gray-900 text-white p-4 overflow-hidden">
      <h1 className="text-2xl font-bold text-center mb-6">
        Project Zenjong - Multiplayer Mahjong
      </h1>
      <div className="relative">
        <div className="w-full h-[600px] min-h-[500px] relative border border-gray-700 rounded-lg overflow-hidden">
          <ZenjongCanvas
            myTiles={devMyTiles}
            discardPile={discardPile}
            selectedTiles={selectedTiles}
            onTileClick={handleTileClick}
            onTileHover={handleTileHover}
            isMyTurn={isMyTurn}
            discardTile={discardTile}
            selectedMapId={selectedMapId}
            isDualCamera={isDualCamera}
          />
        </div>

        {/* Game HUD Overlay */}
        <GameHUD
          hudState="IN_GAME"
          remainingTiles={remainingTiles}
          activeScore={activeScore}
          timeRemaining={displayTimeRemaining}
          isConnected={isConnected}
          onUndo={handleUndo}
          onHint={handleHint}
          onShuffle={handleShuffle}
          onDeclareWin={handleDeclareWin}
          onOpenInventory={() => setInventoryModalOpen(true)}
          players={players}
          currentTurn={currentTurn}
          turnTimeLeft={turnTimeLeft}
          isMyTurn={isMyTurn}
          selectedMapId={selectedMapId}
          onSelectMap={setSelectedMapId}
          onToggleCamera={() => setIsDualCamera((prev) => !prev)}
          mapSelectorOpen={mapSelectorOpen}
          onOpenMapSelector={() => setMapSelectorOpen(true)}
          onCloseMapSelector={() => setMapSelectorOpen(false)}
        />
        <InventoryModal
          isOpen={inventoryModalOpen}
          onClose={() => setInventoryModalOpen(false)}
          userId={room?.sessionId ?? "guest"}
          purchaseRefreshKey={0}
        />
      </div>
    </main>
  );
}