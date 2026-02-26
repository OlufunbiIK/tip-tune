import React, { useMemo, useState } from 'react';
import { useMerch } from '../../hooks/useMerch';
import AddMerchModal from './AddMerchModal';
import { MerchItem, MerchInput } from '../../types/merch';

export interface MerchManagementPanelProps {
  artistId: string;
}

export const MerchManagementPanel: React.FC<MerchManagementPanelProps> = ({ artistId }) => {
  const { items, add, edit, remove } = useMerch(artistId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MerchItem | null>(null);

  const onSubmit = (input: MerchInput) => {
    if (editing) {
      edit(editing.id, input);
    } else {
      add(input);
    }
    setOpen(false);
    setEditing(null);
  };

  const empty = useMemo(() => items.length === 0, [items.length]);

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Manage Merch</h2>
        <button onClick={() => { setOpen(true); setEditing(null); }} className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">Add merch</button>
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No merch added yet. Use “Add merch” to link your store items.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 p-3">
              <img src={it.imageUrl} alt="thumb" className="h-14 w-14 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100" title={it.name}>{it.name}</span>
                  {it.status !== 'available' && (
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${it.status === 'soldout' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>{it.status === 'soldout' ? 'Sold Out' : 'Limited'}</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{it.price}</div>
                <a href={it.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline dark:text-blue-400">{new URL(it.externalUrl).hostname}</a>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(it); setOpen(true); }} className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-700">Edit</button>
                <button onClick={() => remove(it.id)} className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-600 dark:border-red-800">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddMerchModal open={open} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={onSubmit} initial={editing} />
    </section>
  );
};

export default MerchManagementPanel;
