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



interface GameHUDProps {
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
}

export default function GameHUD({
  remainingTiles,
  activeScore,
  timeRemaining,
  isConnected,
  onUndo,
  onHint,
  onShuffle,
  onDeclareWin,
  onOpenInventory,
  players = [],
  currentTurn,
  turnTimeLeft = 0,
  isMyTurn = false,
}: GameHUDProps) {
  const [isLowTime, setIsLowTime] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    setIsLowTime(turnTimeLeft > 0 && turnTimeLeft < 10);
  }, [turnTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use the per-turn timer when active, otherwise the game elapsed timer
  const displayTime = turnTimeLeft > 0 ? turnTimeLeft : timeRemaining;
  const isTurnTimer = turnTimeLeft > 0;

  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
      {/* Left Side - Game Info */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white pointer-events-auto min-w-[200px]">
        <div className="flex flex-col space-y-2">
          <div className="text-lg font-bold">
            Tiles: <span className="text-yellow-400">{remainingTiles}</span>
          </div>
          <div className="text-base">
            Score: <span className="text-green-400">{activeScore}</span>
          </div>
          <div className={`text-sm font-mono ${isLowTime ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
            {isTurnTimer ? `Turn: ${formatTime(displayTime)}` : `Time: ${formatTime(displayTime)}`}
          </div>
          {/* Player Balances */}
          {players.map((p) => (
            <div
              key={p.sessionId}
              className={`text-xs px-2 py-1 rounded flex justify-between items-center gap-3 ${
                p.isCurrentTurn
                  ? 'bg-yellow-600/40 border border-yellow-500'
                  : p.isMe
                  ? 'bg-blue-600/30 border border-blue-500'
                  : 'bg-black/40'
              }`}
            >
              <span className={p.isMe ? 'text-cyan-300' : 'text-gray-200'}>
                {p.isMe ? '👤 ' : ''}{p.username}
                {p.isCurrentTurn ? ' ⭐' : ''}
              </span>
              <span className="text-green-300">
                💎 {p.jadeBalance}
              </span>
              <span className="text-pink-300">
                🪬 {p.pearlBalance}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Center - Turn Indicator */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-auto gap-2">
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-sm border transition-all duration-300 ${
          isConnected
            ? isMyTurn
              ? 'bg-yellow-500/30 border-yellow-400'
              : 'bg-green-500/20 border-green-400'
            : 'bg-red-500/20 border-red-400'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            isConnected
              ? isMyTurn
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-green-400'
              : 'bg-red-400'
          }`}></div>
          <span className="text-sm font-medium text-white">
            {isConnected
              ? isMyTurn
                ? '⭐ Your Turn!'
                : `Waiting for ${currentTurn ? players.find(p => p.sessionId === currentTurn)?.username || 'opponent' : 'opponent'}...`
              : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Right Side - Action Buttons */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 pointer-events-auto">
        <div className="flex flex-col space-y-2">
          {isMyTurn && onDeclareWin && (
            <button
              onClick={onDeclareWin}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🎉 Declare Win!
            </button>
          )}
          <div className="flex space-x-2 flex-wrap gap-2">
            <button
              onClick={onOpenInventory}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl"
            >
              📦 Inventory
            </button>
            <button
              onClick={onUndo}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl"
            >
              Undo
            </button>
            <button
              onClick={onHint}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl"
            >
              Hint
            </button>
            <button
              onClick={onShuffle}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl"
            >
              Shuffle
            </button>
          </div>
        </div>
      </div>

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-70"></div>
    </div>
  );
}