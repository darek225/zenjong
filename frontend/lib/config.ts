/**
 * Centralized environment configuration utility
 * Provides type-safe access to environment variables with production fallbacks
 */

const NEXT_PUBLIC_WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const NEXT_PUBLIC_PRODUCTION_WEBSOCKET_URL = process.env.NEXT_PUBLIC_PRODUCTION_WEBSOCKET_URL;
const WEBSOCKET_URL = process.env.WEBSOCKET_URL;

function getEnv(name: string): string | undefined {
  return process.env[name];
}

export interface AppConfig {
  websocketUrl: string;
  productionWebSocketUrl: string;
  productionFallbackUrl: string;
  serverPort: number;
  isDevelopment: boolean;
  isProduction: boolean;
  getWebSocketUrl?: (fallbackOnError?: boolean) => string | null;
  showConnectionToast?: (message: string) => void;
  recordConnectionError?: (message: string, url: string) => void;
  getLastError?: () => { message: string; timestamp: number; url: string } | null;
  clearLastError?: () => void;
  validateConfig?: () => string[];
}

export const Config: AppConfig = {
  websocketUrl: NEXT_PUBLIC_WEBSOCKET_URL || WEBSOCKET_URL || "ws://localhost:2567",
  productionWebSocketUrl: NEXT_PUBLIC_PRODUCTION_WEBSOCKET_URL || "ws://localhost:2567",
  productionFallbackUrl: "ws://localhost:2567",
  serverPort: Number(getEnv("SERVER_PORT") || 3000),
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
};

type ConnectionError = {
  message: string;
  timestamp: number;
  url: string;
} | null;

let lastConnectionError: ConnectionError = null;

export function recordConnectionError(message: string, url: string): void {
  lastConnectionError = { message, timestamp: Date.now(), url };
  console.warn(`[Config] Connection error recorded: ${message} at ${url}`);
}

export function getLastError(): ConnectionError {
  return lastConnectionError;
}

export function clearLastError(): void {
  lastConnectionError = null;
}

export function showConnectionToast(message: string): void {
  console.warn(`[Config][Toast] ${message}`);
}

export function getWebSocketUrl(fallbackOnError = true): string | null {
  if (Config.websocketUrl && Config.websocketUrl !== "ws://localhost:2567") {
    return Config.websocketUrl;
  }
  if (Config.isDevelopment) {
    return Config.websocketUrl;
  }
  if (Config.productionWebSocketUrl !== "ws://localhost:2567") {
    return Config.productionWebSocketUrl;
  }
  if (fallbackOnError) {
    showConnectionToast("Using local WebSocket endpoint. Check your production WebSocket configuration.");
  }
  return Config.productionFallbackUrl;
}

export function validateConfig(): string[] {
  const errors: string[] = [];
  if (Config.isProduction && Config.websocketUrl === "ws://localhost:2567") {
    errors.push("Production detected - WebSocket URL points to localhost:2567. Set NEXT_PUBLIC_WEBSOCKET_URL to your production WebSocket server.");
  }
  return errors;
}

export default Config;

(Config as any).getWebSocketUrl = getWebSocketUrl;
(Config as any).showConnectionToast = showConnectionToast;
(Config as any).recordConnectionError = recordConnectionError;
(Config as any).getLastError = getLastError;
(Config as any).clearLastError = clearLastError;
(Config as any).validateConfig = validateConfig;