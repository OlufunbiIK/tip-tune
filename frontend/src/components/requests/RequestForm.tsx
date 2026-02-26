import React, { useMemo, useState } from 'react';
import type { Track } from '../../types';

export interface RequestFormValues {
  trackId: string;
  tipAmount: number;
  assetCode: 'XLM' | 'USDC';
  message?: string;
}

export interface RequestFormProps {
  tracks: Track[];
  onSubmit: (values: RequestFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

const RequestForm: React.FC<RequestFormProps> = ({
  tracks,
  onSubmit,
  isSubmitting = false,
}) => {
  const [search, setSearch] = useState('');
  const [trackId, setTrackId] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(5);
  const [assetCode, setAssetCode] = useState<'XLM' | 'USDC'>('XLM');
  const [message, setMessage] = useState('');

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((track) =>
      track.title.toLowerCase().includes(q)
    );
  }, [tracks, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId || tipAmount <= 0 || Number.isNaN(tipAmount)) return;
    await onSubmit({ trackId, tipAmount, assetCode, message: message.trim() || undefined });
  };

  const selectedTrack = tracks.find((t) => t.id === trackId) ?? filteredTracks[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="song-request-form">
      {/* Track search */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-100">
          Choose a track
        </label>
        <input
          type="search"
          placeholder="Search artist's tracks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
        />
        <select
          value={selectedTrack?.id ?? ''}
          onChange={(e) => setTrackId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          aria-label="Select track"
        >
          {filteredTracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tip amount */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-100">
          Tip amount
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={0.1}
            value={Number.isNaN(tipAmount) ? '' : tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value))}
            className="w-28 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          />
          <select
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value as 'XLM' | 'USDC')}
            className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
          >
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Requests with higher tips are placed at the top of the queue.
        </p>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-100">
          Message to artist (optional)
        </label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue resize-none"
          placeholder="e.g. Please play this for my friend’s birthday!"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !selectedTrack || tipAmount <= 0}
        className="w-full rounded-lg bg-gradient-to-r from-accent-gold to-yellow-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-yellow-500/25 hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending request...' : 'Send request'}
      </button>
    </form>
  );
};

export default RequestForm;

