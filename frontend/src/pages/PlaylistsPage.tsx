import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components';
import { playlistService } from '../services/playlistService';
import { Playlist } from '../types';

const formatDuration = (duration: number) => {
  if (!duration) {
    return '0:00';
  }
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PlaylistsPage = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const response = await playlistService.getAll();
        setPlaylists(response.data);
      } catch (err) {
        setError('Failed to load playlists.');
      } finally {
        setLoading(false);
      }
    };

    loadPlaylists();
  }, []);

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-white/10 bg-navy-light">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold">
            TipTune
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/playlists/smart/new">
              <Button size="sm">New Smart Playlist</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold">Your Playlists</h1>
          <p className="text-ice-blue">
            Collaborate with friends and explore auto-updating smart playlists.
          </p>
        </div>

        {loading && <p className="text-ice-blue">Loading playlists...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && playlists.length === 0 && (
          <Card>
            <p className="text-ice-blue">No playlists yet.</p>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{playlist.name}</h2>
                  <p className="text-sm text-ice-blue">
                    {playlist.trackCount} tracks · {formatDuration(playlist.totalDuration)}
                  </p>
                </div>
                {playlist.smartPlaylist && (
                  <span className="text-xs px-2 py-1 rounded-full border border-mint/40 text-mint uppercase tracking-wide">
                    Smart
                  </span>
                )}
              </div>

              {playlist.description && (
                <p className="text-sm text-white/70">{playlist.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-white/60">
                <span>{playlist.isPublic ? 'Public' : 'Private'}</span>
                {playlist.approvalRequired && (
                  <span className="text-gold">Approval Required</span>
                )}
              </div>

              <Link to={`/playlists/${playlist.id}`}>
                <Button variant="secondary" size="sm">
                  View Playlist
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PlaylistsPage;
