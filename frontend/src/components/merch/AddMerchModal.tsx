import React, { useEffect, useState } from 'react';
import { MerchInput, MerchItem, MerchStatus } from '../../types/merch';

export interface AddMerchModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: MerchInput) => void;
  initial?: MerchItem | null;
}

const empty: MerchInput = { name: '', imageUrl: '', price: '', externalUrl: '', status: 'available' };

export const AddMerchModal: React.FC<AddMerchModalProps> = ({ open, onClose, onSubmit, initial }) => {
  const [form, setForm] = useState<MerchInput>(empty);

  useEffect(() => {
    if (initial) setForm({ name: initial.name, imageUrl: initial.imageUrl, price: initial.price, externalUrl: initial.externalUrl, status: initial.status });
    else setForm(empty);
  }, [initial, open]);

  if (!open) return null;

  const valid = form.name && form.imageUrl && form.price && form.externalUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{initial ? 'Edit merch' : 'Add merch'}</h3>
          <button onClick={onClose} className="rounded p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="Close">✕</button>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Name</span>
            <input className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Image URL</span>
            <input className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Price (display)</span>
            <input className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="$24.99" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">External purchase URL</span>
            <input className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} placeholder="https://..." />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Status</span>
            <select className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MerchStatus })}>
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="soldout">Sold Out</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">Cancel</button>
          <button disabled={!valid} onClick={() => valid && onSubmit(form)} className={`rounded-md px-3 py-2 text-sm font-medium ${valid ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'}`}>{initial ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>
  );
};

export default AddMerchModal;
