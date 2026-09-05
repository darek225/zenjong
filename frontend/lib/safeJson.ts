/** Never attempt to parse a reverse proxy's HTML error page as JSON. */
export async function safeJson(url: string, init: RequestInit = {}): Promise<unknown | null> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 5000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!response.ok || !(type === "application/json" || type.endsWith("+json"))) return null;
    const text = await response.text();
    if (!text.trim() || text.trimStart().startsWith("<")) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}