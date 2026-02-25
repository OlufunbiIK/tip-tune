import { MerchInput, MerchItem } from "../types/merch";

const MERCH_KEY = "tt_merch_items";
const WISHLIST_KEY = "tt_merch_wishlist";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function listMerch(artistId: string): MerchItem[] {
  const all = read<Record<string, MerchItem[]>>(MERCH_KEY, {});
  return (all[artistId] || []).sort((a, b) => b.createdAt - a.createdAt);
}

export function upsertMerch(artistId: string, input: MerchInput, id?: string): MerchItem {
  const all = read<Record<string, MerchItem[]>>(MERCH_KEY, {});
  const now = Date.now();
  const items = all[artistId] || [];

  if (id) {
    const idx = items.findIndex((m) => m.id === id);
    if (idx !== -1) {
      const updated: MerchItem = { ...items[idx], ...input, updatedAt: now };
      items[idx] = updated;
      all[artistId] = items;
      write(MERCH_KEY, all);
      return updated;
    }
  }

  const created: MerchItem = {
    id: UUID,
    artistId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  all[artistId] = [created, ...items];
  write(MERCH_KEY, all);
  return created;
}

export function removeMerch(artistId: string, id: string) {
  const all = read<Record<string, MerchItem[]>>(MERCH_KEY, {});
  const items = all[artistId] || [];
  all[artistId] = items.filter((m) => m.id !== id);
  write(MERCH_KEY, all);
}

export function getWishlist(): string[] {
  return read<string[]>(WISHLIST_KEY, []);
}

export function toggleWishlist(id: string): string[] {
  const current = new Set(read<string[]>(WISHLIST_KEY, []));
  if (current.has(id)) current.delete(id);
  else current.add(id);
  const arr = Array.from(current);
  write(WISHLIST_KEY, arr);
  return arr;
}
