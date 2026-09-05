import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jifvosqcxkohhvnfnbit.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_X4FLQupOnHzj5e82LzL6JQ_w7ACDIAH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PlayerRole = 'p1' | 'p2' | null;

export interface RealtimeTile {
  id: string;
  type: string;
  value: number;
  name: string;
  claimedBy: PlayerRole;
  isHighlighted: boolean;
  isMatched: boolean;
}

export interface RealtimePlayer {
  sessionId: string;
  username: string;
  role: PlayerRole;
  score: number;
  ping: number;
  isConnected: boolean;
}

export interface RealtimeRoomState {
  roomId: string;
  players: RealtimePlayer[];
  tiles: RealtimeTile[];
  currentTurn: PlayerRole;
  boardShuffled: boolean;
}

export type RealtimeEventType = 'PLAYER_JOINED' | 'TILE_SELECT' | 'TILE_MATCH' | 'BOARD_SHUFFLE' | 'TURN_UPDATE';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: any;
  timestamp: number;
  senderId: string;
}
export class SupabaseRealtimeManager {
  private supabase: SupabaseClient;
  private channel: any = null;
  private roomId: string;
  private userId: string;
  private listeners: Map<RealtimeEventType, Set<(event: RealtimeEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isConnected = false;

  constructor(supabaseClient: SupabaseClient, roomId: string, userId: string) {
    this.supabase = supabaseClient;
    this.roomId = roomId;
    this.userId = userId;
  }

  connect(): void {
    this.channel = this.supabase.channel(`mahjong_room:${this.roomId}`);
    this.channel.on('broadcast', { event: '*' }, (payload: any) => {
      if (payload.payload?.senderId === this.userId) return;
      this.handleEvent(payload.payload as RealtimeEvent);
    }).subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.broadcast({ type: 'PLAYER_JOINED', payload: { userId: this.userId, roomId: this.roomId }, timestamp: Date.now(), senderId: this.userId });
        console.log(`[SupabaseRealtime] Connected to room ${this.roomId}`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.isConnected = false;
        this.stopHeartbeat();
        this.handleReconnect();
      }
    });
  }

  private handleEvent(event: RealtimeEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) handlers.forEach((handler) => handler(event));
    const allHandlers = this.listeners.get('*' as RealtimeEventType);
    if (allHandlers) allHandlers.forEach((handler) => handler(event));
  }

  on(eventType: RealtimeEventType, handler: (event: RealtimeEvent) => void): void {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType)!.add(handler);
  }

  off(eventType: RealtimeEventType, handler: (event: RealtimeEvent) => void): void {
    this.listeners.get(eventType)?.delete(handler);
  }

  broadcast(event: RealtimeEvent): void {
    if (!this.isConnected || !this.channel) return;
    this.channel.send({ type: 'broadcast', payload: event }).catch((err: Error) => console.error('[SupabaseRealtime] Broadcast error:', err));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({ type: 'TURN_UPDATE', payload: { userId: this.userId, timestamp: Date.now() }, timestamp: Date.now(), senderId: this.userId });
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`[SupabaseRealtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('[SupabaseRealtime] Max reconnect attempts reached');
    }
  }

  broadcastTileSelect(tileId: string, highlighted: boolean): void {
    this.broadcast({ type: 'TILE_SELECT', payload: { tileId, highlighted, userId: this.userId }, timestamp: Date.now(), senderId: this.userId });
  }

  broadcastTileMatch(tileId: string, matchedBy: PlayerRole): void {
    this.broadcast({ type: 'TILE_MATCH', payload: { tileId, matchedBy, userId: this.userId }, timestamp: Date.now(), senderId: this.userId });
  }

  broadcastBoardShuffle(newBoard: string[]): void {
    this.broadcast({ type: 'BOARD_SHUFFLE', payload: { newBoard, userId: this.userId }, timestamp: Date.now(), senderId: this.userId });
  }

  claimTile(tileId: string, role: PlayerRole): void {
    this.broadcast({ type: 'TILE_SELECT', payload: { tileId, claimedBy: role, userId: this.userId }, timestamp: Date.now(), senderId: this.userId });
  }

  getConnectionStatus(): boolean { return this.isConnected; }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.channel) { this.supabase.removeChannel(this.channel); this.channel = null; }
    this.isConnected = false;
    this.listeners.clear();
    console.log(`[SupabaseRealtime] Disconnected from room ${this.roomId}`);
  }
}

let managerInstance: SupabaseRealtimeManager | null = null;

export function getRealtimeManager(roomId?: string, userId?: string): SupabaseRealtimeManager {
  if (!managerInstance || roomId) {
    managerInstance = new SupabaseRealtimeManager(supabase, roomId!, userId || `user_${Date.now()}`);
  }
  return managerInstance;
}

export function resetRealtimeManager(): void {
  if (managerInstance) { managerInstance.disconnect(); managerInstance = null; }
}
