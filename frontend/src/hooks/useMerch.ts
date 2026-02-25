import { useCallback, useEffect, useMemo, useState } from 'react';
import { MerchInput, MerchItem } from '../types/merch';
import { getWishlist, listMerch, removeMerch, toggleWishlist, upsertMerch } from '../services/merchLocal';

export function useMerch(artistId: string) {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    setItems(listMerch(artistId));
    setWishlist(getWishlist());
  }, [artistId]);

  const refresh = useCallback(() => {
    setItems(listMerch(artistId));
  }, [artistId]);

  const add = useCallback((input: MerchInput) => {
    const created = upsertMerch(artistId, input);
    setItems((prev) => [created, ...prev]);
  }, [artistId]);

  const edit = useCallback((id: string, input: MerchInput) => {
    const updated = upsertMerch(artistId, input, id);
    setItems((prev) => prev.map((it) => it.id === id ? updated : it));
  }, [artistId]);

  const remove = useCallback((id: string) => {
    removeMerch(artistId, id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, [artistId]);

  const toggleSave = useCallback((id: string) => {
    const next = toggleWishlist(id);
    setWishlist(next);
  }, []);

  const isSaved = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  return useMemo(() => ({ items, wishlist, add, edit, remove, toggleSave, isSaved, refresh }), [items, wishlist, add, edit, remove, toggleSave, isSaved, refresh]);
}
