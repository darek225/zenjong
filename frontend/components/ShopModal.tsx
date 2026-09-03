"use client";
import { useState, useEffect } from "react";

interface ShopItem {
  id: string;
  name: string;
  item_type: string;
  price: number;
  currency_type: string;
  asset_url: string;
}

interface User {
  id: string;
  username: string;
  jade_balance: number;
  pearl_balance: number;
}

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPurchase?: (item: ShopItem) => void;
}

export default function ShopModal({ isOpen, onClose, userId, onPurchase }: ShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      fetch("/api/shop/items").then(r => r.json()),
      fetch(`/api/users/${userId}`).then(r => r.json()).catch(() => null)
    ]).then(([itemsData, userData]) => {
      if (itemsData.error) setError(itemsData.error);
      else setItems(itemsData.items || []);
      if (userData && !userData.error) setUser(userData);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [isOpen, userId]);

  const handlePurchase = async (item: ShopItem) => {
    setPurchasing(item.id);
    setError(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, itemId: item.id, currencyType: item.currency_type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      setUser(data.user);
      if (onPurchase) onPurchase(item);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Shop</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        {user && (
          <div className="p-4 bg-gray-800/50 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">{user.username}</span>
              <div className="flex space-x-4">
                <span className="text-green-400">Jade: {user.jade_balance}</span>
                <span className="text-pink-400">Pearl: {user.pearl_balance}</span>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <div className="text-center text-gray-400 py-8">Loading...</div>
           : error ? <div className="text-center text-red-400 py-8">{error}</div>
           : items.length === 0 ? <div className="text-center text-gray-400 py-8">No items.</div>
           : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => {
                const balance = item.currency_type === "jade" ? (user?.jade_balance ?? 0) : (user?.pearl_balance ?? 0);
                const canAfford = balance >= item.price;
                const isPurchasing = purchasing === item.id;
                return (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="text-xs text-gray-400">{item.item_type}</p>
                    <div className={`mt-1 text-sm font-bold ${canAfford ? "text-green-400" : "text-red-400"}`}>
                      {item.price} {item.currency_type === "jade" ? "J" : "P"}
                    </div>
                    <button onClick={() => handlePurchase(item)} disabled={!canAfford || isPurchasing}
                      className={`mt-2 w-full py-2 rounded text-sm font-medium ${canAfford && !isPurchasing ? "bg-green-600 hover:bg-green-500 text-white" : "bg-gray-600 text-gray-300"}`}>
                      {isPurchasing ? "..." : canAfford ? "Buy" : "Not enough"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Close</button>
        </div>
      </div>
    </div>
  );
}