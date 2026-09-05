"use client";

import { useRef, useCallback, useEffect } from "react";

type AudioContextType = AudioContext | null;

type SoundType = "TILE_CLICK" | "TILE_MATCH" | "COMBO_SURGE" | "POWERUP_USE" | "INVALID_MOVE" | "HUDE_CLICK" | "NAVIGATE";

const SOUND_SETTINGS: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; volume?: number }> = {
  TILE_CLICK: { frequency: 1200, duration: 0.05, type: "square" },
  TILE_MATCH: { frequency: 660, duration: 0.1, type: "sine" },
  COMBO_SURGE: { frequency: 880, duration: 0.3, type: "sawtooth" },
  POWERUP_USE: { frequency: 440, duration: 0.15, type: "triangle" },
  INVALID_MOVE: { frequency: 80, duration: 0.2, type: "sine", volume: 0.3 },
  HUDE_CLICK: { frequency: 1000, duration: 0.03, type: "square" },
  NAVIGATE: { frequency: 500, duration: 0.1, type: "sine" },
};

class SoundEngine {
  private audioContext: AudioContextType = null;
  private isMuted = false;
  private volume = 1;

  constructor() {
    this.isMuted = this.loadMuteState();
    this.volume = this.loadVolumeState();
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext!;
  }

  private loadMuteState(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("zenjong_mute") === "true";
  }

  private loadVolumeState(): number {
    if (typeof window === "undefined") return 1;
    const stored = localStorage.getItem("zenjong_volume");
    return stored ? parseFloat(stored) : 1;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem("zenjong_mute", muted.toString());
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("zenjong_volume", volume.toString());
  }

  getVolume(): number {
    return this.volume;
  }

  play(type: SoundType, comboCount: number = 1): void {
    if (this.isMuted) return;

    const settings = SOUND_SETTINGS[type];
    let { frequency, duration, type: oscType } = settings;

    if (type === "TILE_MATCH" && comboCount > 1) {
      frequency = 660 + comboCount * 50;
    }

    if (type === "COMBO_SURGE") {
      frequency = 880 + comboCount * 200;
    }

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = oscType as OscillatorType;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(this.volume * (settings.volume || 1), ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  playTileClick(): void {
    this.play("TILE_CLICK");
  }

  playTileMatch(comboCount: number = 1): void {
    this.play("TILE_MATCH", comboCount);
  }

  playComboSurge(comboCount: number = 1): void {
    this.play("COMBO_SURGE", comboCount);
  }

  playPowerupUse(): void {
    this.play("POWERUP_USE");
  }

  playInvalidMove(): void {
    this.play("INVALID_MOVE");
  }

  playHudClick(): void {
    this.play("HUDE_CLICK");
  }

  playNavigate(): void {
    this.play("NAVIGATE");
  }
}

export const soundEngine = new SoundEngine();
export type { SoundType };