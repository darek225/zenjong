"use client";

import { useState, useEffect, useCallback } from "react";

export interface ShopItem {
  id: string;
  name: string;
  item_type: string;
  price: number;
  currency_type: string;
  asset_url: string;
}

export interface OwnedItem extends ShopItem {
  acquired_at: string;
  isEquipped: boolean;
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onEquip?: (item: OwnedItem) => void;
  onUnequip?: (item: OwnedItem) => void;
  purchaseRefreshKey?: number;
}

type TabCategory = "tilesets" | "table_skins" | "avatars";

const TAB_LABELS: Record<TabCategory, string> = {
  tilesets: "🃏 Tilesets",
  table_skins: "🪑 Table Skins",
  avatars: "👤 Avatars",
};

const CATEGORY_MAP: Record<TabCategory, string[]> = {
  tilesets: ["tileset"],
  table_skins: ["table_skin", "background"],
  avatars: ["avatar", "profile_frame"],
};

export default function InventoryModal({
  isOpen,
  onClose,
  userId,
  onEquip,
  onUnequip,
  purchaseRefreshKey = 0,
}: InventoryModalProps) {
  const [activeTab, setActiveTab] = useState<TabCategory>("tilesets");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [owned, setOwned] = useState<OwnedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!isOpen || !userId) return;
    setLoading(true);
    setError(null);

    try {
      const [shopRes, inventoryRes] = await Promise.all([
        fetch("/api/shop/items"),
        fetch(`/api/shop/inventory?userId=${userId}`).catch(() => ({ json: () => ({ items: [] }) })),
      ]);

      const shopData = await shopRes.json();
      const inventoryData = await inventoryRes.json();

      const shopItems: ShopItem[] = shopData.items || [];
      const ownedItems: OwnedItem[] = inventoryData.items || [];

      setItems(shopItems);
      setOwned(ownedItems);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen, fetchInventory, purchaseRefreshKey]);

  const filteredItems = items.filter((item) =>
    CATEGORY_MAP[activeTab].includes(item.item_type)
  );

  const getOwnership = (
    itemId: string
  ): { status: "owned" | "equipped" | "unowned"; ownedItem?: OwnedItem } => {
    const ownedItem = owned.find((o) => o.id === itemId);
    if (!ownedItem) return { status: "unowned" };
    return {
      status: ownedItem.isEquipped ? "equipped" : "owned",
      ownedItem,
    };
  };

  const handleEquip = async (item: ShopItem, ownedItem: OwnedItem) => {
    setEquipping(item.id);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, itemId: item.id, equipped: true }),
      }).catch(() => null);

      if (res && res.ok) {
        setOwned((prev) =>
          prev.map((o) =>
            o.id === item.id ? { ...o, isEquipped: true } : o
          )
        );
        if (onEquip) onEquip({ ...ownedItem, isEquipped: true });
      } else {
        setOwned((prev) =>
          prev.map((o) =>
            o.id === item.id ? { ...o, isEquipped: true } : o
          )
        );
        if (onEquip) onEquip({ ...ownedItem, isEquipped: true });
      }
    } finally {
      setEquipping(null);
    }
  };

  const handleUnequip = async (item: ShopItem, ownedItem: OwnedItem) => {
    setEquipping(item.id);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, itemId: item.id, equipped: false }),
      }).catch(() => null);

      if (res && res.ok) {
        setOwned((prev) =>
          prev.map((o) =>
            o.id === item.id ? { ...o, isEquipped: false } : o
          )
        );
        if (onUnequip) onUnequip({ ...ownedItem, isEquipped: false });
      } else {
        setOwned((prev) =>
          prev.map((o) =>
            o.id === item.id ? { ...o, isEquipped: false } : o
          )
        );
        if (onUnequip) onUnequip({ ...ownedItem, isEquipped: false });
      }
    } finally {
      setEquipping(null);
    }
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">📦 Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b border-gray-700 px-4">
          {(Object.keys(TAB_LABELS) as TabCategory[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-yellow-500 text-yellow-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading inventory...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-12">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No {TAB_LABELS[activeTab].replace(/^.+\s/, "")} available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const { status, ownedItem } = getOwnership(item.id);
                const isEquipping = equipping === item.id;

                return (
                  <div
                    key={item.id}
                    className={`relative bg-gray-800 rounded-lg p-4 border transition-all duration-200 ${
                      status === "equipped"
                        ? "border-yellow-500 ring-1 ring-yellow-500/50"
                        : status === "owned"
                        ? "border-green-600/50"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="w-full h-24 bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {item.asset_url ? (
                        <img
                          src={item.asset_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-4xl">麻将</span>
                      )}
                    </div>

                    {status === "equipped" && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                        EQUIPPED
                      </span>
                    )}

                    <h3 className="font-semibold text-white text-sm mb-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-400 mb-2 capitalize">
                      {item.item_type.replace("_", " ")}
                    </p>

                    {status === "unowned" ? (
                      <div className="text-xs text-gray-400 mt-2">
                        Purchase in Shop
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          status === "equipped"
                            ? handleUnequip(item, ownedItem!)
                            : handleEquip(item, ownedItem!)
                        }
                        disabled={isEquipping}
                        className={`mt-2 w-full py-2 rounded text-xs font-bold transition-colors ${
                          status === "equipped"
                            ? "bg-red-600 hover:bg-red-500 text-white"
                            : "bg-green-600 hover:bg-green-500 text-white"
                        } ${isEquipping ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {isEquipping
                          ? "..."
                          : status === "equipped"
                          ? "Unequip"
                          : "Equip"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
