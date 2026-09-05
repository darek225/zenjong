/** Static public env access is required for Next.js build-time substitution. */
const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim()
  || process.env.NEXT_PUBLIC_COLYSEUS_URL?.trim()
  || process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim()
  || process.env.NEXT_PUBLIC_PRODUCTION_WEBSOCKET_URL?.trim();

export function resolveWebSocketUrl(
  configured: string | undefined,
  development: boolean,
  location?: { hostname: string; protocol: string }
): string | null {
  const isLocal = (host: string) => host === "localhost" || host.endsWith(".localhost")
    || host === "[::1]" || host === "::1" || host === "0.0.0.0" || /^127\./.test(host);
  const localDevelopment = development && (!location || isLocal(location.hostname));
  const candidate = configured?.trim() || (localDevelopment ? "ws://localhost:2567" : null);
  if (!candidate || /[\u0000-\u0020]/.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    if (!["ws:", "wss:"].includes(url.protocol) || url.username || url.password) return null;
    if (!localDevelopment && isLocal(url.hostname)) return null;
    if ((!development || location?.protocol === "https:") && url.protocol !== "wss:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getWebSocketUrl(): string | null {
  return resolveWebSocketUrl(configuredUrl, process.env.NODE_ENV === "development",
    typeof window === "undefined" ? undefined : window.location);
}

type ConnectionError = { message: string; timestamp: number; url: string };
let lastConnectionError: ConnectionError | null = null;

export function recordConnectionError(message: string, url: string): void {
  lastConnectionError = { message, timestamp: Date.now(), url };
}
export function clearLastError(): void { lastConnectionError = null; }
export function getLastError(): ConnectionError | null { return lastConnectionError; }

export const Config = { getWebSocketUrl, recordConnectionError, clearLastError, getLastError };
export default Config;