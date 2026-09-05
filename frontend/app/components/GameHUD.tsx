"use client";

import { useState } from "react";

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
  gameMode?: "multiplayer" | "arcade" | "preview";
  combo?: number;
  pairsRemaining?: number;
  turnDuration?: number;
  arcadeActionsEnabled?: boolean;
  paused?: boolean;
  onTogglePause?: () => void;
}
export default function GameHUD(props: GameHUDProps) {
  const {
    remainingTiles, activeScore, timeRemaining, isConnected,
    onUndo, onHint, onShuffle, onDeclareWin, onOpenInventory,
    players = [], currentTurn, turnTimeLeft = 0, isMyTurn = false,
    onToggleCamera, onOpenMapSelector,
    gameMode = "multiplayer", combo, pairsRemaining, turnDuration = 30,
    arcadeActionsEnabled = false,
  } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const seconds = (value: number) => Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0;
  const fmtTime = (value: number) => {
    const s = seconds(value);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };
  const isTurnTimer = gameMode === "multiplayer" && isConnected && !!currentTurn;
  const displayTime = seconds(isTurnTimer ? turnTimeLeft : timeRemaining);
  const duration = Math.max(1, seconds(turnDuration));
  const progress = Math.min(100, displayTime / duration * 100);
  const isLowTime = isTurnTimer && displayTime <= 10;
  const arcadeEnabled = gameMode === "arcade" && arcadeActionsEnabled;
  const status = gameMode === "arcade" ? "Single Player Mode"
    : gameMode === "preview" ? "Offline Preview"
    : !isConnected ? "Connecting to Room..."
    : !currentTurn ? "Waiting for Players..."
    : `${isMyTurn ? "Your Turn" : "Turn"}: ${fmtTime(turnTimeLeft)}`;
  const me = players.find(player => player.isMe);
  const panel = "rounded-xl border border-amber-200/25 bg-slate-950/85 shadow-xl backdrop-blur-md";
  const button = "min-h-11 rounded-lg border border-amber-200/20 bg-white/5 px-3 py-2 text-xs font-medium text-amber-50 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-2 text-white sm:p-4">
      <header className="grid items-start gap-2 xl:grid-cols-[1fr_auto_1fr]">
        <div className="hidden xl:block" />
        <div className={`${panel} justify-self-center px-4 py-3 text-center text-sm font-semibold tabular-nums`}>
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isMyTurn ? "bg-amber-300" : "bg-emerald-400"}`} aria-hidden="true" />
          {status}
        </div>
        <nav aria-label="Game actions" className={`${panel} pointer-events-auto flex flex-wrap justify-center gap-1 p-2 xl:justify-self-end`}>
          <button type="button" className={button} aria-expanded={menuOpen} aria-controls="temple-menu" onClick={() => setMenuOpen(!menuOpen)}>🏛️ Temple / Menu</button>
          <button type="button" className={button} disabled={!onOpenInventory} onClick={onOpenInventory}>🎒 Inventory</button>
          <button type="button" className={button} disabled={!arcadeEnabled} onClick={onUndo} title="Arcade only">↩ Undo</button>
          <button type="button" className={button} disabled={!arcadeEnabled} onClick={onHint} title="Arcade only">💡 Hint</button>
          <button type="button" className={button} disabled={!arcadeEnabled} onClick={onShuffle} title="Arcade only">🔀 Shuffle</button>
          {props.onTogglePause && <button type="button" className={button} onClick={props.onTogglePause}>{props.paused ? "▶ Resume" : "Ⅱ Pause"}</button>}
        </nav>
      </header>
      {menuOpen && (
        <section id="temple-menu" aria-label="Temple menu" className={`${panel} pointer-events-auto absolute right-2 top-36 flex max-w-[calc(100%-1rem)] flex-col gap-2 p-4 sm:right-4 xl:top-24`}>
          <h2 className="font-semibold text-amber-100">Temple</h2>
          <button type="button" className={button} onClick={() => { setMenuOpen(false); onOpenMapSelector(); }}>Level &amp; environment select</button>
          <button type="button" className={button} onClick={onToggleCamera}>Switch table camera</button>
          {props.onStartGame && <button type="button" className={button} onClick={() => { props.onStartGame?.(); setMenuOpen(false); }}>New solitaire hand</button>}
          <button type="button" className={button} onClick={() => setMenuOpen(false)}>Back to game</button>
        </section>
      )}
      <aside aria-label="Game stats" className={`${panel} mt-2 w-fit max-w-full p-3 xl:mt-4 xl:w-56`}>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-100/70">Game stats</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
          <dt className="text-white/70">{gameMode === "arcade" ? "Tiles remaining" : "Tiles in wall"}</dt>
          <dd className="text-right font-semibold text-amber-200">{gameMode === "preview" ? "—" : remainingTiles}</dd>
          <dt className="text-white/70">{gameMode === "arcade" ? "Score" : "Match points"}</dt>
          <dd className="text-right font-semibold text-emerald-300">{activeScore.toLocaleString("en-US")}</dd>
          {gameMode === "arcade" && <>
            <dt className="text-white/70">Pairs remaining</dt><dd className="text-right">{pairsRemaining ?? Math.floor(remainingTiles / 2)}</dd>
            <dt className="text-white/70">Combo</dt><dd className="text-right">{combo ?? 0}×</dd>
          </>}
          {me && <>
            <dt className="text-emerald-300">Jade</dt><dd className="text-right">{me.jadeBalance}</dd>
            <dt className="text-amber-100">Pearls · vanity</dt><dd className="text-right">{me.pearlBalance}</dd>
          </>}
        </dl>
        {gameMode !== "preview" && <div className={`mt-2 text-xs tabular-nums ${isLowTime ? "text-red-300" : "text-white/70"}`}>
          {isTurnTimer ? "Turn" : "Time"}: {fmtTime(displayTime)}
          {isTurnTimer && <div role="progressbar" aria-label="Turn time remaining" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.min(duration, displayTime)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full transition-[width] motion-reduce:transition-none ${isLowTime ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${progress}%` }} />
          </div>}
        </div>}
        {isTurnTimer && isMyTurn && onDeclareWin && <button type="button" className={`${button} pointer-events-auto mt-3 w-full`} onClick={onDeclareWin}>Declare win</button>}
      </aside>
      <p className="absolute bottom-3 left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-full bg-slate-950/80 px-4 py-2 text-center text-xs text-amber-50/80">
        {gameMode === "preview" ? "Preview only · select a tile to inspect"
          : gameMode === "arcade" ? "Match free pairs to clear the table"
          : "Select a tile · click again on your turn to discard"}
      </p>
    </div>
  );
}