"use client";

import { useState, useEffect } from "react";

export interface PlayerHUDInfo {
  sessionId: string;
  username: string;
  score: number;
  jadeBalance: number;
  pearlBalance: number;
  isCurrentTurn: boolean;
  isMe: boolean;
}

export interface GameHUDProps {
  hudState: "MENU" | "IN_GAME" | "MAP_SELECT" | "LOBBY";
  remainingTiles: number;
  activeScore: number;
  timeRemaining: number;
  isConnected: boolean;
  onUndo: () => void;
  onHint: () => void;
  onShuffle: () => void;
  onDeclareWin?: () => void;
  players?: PlayerHUDInfo[];
  currentTurn?: string | null;
  turnTimeLeft?: number;
  isMyTurn?: boolean;
  onOpenInventory?: () => void;
  selectedMapId: string;
  onSelectMap: (mapId: string) => void;
  onToggleCamera: () => void;
  mapSelectorOpen: boolean;
  onOpenMapSelector: () => void;
  onCloseMapSelector: () => void;
  currentCameraPreset?: "classic" | "minimal" | "zen";
  onCameraPresetChange?: (preset: string) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  tileSet?: string;
  onTileSetChange?: (set: string) => void;
  onStartGame?: () => void;
  onCreateRoom?: () => void;
  onJoinRoom?: (code: string) => void;
  onQuickMatch?: () => void;
  onLeaveLobby?: () => void;
  onToggleReady?: () => void;
  lobbyPlayers?: { username: string; isReady: boolean }[];
  roomCode?: string;
}
export default function GameHUD(props: GameHUDProps) {
  const {
    remainingTiles, activeScore, timeRemaining, isConnected,
    onUndo, onHint, onShuffle, onDeclareWin, onOpenInventory,
    players = [], currentTurn, turnTimeLeft = 0, isMyTurn = false,
    selectedMapId, onSelectMap, onToggleCamera,
    mapSelectorOpen, onOpenMapSelector, onCloseMapSelector,
  } = props;
  const [isLowTime, setIsLowTime] = useState(false);
  useEffect(() => { setIsLowTime(turnTimeLeft > 0 && turnTimeLeft < 10); }, [turnTimeLeft]);
  const fmtTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const displayTime = turnTimeLeft > 0 ? turnTimeLeft : timeRemaining;
  const isTurnTimer = turnTimeLeft > 0;
  const pairs = Math.floor(remainingTiles / 2);
  const mapLabel = selectedMapId === "temple_courtyard" ? "🏛️ Temple" : selectedMapId === "nature_stump" ? "🌿 Nature" : selectedMapId === "mystic_sanctuary" ? "✨ Sanctuary" : "💡 Parlor";
  const turnBg = isConnected ? isMyTurn ? "bg-yellow-500/30 border-yellow-400/70" : "bg-green-500/20 border-green-400/60" : "bg-red-500/20 border-red-400/60";
  const turnDot = isConnected ? isMyTurn ? "bg-yellow-400 animate-pulse" : "bg-green-400" : "bg-red-400";
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
      <div className="glass-panel rounded-xl p-4 text-white pointer-events-auto min-w-[220px] border border-white/10 shadow-xl">
        <div className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">Game Stats</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center"><span className="text-sm text-white/70">Tiles Left</span><span className="text-lg font-bold text-yellow-400 tabular-nums">{remainingTiles}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-white/70">Score</span><span className="text-lg font-bold text-green-400 tabular-nums">{activeScore}</span></div>
          <div className="flex justify-between items-center"><span className="text-sm text-white/70">Pairs</span><span className="text-lg font-bold text-cyan-400 tabular-nums">{pairs}</span></div>
          <div className={`text-sm font-mono tabular-nums ${isLowTime ? "text-red-400 animate-pulse" : "text-blue-300"}`}>{isTurnTimer ? `⏱️ Turn: ${fmtTime(displayTime)}` : `🕐 Time: ${fmtTime(displayTime)}`}</div>
        </div>
      </div>
      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-auto gap-2">
        <div className={`flex items-center space-x-2 px-5 py-2.5 rounded-full backdrop-blur-xl border shadow-lg transition-all duration-300 ${turnBg}`}>
          <div className={`w-3.5 h-3.5 rounded-full shadow-md ${turnDot}`}></div>
          <span className="text-sm font-semibold text-white drop-shadow-sm">{isConnected ? isMyTurn ? "⭐ Your Turn!" : "Waiting..." : "Disconnected"}</span>
        </div>
      </div>
      <div className="glass-panel rounded-xl p-4 pointer-events-auto border border-white/10 shadow-xl">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
            <button onClick={onOpenMapSelector} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-200 text-xs font-medium">{mapLabel}</button>
            <button onClick={onToggleCamera} className="w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-200 flex items-center justify-center text-sm">📐</button>
          </div>
          {isMyTurn && onDeclareWin && <button onClick={onDeclareWin} className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white rounded-lg transition-all duration-200 font-bold shadow-lg text-sm">🎉 Declare Win!</button>}
          <div className="flex flex-wrap gap-2">
            <button onClick={onOpenInventory} className="px-3 py-2 bg-gradient-to-r from-cyan-600/80 to-cyan-700/80 hover:from-cyan-500 text-white rounded-lg text-xs font-medium shadow-lg">📦 Inventory</button>
            <button onClick={onUndo} className="px-3 py-2 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-500 text-white rounded-lg text-xs font-medium shadow-lg">↩ Undo</button>
            <button onClick={onHint} className="px-3 py-2 bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500 text-white rounded-lg text-xs font-medium shadow-lg">💡 Hint</button>
            <button onClick={onShuffle} className="px-3 py-2 bg-gradient-to-r from-orange-600/80 to-orange-700/80 hover:from-orange-500 text-white rounded-lg text-xs font-medium shadow-lg">🔀 Shuffle</button>
          </div>
        </div>
      </div>
    </div>
  );
}