import { FormEvent, useEffect, useState } from 'react';
import { Playlist } from '../../types';

type PlaylistEditorProps = {
  playlist: Playlist | null;
  onSave: (playlistId: string, payload: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    coverImage?: string;
  }) => Promise<void>;
  onDelete: (playlistId: string) => Promise<void>;
  onDuplicate: (playlistId: string) => Promise<void>;
  onShare: (playlistId: string) => Promise<void>;
};

export default function PlaylistEditor({
  playlist,
  onSave,
  onDelete,
  onDuplicate,
  onShare,
}: PlaylistEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(playlist?.name || '');
    setDescription(playlist?.description || '');
    setIsPublic(Boolean(playlist?.isPublic));
  }, [playlist]);

  if (!playlist) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/60">Select a playlist to edit.</p>
      </div>
    );
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(playlist.id, {
        name: name.trim(),
        description: description.trim(),
        isPublic,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Edit Playlist</h3>
      <form onSubmit={handleSave} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
        />
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
        />
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public playlist
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="rounded bg-primary-blue px-3 py-2 text-sm text-white">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(playlist.id)}
            className="rounded border border-white/20 px-3 py-2 text-sm text-white"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onShare(playlist.id)}
            className="rounded border border-mint/30 px-3 py-2 text-sm text-mint"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => onDelete(playlist.id)}
            className="rounded border border-red-400/30 px-3 py-2 text-sm text-red-300"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
