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
export const MOCK_DEFAULT_INVENTORY: OwnedItem[] = [
  { id: "default-jade", name: "Natural Jade", item_type: "tileset", isEquipped: true },
  { id: "default-obsidian", name: "Obsidian Gold", item_type: "tileset", isEquipped: false },
  { id: "classic_green", name: "Jade Lantern Pavilion", item_type: "table_skin", isEquipped: true },
  { id: "cyberpunk", name: "Neon Skyline Lounge", item_type: "table_skin", isEquipped: false },
  { id: "nature_stump", name: "Rain Forest Pavilion", item_type: "table_skin", isEquipped: false },
  { id: "mystic_sanctuary", name: "Deep Space Station", item_type: "table_skin", isEquipped: false },
  { id: "temple_courtyard", name: "Cloud Temple", item_type: "table_skin", isEquipped: false },
  { id: "spotlight_parlor", name: "Golden Parlor", item_type: "table_skin", isEquipped: false },
  { id: "default-avatar", name: "Jade Scholar", item_type: "avatar", isEquipped: true },
].map(item => ({ ...item, price: 0, currency_type: "jade", asset_url: "", acquired_at: "2026-01-01T00:00:00.000Z" }));

export function parseItems(data: unknown): ShopItem[] | null {
  const items = Array.isArray(data) ? data
    : data && typeof data === "object" && "items" in data ? data.items : null;
  if (!Array.isArray(items)) return null;
  if (!items.every(item => item && typeof item.id === "string" && typeof item.name === "string"
    && typeof item.item_type === "string" && typeof item.price === "number" && Number.isFinite(item.price)
    && item.price >= 0 && typeof item.currency_type === "string" && typeof item.asset_url === "string")) return null;
  return items;
}
export function parseOwned(data: unknown): OwnedItem[] | null {
  const items = parseItems(data);
  if (!items || !items.every(item => "isEquipped" in item && typeof item.isEquipped === "boolean"
    && "acquired_at" in item && typeof item.acquired_at === "string")) return null;
  return items as OwnedItem[];
}