"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MOCK_DEFAULT_INVENTORY, OwnedItem, ShopItem, parseItems, parseOwned } from "../lib/inventory";
import { safeJson } from "../lib/safeJson";

export function useInventory(isOpen: boolean, userId: string, refreshKey = 0) {
  const [items, setItems] = useState<ShopItem[]>(MOCK_DEFAULT_INVENTORY);
  const [owned, setOwned] = useState<OwnedItem[]>(MOCK_DEFAULT_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(true);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    generation.current++;
    setLoading(true);
    setNotice("");
    const load = async () => {
      const [catalogData, inventoryData] = await Promise.all([
        safeJson("/api/shop/items", { signal: controller.signal }),
        safeJson(`/api/shop/inventory?userId=${encodeURIComponent(userId)}`, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      const catalog = parseItems(catalogData);
      const inventory = parseOwned(inventoryData);
      const local = !catalog || !inventory;
      setFallback(local);
      setItems(local ? MOCK_DEFAULT_INVENTORY : catalog);
      let localItems = MOCK_DEFAULT_INVENTORY;
      try {
        const saved = parseOwned(JSON.parse(localStorage.getItem("zenjong-starter-inventory") ?? "null"));
        // Local storage can only customize equipment among free starter items.
        if (saved) localItems = MOCK_DEFAULT_INVENTORY.map(item => ({ ...item,
          isEquipped: saved.find(entry => entry.id === item.id)?.isEquipped ?? item.isEquipped }));
      } catch { /* Private browsing and corrupt saves must not prevent opening. */ }
      setOwned(local ? localItems : inventory);
      setLoading(false);
    };
    void load();
    return () => { controller.abort(); generation.current++; };
  }, [isOpen, userId, refreshKey]);

  const equip = useCallback(async (item: OwnedItem, equipped: boolean) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true);
    const requestGeneration = generation.current;
    try {
      if (!fallback) {
        const result = await safeJson("/api/shop/equip", { method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, itemId: item.id, equipped }) });
        if (generation.current !== requestGeneration) return false;
        if (!result || typeof result !== "object" || !("success" in result) || result.success !== true) {
          setNotice("Equipment service unavailable. Your server inventory was not changed.");
          return false;
        }
      }
      const next = owned.map(entry => ({ ...entry, isEquipped: entry.id === item.id ? equipped
        : equipped && entry.item_type === item.item_type ? false : entry.isEquipped }));
      setOwned(next);
      if (fallback) {
        try { localStorage.setItem("zenjong-starter-inventory", JSON.stringify(next)); } catch { /* Session-only equipment remains usable. */ }
      }
      return true;
    } finally { pending.current = false; setBusy(false); }
  }, [fallback, owned, userId]);
  return { items, owned, loading, fallback, notice, busy, equip };
}