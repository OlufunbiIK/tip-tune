import { useEffect, useMemo, useState } from 'react';
import { playlistService } from '../../services/playlistService';
import { Playlist, Track } from '../../types';
import CreatePlaylistModal from './CreatePlaylistModal';
import PlaylistEditor from './PlaylistEditor';
import DraggableTrackList from './DraggableTrackList';
import AddToPlaylistModal from './AddToPlaylistModal';

type PlaylistManagerProps = {
  initialTrackForQuickAdd?: Track | null;
};

export default function PlaylistManager({ initialTrackForQuickAdd = null }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [quickAddTrack, setQuickAddTrack] = useState<Track | null>(initialTrackForQuickAdd);

  const selectedPlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId],
  );

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const response = await playlistService.getAll();
      setPlaylists(response.data);
      if (!selectedPlaylistId && response.data.length > 0) {
        setSelectedPlaylistId(response.data[0].id);
      }
    } catch (error) {
      setNotice('Failed to load playlists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPlaylist = async (payload: {
    name: string;
    description?: string;
    isPublic: boolean;
    approvalRequired: boolean;
    coverImage?: string;
  }) => {
    await playlistService.create(payload);
    setNotice('Playlist created.');
    await loadPlaylists();
  };

  const savePlaylist = async (playlistId: string, payload: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    coverImage?: string;
  }) => {
    const updated = await playlistService.update(playlistId, payload);
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, ...updated } : p)));
    setNotice('Playlist updated.');
  };

  const deletePlaylist = async (playlistId: string) => {
    const confirmed = window.confirm('Delete this playlist?');
    if (!confirmed) return;
    await playlistService.remove(playlistId);
    const remaining = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(remaining);
    setSelectedPlaylistId(remaining[0]?.id || null);
    setNotice('Playlist deleted.');
  };

  const duplicatePlaylist = async (playlistId: string) => {
    await playlistService.duplicate(playlistId);
    await loadPlaylists();
    setNotice('Playlist duplicated.');
  };

  const sharePlaylist = async (playlistId: string) => {
    await playlistService.share(playlistId);
    setNotice('Playlist is now shareable.');
    await loadPlaylists();
  };

  const reorderTracks = async (nextTracks: Track[]) => {
    if (!selectedPlaylist) return;

    const currentTracks = selectedPlaylist.playlistTracks || [];
    const map = new Map(currentTracks.map((pt) => [pt.trackId, pt]));
    const payload = nextTracks.map((track, index) => ({
      trackId: track.id,
      position: index,
    }));
    await playlistService.reorderTracks(selectedPlaylist.id, payload);

    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === selectedPlaylist.id
          ? {
              ...p,
              playlistTracks: nextTracks
                .map((track, index) => {
                  const existing = map.get(track.id);
                  if (!existing) return null;
                  return { ...existing, position: index, track };
                })
                .filter(Boolean) as Playlist['playlistTracks'],
            }
          : p,
      ),
    );
    setNotice('Track order updated.');
  };

  const removeTrack = async (track: Track) => {
    if (!selectedPlaylist) return;
    await playlistService.removeTrack(selectedPlaylist.id, track.id);
    const nextTracks = (selectedPlaylist.playlistTracks || []).filter((pt) => pt.trackId !== track.id);
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === selectedPlaylist.id
          ? {
              ...p,
              playlistTracks: nextTracks,
              trackCount: Math.max(0, (p.trackCount || 0) - 1),
            }
          : p,
      ),
    );
    setNotice('Track removed.');
  };

  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    await playlistService.addTrack(playlistId, { trackId });
    setNotice('Track added to playlist.');
    await loadPlaylists();
  };

  const selectedTracks: Track[] = useMemo(
    () => (selectedPlaylist?.playlistTracks || []).map((pt) => pt.track).filter(Boolean) as Track[],
    [selectedPlaylist],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Playlist Manager</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded bg-primary-blue px-3 py-2 text-sm text-white"
          >
            New Playlist
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickAddTrack(initialTrackForQuickAdd);
              setIsAddOpen(true);
            }}
            className="rounded border border-white/20 px-3 py-2 text-sm text-white"
          >
            Add Track To Playlist
          </button>
        </div>
      </div>

      {notice && <p className="text-sm text-mint">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-sm font-medium text-white/80">Your Playlists</p>
          {loading && <p className="text-sm text-white/60">Loading...</p>}
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className={`w-full rounded border px-3 py-2 text-left ${
                  selectedPlaylistId === playlist.id
                    ? 'border-mint/50 bg-mint/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className="truncate text-sm text-white">{playlist.name}</p>
                <p className="text-xs text-white/60">{playlist.trackCount || 0} tracks</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <PlaylistEditor
            playlist={selectedPlaylist}
            onSave={savePlaylist}
            onDelete={deletePlaylist}
            onDuplicate={duplicatePlaylist}
            onShare={sharePlaylist}
          />

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Tracks</h3>
              <span className="text-xs text-white/60">{selectedTracks.length} tracks</span>
            </div>
            <DraggableTrackList
              tracks={selectedTracks}
              onReorder={reorderTracks}
              onRemove={removeTrack}
            />
          </div>
        </div>
      </div>

      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={createPlaylist}
      />

      <AddToPlaylistModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        playlists={playlists}
        track={quickAddTrack}
        onAdd={addTrackToPlaylist}
      />
    </section>
  );
}
