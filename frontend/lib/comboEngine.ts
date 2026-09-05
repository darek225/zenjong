/**
 * Combo Engine - Tracks combos, streak multipliers, and suit synergies
 * Triggers Dual-Hand Co-Op "Synchronized Surge" bonuses via Realtime channels
 */
import { PlayerRole } from './supabaseRealtime';

export type SuitType = 'bamboo' | 'characters' | 'dots' | 'winds' | 'dragons' | 'flowers' | 'seasons';

export interface ComboState {
  comboCount: number;
  maxCombo: number;
  comboTimer: number;
  suitStreak: SuitType | null;
  suitCount: Map<SuitType, number>;
  lastMatchTime: number;
  multiplier: number;
  isSynchronizedSurge: boolean;
  callout: string;
  fxLevel: 'NONE' | 'GREEN_SPARKLES' | 'BLUE_FLAME' | 'FIRE_SURGE';
}

export class ComboEngine {
  private state: ComboState;
  private powerUpState: PowerUpState;
  private comboTimer: ReturnType<typeof setInterval> | null = null;
  private realtimeRef: any = null;

  constructor() {
    this.state = {
      comboCount: 0,
      maxCombo: 0,
      comboTimer: 0,
      suitStreak: null,
      suitCount: new Map(),
      lastMatchTime: 0,
      multiplier: 1,
      isSynchronizedSurge: false,
      callout: '',
      fxLevel: 'NONE',
    };
    this.powerUpState = {
      lightning: false,
      timeFreeze: false,
      tileBomb: false,
      lightningCooldown: 0,
      timeFreezeCooldown: 0,
      tileBombCooldown: 0,
    };
  }

  setRealtimeRef(ref: any): void { this.realtimeRef = ref; }

  processMatch(tile1: any, tile2: any): { multiplier: number; combo: ComboState } {
    const now = Date.now();
    const timeSinceLast = now - this.state.lastMatchTime;

    if (timeSinceLast > 2500 && this.state.comboCount > 0) {
      this.state.comboCount = Math.max(0, this.state.comboCount - 1);
      this.state.multiplier = this.calculateMultiplier(this.state.comboCount);
    }

    this.state.comboCount++;
    this.state.lastMatchTime = now;
    if (this.state.comboCount > this.state.maxCombo) this.state.maxCombo = this.state.comboCount;

    const suit1 = this.getSuitType(tile1.type);
    const suit2 = this.getSuitType(tile2.type);
    if (suit1 && suit1 === suit2) {
      const c = this.state.suitCount.get(suit1) || 0;
      this.state.suitCount.set(suit1, c + 1);
      this.state.suitStreak = suit1;
      if (c + 1 >= 3) this.state.callout = 'SUIT SYNERGY!';
    } else { this.state.suitCount.clear(); this.state.suitStreak = null; }

    this.state.multiplier = this.calculateMultiplier(this.state.comboCount);
    this.state.fxLevel = this.getFxLevel(this.state.comboCount);
    this.state.callout = this.getCallout(this.state.comboCount);

    if (this.state.comboCount >= 5 && Math.random() < 0.1) {
      this.state.isSynchronizedSurge = true;
      this.state.callout = 'SYNCHRONIZED SURGE!';
      setTimeout(() => { this.state.isSynchronizedSurge = false; }, 3000);
    }

    if (this.powerUpState.timeFreeze) this.state.comboCount = Math.min(this.state.comboCount + 2, 99);
    return { multiplier: this.state.multiplier, combo: { ...this.state, suitCount: new Map(this.state.suitCount) } };
  }

  private getSuitType(tileType: string): SuitType | null {
    const m: Record<string, SuitType> = { bamboo: 'bamboo', characters: 'characters', dots: 'dots', winds: 'winds', dragons: 'dragons', flowers: 'flowers', seasons: 'seasons' };
    return m[tileType] || null;
  }

  private calculateMultiplier(c: number): number { if (c >= 9) return 5.0; if (c >= 5) return 2.5; if (c >= 2) return 1.5; return 1.0; }
  private getFxLevel(c: number): 'NONE' | 'GREEN_SPARKLES' | 'BLUE_FLAME' | 'FIRE_SURGE' { if (c >= 9) return 'FIRE_SURGE'; if (c >= 5) return 'BLUE_FLAME'; if (c >= 2) return 'GREEN_SPARKLES'; return 'NONE'; }
  private getCallout(c: number): string { if (c >= 9) return 'FIRE SURGE!'; if (c >= 7) return '9x CHAIN!'; if (c >= 5) return '5x CHAIN!'; if (c >= 3) return '3x CHAIN!'; if (c >= 2) return '2x COMBO!'; return ''; }
}

export interface PowerUpState {
  lightning: boolean;
  timeFreeze: boolean;
  tileBomb: boolean;
  lightningCooldown: number;
  timeFreezeCooldown: number;
  tileBombCooldown: number;
}

export const POWER_UP_COOLDOWNS = {
  lightning: 8000,
  timeFreeze: 15000,
  tileBomb: 5000,
};