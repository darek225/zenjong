"use client";

import { useEffect, useRef, useState } from "react";
import { useInventory } from "../../hooks/useInventory";
import type { OwnedItem } from "../../lib/inventory";
export type { OwnedItem, ShopItem } from "../../lib/inventory";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onEquip?: (item: OwnedItem) => void;
  onUnequip?: (item: OwnedItem) => void;
  purchaseRefreshKey?: number;
}

export default function InventoryModal({ isOpen, onClose, userId, onEquip, onUnequip, purchaseRefreshKey = 0 }: InventoryModalProps) {
  const inventory = useInventory(isOpen, userId, purchaseRefreshKey);
  const [category, setCategory] = useState("tileset");
  const [view, setView] = useState("inventory");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, [isOpen]);
  if (!isOpen) return null;
  const button = "rounded-lg border border-amber-200/30 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200 disabled:opacity-40";
  const items = (view === "inventory" ? inventory.owned : inventory.items).filter(item => item.item_type === category);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="inventory-title" tabIndex={-1}
      className="flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-2xl border border-amber-200/30 bg-slate-950 p-5 text-white shadow-2xl"
      onKeyDown={event => {
        if (event.key === "Escape") onClose();
        if (event.key !== "Tab") return;
        const focusable = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <header className="flex items-center justify-between gap-4">
        <h2 id="inventory-title" className="text-xl font-semibold text-amber-100">Shop &amp; Inventory</h2>
        <button className={button} onClick={onClose} aria-label="Close inventory">✕</button>
      </header>
      <nav aria-label="Collection view" className="my-4 flex gap-2">
        <button className={button} aria-pressed={view === "inventory"} onClick={() => setView("inventory")}>Inventory</button>
        <button className={button} aria-pressed={view === "shop"} onClick={() => setView("shop")}>Shop</button>
      </nav>
      <p role="status" className="mb-4 text-sm text-amber-100/80">
        {inventory.loading ? "Loading collection…" : inventory.fallback
          ? "Offline starter collection · equipment is saved on this device. Purchases are unavailable."
          : "Server collection · direct cosmetics only."}
      </p>
      <nav aria-label="Cosmetic categories" className="mb-4 flex flex-wrap gap-2">
        {[["tileset", "Tilesets"], ["table_skin", "Table mats"], ["avatar", "Avatars"]].map(([id, label]) =>
          <button key={id} className={button} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}
      </nav>
      {inventory.notice && <p role="status" className="mb-3 text-sm text-amber-200">{inventory.notice}</p>}
      <div className="grid gap-3 overflow-y-auto sm:grid-cols-2">
        {items.map(item => {
          const owned = inventory.owned.find(entry => entry.id === item.id);
          return <article key={item.id} className={`rounded-xl border p-4 ${owned?.isEquipped ? "border-amber-200/60 bg-amber-200/5" : "border-white/15 bg-white/5"}`}>
            <div aria-hidden="true" className="mb-3 flex h-16 items-center justify-center rounded-lg bg-emerald-950 text-3xl">{category === "avatar" ? "◉" : category === "table_skin" ? "🏛" : "🀄"}</div>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="my-2 text-xs text-white/60">{owned?.isEquipped ? "Equipped" : owned ? "Owned" : `${item.price} ${item.currency_type}`}</p>
            {owned ? <button className={`${button} w-full`} disabled={inventory.busy || inventory.loading} onClick={async () => {
              const equipped = !owned.isEquipped;
              if (await inventory.equip(owned, equipped)) {
                if (equipped) onEquip?.({ ...owned, isEquipped: true });
                else onUnequip?.({ ...owned, isEquipped: false });
              }
            }}>{owned.isEquipped ? "Unequip" : "Equip"}</button>
              : <p className="text-xs text-amber-100/70">Purchases require an authenticated shop service.</p>}
          </article>;
        })}
        {!items.length && <p className="py-8 text-white/60">No items in this category.</p>}
      </div>
    </div>
  </div>;
}