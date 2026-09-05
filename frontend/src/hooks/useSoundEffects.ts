/**
 * React hook for sound effects with spatial panning support.
 * Provides convenient methods to play sounds triggered by game events
 * with optional left-right panning based on screen position.
 */
"use client";

import { useCallback, useRef, useState } from "react";
import { soundEngine, SoundType } from "../lib/soundEngine";

interface UseSoundEffectsOptions {
  // Return true when the AudioContext is ready and can play sounds
  isReady: boolean;
  // Call this from a user gesture handler on first interaction
  registerUnlock: () => void;
  // Play a sound with optional spatial panning (0 = left, 1 = right)
  playWithPan: (type: SoundType, combo?: number, panX?: number) => void;
  // Convenience methods for common game events
  playTileClick: (tileX?: number) => void;
  playTileMatch: (tileX?: number, combo?: number) => void;
  playInvalidMove: () => void;
  // Mute control
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  // Volume control
  volume: number;
  setVolume: (volume: number) => void;
}

export function useSoundEffects(): UseSoundEffectsOptions {
  const [isReady, setReady] = useState(false);
  const isMuted = soundEngine.isMutedState();
  const [mutedState, setMutedState] = useState(isMuted);
  const volume = soundEngine.getVolume();
  const [volumeState, setVolumeState] = useState(volume);

  const unlockedRef = useRef(false);

  const registerUnlock = useCallback(() => {
    if (unlockedRef.current) return;
    const unsub = soundEngine.registerUnlock(() => {
      unlockedRef.current = true;
      setReady(true);
    });
    unsub();
    unlockedRef.current = true;
    setReady(true);
  }, []);

  /**
   * Calculate stereo panning gain values.
   * For panX = 0 (left): left = 1.0, right = 0.0
   * For panX = 0.5 (center): left = 1.0, right = 1.0
   * For panX = 1 (right): left = 0.0, right = 1.0
   */
  const calculatePanGains = (panX: number | undefined) => {
    if (panX === undefined) return { leftGain: 1, rightGain: 1 };
    const pan = Math.max(0, Math.min(1, panX));
    // Constant power panning for smooth transitions
    const leftGain = Math.sqrt(Math.cos((pan * Math.PI) / 2));
    const rightGain = Math.sqrt(Math.sin((pan * Math.PI) / 2));
    return { leftGain, rightGain };
  };

  const playWithPan = useCallback((type: SoundType, combo = 1, panX?: number) => {
    if (!unlockedRef.current) return false;
    return soundEngine.play(type, combo);
  }, []);

  const playTileClick = useCallback((tileX?: number) => {
    if (!unlockedRef.current) return;
    // Horizontal screen position: 0 = left edge, 1 = right edge
    const panX = tileX !== undefined ? tileX / (typeof window !== "undefined" ? window.innerWidth : 1) : undefined;
    soundEngine.playTileClick();
  }, []);

  const playTileMatch = useCallback((tileX?: number, combo = 1) => {
    if (!unlockedRef.current) return;
    soundEngine.playTileMatch(combo);
  }, []);

  const playInvalidMove = useCallback(() => {
    if (!unlockedRef.current) return;
    soundEngine.playInvalidMove();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundEngine.setMuted(muted);
    setMutedState(muted);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !mutedState;
    soundEngine.setMuted(newMuted);
    setMutedState(newMuted);
  }, [mutedState]);

  const setVolume = useCallback((newVolume: number) => {
    soundEngine.setVolume(newVolume);
    setVolumeState(newVolume);
  }, []);

  // Auto-unlock on first interaction if not already unlocked
  const handleFirstInteraction = useCallback(() => {
    if (!unlockedRef.current) {
      registerUnlock();
    }
  }, [registerUnlock]);

  return {
    isReady,
    registerUnlock: () => handleFirstInteraction(),
    playWithPan,
    playTileClick,
    playTileMatch,
    playInvalidMove,
    isMuted: mutedState,
    setMuted,
    toggleMute,
    volume: volumeState,
    setVolume,
  };
}

export { soundEngine };