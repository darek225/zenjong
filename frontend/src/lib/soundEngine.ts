/**
 * Zero-latency Web Audio API Sound Synthesizer
 * Generates procedural sound effects in real time using the Web Audio API,
 * so we never ship heavy MP3/OGG assets. The AudioContext is only created
 * and resumed inside a user gesture handler (click / pointerdown / keydown)
 * to comply with browser autoplay policies (Chrome, Safari, Firefox).
 */
"use client";

export type SoundType =
  | "TILE_CLICK"
  | "TILE_MATCH"
  | "COMBO_SURGE"
  | "POWERUP_USE"
  | "INVALID_MOVE";

interface BaseVoice {
  type: OscillatorType;
  startFreq: number;
  endFreq?: number;
  startTime: number;
  endTime: number;
  peakGain: number;
  filterFreq?: number;
  filterQ?: number;
}

interface NoiseClick {
  startTime: number;
  endTime: number;
  peakGain: number;
  filterFreq: number;
}

interface EffectRecipe {
  voices: BaseVoice[];
  noiseClicks?: NoiseClick[];
}

const EFFECT_RECIPES: Record<SoundType, (combo: number) => EffectRecipe> = {
  TILE_CLICK: () => ({
    voices: [
      { type: "square", startFreq: 2400, endFreq: 1600, startTime: 0, endTime: 0.025, peakGain: 0.18, filterFreq: 4000, filterQ: 0.7 },
      { type: "sine", startFreq: 900, endFreq: 600, startTime: 0, endTime: 0.04, peakGain: 0.08 },
    ],
    noiseClicks: [{ startTime: 0, endTime: 0.008, peakGain: 0.22, filterFreq: 6000 }],
  }),

  TILE_MATCH: (combo: number) => {
    const baseRoot = 523.25;
    const root = baseRoot * Math.pow(1.05946, Math.min(combo - 1, 8));
    const fifth = root * 1.5;
    const octave = root * 2;
    return {
      voices: [
        { type: "sine", startFreq: root, startTime: 0, endTime: 0.45, peakGain: 0.22 },
        { type: "sine", startFreq: fifth, startTime: 0, endTime: 0.4, peakGain: 0.16 },
        { type: "sine", startFreq: octave, startTime: 0.01, endTime: 0.35, peakGain: 0.1 },
        { type: "triangle", startFreq: root * 4, startTime: 0, endTime: 0.18, peakGain: 0.05, filterFreq: 5000, filterQ: 1.2 },
      ],
    };
  },

  COMBO_SURGE: (combo: number) => {
    const root = 261.63 * Math.pow(1.122, Math.min(combo - 1, 6));
    return {
      voices: [
        { type: "sawtooth", startFreq: root, startTime: 0, endTime: 0.18, peakGain: 0.16, filterFreq: 2800, filterQ: 0.9 },
        { type: "sawtooth", startFreq: root * 1.26, startTime: 0.07, endTime: 0.27, peakGain: 0.16, filterFreq: 2800, filterQ: 0.9 },
        { type: "sawtooth", startFreq: root * 1.5, startTime: 0.16, endTime: 0.48, peakGain: 0.16, filterFreq: 2800, filterQ: 0.9 },
        { type: "square", startFreq: root * 0.5, startTime: 0, endTime: 0.45, peakGain: 0.12, filterFreq: 1200, filterQ: 1.4 },
      ],
    };
  },

  POWERUP_USE: () => ({
    voices: [
      { type: "triangle", startFreq: 1200, endFreq: 320, startTime: 0, endTime: 0.35, peakGain: 0.2, filterFreq: 4500, filterQ: 1.0 },
      { type: "sine", startFreq: 110, endFreq: 60, startTime: 0, endTime: 0.45, peakGain: 0.18 },
    ],
  }),

  INVALID_MOVE: () => ({
    voices: [
      { type: "sine", startFreq: 220, endFreq: 90, startTime: 0, endTime: 0.22, peakGain: 0.22 },
      { type: "triangle", startFreq: 140, endFreq: 70, startTime: 0, endTime: 0.25, peakGain: 0.12, filterFreq: 600, filterQ: 1.2 },
    ],
  }),
};

// ==================== SoundEngine Class ====================

class SoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted = false;
  private masterVolume = 0.85;
  private unlocked = false;
  private unlockListeners: Array<() => void> = [];
  private boundUnlockHandlers: Array<{ event: string; handler: (e: Event) => void }> = [];

  private loadSettings(): void {
    if (typeof window === "undefined") return;
    try {
      this.isMuted = localStorage.getItem("zenjong_sound_muted") === "true";
      const stored = localStorage.getItem("zenjong_sound_volume");
      if (stored !== null) {
        const v = parseFloat(stored);
        if (!Number.isNaN(v)) this.masterVolume = Math.max(0, Math.min(1, v));
      }
    } catch {
      // localStorage can throw in private mode — ignore.
    }
  }

  private persistSettings(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("zenjong_sound_muted", this.isMuted.toString());
      localStorage.setItem("zenjong_sound_volume", this.masterVolume.toString());
    } catch {
      // Ignore storage errors.
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") {
        void this.audioContext.resume();
      }
      return this.audioContext;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.isMuted ? 0 : this.masterVolume;
      master.connect(ctx.destination);
      this.audioContext = ctx;
      this.masterGain = master;
      return ctx;
    } catch (err) {
      console.warn("[SoundEngine] Failed to create AudioContext", err);
      return null;
    }
  }

  registerUnlock(onUnlocked?: () => void): () => void {
    if (typeof window === "undefined") {
      return () => undefined as any as () => void;
    }
    if (this.unlocked) {
      onUnlocked?.();
      return () => undefined as any as () => void;
    }
    if (onUnlocked) this.unlockListeners.push(onUnlocked);

    const events: Array<"pointerdown" | "mousedown" | "keydown" | "touchstart"> = [
      "pointerdown",
      "mousedown",
      "keydown",
      "touchstart",
    ];
    const handler = () => this.unlock();
    events.forEach((e) => {
      window.addEventListener(e, handler, { once: true, passive: true });
      this.boundUnlockHandlers.push({ event: e, handler: handler as (e: Event) => void });
    });

    return () => this.unlock();
  }

    
  unlock(): void {
    if (this.unlocked && this.audioContext?.state === "running") return;
    const ctx = this.ensureContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
    }
    this.unlocked = true;
    for (const { event, handler } of this.boundUnlockHandlers) {
      window.removeEventListener(event, handler);
    }
    this.boundUnlockHandlers = [];
    const listeners = this.unlockListeners;
    this.unlockListeners = [];
    for (const cb of listeners) {
      try {
        cb();
      } catch (err) {
        console.warn("[SoundEngine] unlock callback error", err);
      }
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.audioContext) {
      const t = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.masterVolume, t + 0.02);
    }
    this.persistSettings();
  }

  isMutedState(): boolean { return this.isMuted; }

  setVolume(volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    this.masterVolume = v;
    if (this.masterGain && this.audioContext && !this.isMuted) {
      const t = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.linearRampToValueAtTime(v, t + 0.04);
    }
    this.persistSettings();
  }

  getVolume(): number { return this.masterVolume; }

  play(type: SoundType, combo: number = 1): boolean {
    if (this.isMuted) return false;
    if (typeof window === "undefined") return false;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return false;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        if (ctx.state === "running") this.play(type, combo);
      });
      return false;
    }

    const recipe = EFFECT_RECIPES[type](combo);
    const t0 = ctx.currentTime;

    for (const voice of recipe.voices) this.scheduleVoice(voice, t0);
    for (const click of recipe.noiseClicks ?? []) this.scheduleNoiseClick(click, t0);
    return true;
  }

  private scheduleVoice(voice: BaseVoice, t0: number): void {
    const ctx = this.audioContext!;
    const master = this.masterGain!;
    const start = t0 + voice.startTime;
    const stop = t0 + voice.endTime;

    const osc = ctx.createOscillator();
    osc.type = voice.type;
    if (voice.endFreq !== undefined && voice.endFreq !== voice.startFreq) {
      osc.frequency.setValueAtTime(voice.startFreq, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, voice.endFreq), stop);
    } else {
      osc.frequency.setValueAtTime(voice.startFreq, start);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.peakGain, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);

    let chainEnd: AudioNode = osc;
    if (voice.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = voice.filterFreq;
      filter.Q.value = voice.filterQ ?? 1;
      osc.connect(filter);
      chainEnd = filter;
    }
    chainEnd.connect(gain);
    gain.connect(master);

    osc.start(start);
    osc.stop(stop + 0.02);
    osc.onended = () => {
      try {
        gain.disconnect();
        chainEnd.disconnect();
        osc.disconnect();
      } catch {
        // Already disconnected — ignore.
      }
    };
  }

  private scheduleNoiseClick(click: NoiseClick, t0: number): void {
    const ctx = this.audioContext!;
    const master = this.masterGain!;
    const start = t0 + click.startTime;
    const stop = t0 + click.endTime;
    const duration = Math.max(0.005, stop - start);

    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = click.filterFreq;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(click.peakGain, start + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(start);
    source.stop(stop + 0.02);
    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  playTileClick(): boolean { return this.play("TILE_CLICK"); }
  playTileMatch(combo = 1): boolean { return this.play("TILE_MATCH", combo); }
  playComboSurge(combo = 1): boolean { return this.play("COMBO_SURGE", combo); }
  playPowerupUse(): boolean { return this.play("POWERUP_USE"); }
  playInvalidMove(): boolean { return this.play("INVALID_MOVE"); }

  destroy(): void {
    for (const { event, handler } of this.boundUnlockHandlers) {
      window.removeEventListener(event, handler);
    }
    this.boundUnlockHandlers = [];
    this.unlockListeners = [];
    if (this.audioContext) {
      try {
        void this.audioContext.close();
      } catch {
        // ignore
      }
    }
    this.audioContext = null;
    this.masterGain = null;
    this.unlocked = false;
  }
}

// Best-effort hydration of mute/volume from localStorage on client.
try {
  // Module-level hydration is handled after the export below.
} catch {
  // ignore
}

export const soundEngine = new SoundEngine();

// Hydrate mute/volume state from localStorage as soon as this module is evaluated on the client.
if (typeof window !== "undefined") {
  (soundEngine as unknown as { loadSettings: () => void }).loadSettings?.();
}

export { SoundEngine };
export default soundEngine;
