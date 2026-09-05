"use client";

import { useCallback } from "react";
import { soundEngine } from "../lib/soundEngine";

interface UseSoundEffectsReturn {
  playTileClick: () => void;
  playTileMatch: (comboCount?: number) => void;
  playComboSurge: (comboCount?: number) => void;
  playPowerupUse: () => void;
  playInvalidMove: () => void;
  playHudClick: () => void;
  playNavigate: () => void;
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const playTileClick = useCallback(() => soundEngine.playTileClick(), []);
  const playTileMatch = useCallback((comboCount = 1) => soundEngine.playTileMatch(comboCount), []);
  const playComboSurge = useCallback((comboCount = 1) => soundEngine.playComboSurge(comboCount), []);
  const playPowerupUse = useCallback(() => soundEngine.playPowerupUse(), []);
  const playInvalidMove = useCallback(() => soundEngine.playInvalidMove(), []);
  const playHudClick = useCallback(() => soundEngine.playHudClick(), []);
  const playNavigate = useCallback(() => soundEngine.playNavigate(), []);

  const isMuted = soundEngine.isMutedState();
  const volume = soundEngine.getVolume();

  const setMuted = useCallback((muted: boolean) => soundEngine.setMuted(muted), []);
  const setVolume = useCallback((vol: number) => soundEngine.setVolume(vol), []);
  const toggleMute = useCallback(() => soundEngine.setMuted(!soundEngine.isMutedState()), []);

  return {
    playTileClick,
    playTileMatch,
    playComboSurge,
    playPowerupUse,
    playInvalidMove,
    playHudClick,
    playNavigate,
    isMuted,
    setMuted,
    volume,
    setVolume,
    toggleMute,
  };
}

export { soundEngine };