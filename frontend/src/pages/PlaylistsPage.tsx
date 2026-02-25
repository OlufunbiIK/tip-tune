import { Link } from 'react-router-dom';
import PlaylistManager from '../components/playlists/PlaylistManager';

const PlaylistsPage = () => {
  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-white/10 bg-navy-light">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold">
            TipTune
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <PlaylistManager />
      </main>
    </div>
  );
};

export default PlaylistsPage;
