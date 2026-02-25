import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { Playlist, Track } from '../../types';

type AddToPlaylistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  track: Track | null;
  onAdd: (playlistId: string, trackId: string) => Promise<void>;
};

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  playlists,
  track,
  onAdd,
}: AddToPlaylistModalProps) {
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, query]);

  const handleAdd = async (playlistId: string) => {
    if (!track?.id) return;
    setSavingId(playlistId);
    try {
      await onAdd(playlistId, track.id);
      onClose();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add To Playlist">
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search playlists"
          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
        />
        {track && (
          <p className="text-xs text-white/60">
            Adding: <span className="text-white">{track.title}</span>
          </p>
        )}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {filtered.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => handleAdd(playlist.id)}
              disabled={Boolean(savingId)}
              className="flex w-full items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
            >
              <span className="text-sm text-white">{playlist.name}</span>
              <span className="text-xs text-white/60">{playlist.trackCount} tracks</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-white/60">No playlists found.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
