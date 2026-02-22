import { Track, Artist, ArtistSummary } from '../types';

const MOCK_DELAY = 800;

// --- Mock Data ---

const mockArtists: Artist[] = [
  {
    id: 'artist-1',
    userId: 'user-1',
    walletAddress: 'GBXYZ...1234',
    artistName: 'Luna Waves',
    genre: 'Electronic',
    bio: 'Crafting ethereal soundscapes that transport you to another dimension. Grammy-nominated artist blending synths with soul.',
    profileImage: 'https://picsum.photos/seed/luna/400/400',
    coverImage: 'https://picsum.photos/seed/luna-cover/1200/400',
    totalTipsReceived: '12450.50',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-12-20T00:00:00Z',
  },
  {
    id: 'artist-2',
    userId: 'user-2',
    walletAddress: 'GBXYZ...5678',
    artistName: 'Aqua Beats',
    genre: 'Lo-fi',
    bio: 'Chill beats for late-night coding sessions and rainy afternoons.',
    profileImage: 'https://picsum.photos/seed/aqua/400/400',
    coverImage: 'https://picsum.photos/seed/aqua-cover/1200/400',
    totalTipsReceived: '8920.25',
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-12-18T00:00:00Z',
  },
  {
    id: 'artist-3',
    userId: 'user-3',
    walletAddress: 'GBXYZ...9012',
    artistName: 'Echo Valley',
    genre: 'Ambient',
    bio: 'Nature-inspired ambient compositions that heal and inspire.',
    profileImage: 'https://picsum.photos/seed/echo/400/400',
    coverImage: 'https://picsum.photos/seed/echo-cover/1200/400',
    totalTipsReceived: '6780.00',
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
  {
    id: 'artist-4',
    userId: 'user-4',
    walletAddress: 'GBXYZ...3456',
    artistName: 'Urban Symphony',
    genre: 'Hip-Hop',
    bio: 'Street poetry meets orchestral arrangements. Redefining urban music.',
    profileImage: 'https://picsum.photos/seed/urban/400/400',
    coverImage: 'https://picsum.photos/seed/urban-cover/1200/400',
    totalTipsReceived: '15300.75',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-12-22T00:00:00Z',
  },
  {
    id: 'artist-5',
    userId: 'user-5',
    walletAddress: 'GBXYZ...7890',
    artistName: 'Nature Collective',
    genre: 'World',
    bio: 'A global collective blending traditional instruments with modern production.',
    profileImage: 'https://picsum.photos/seed/nature/400/400',
    coverImage: 'https://picsum.photos/seed/nature-cover/1200/400',
    totalTipsReceived: '9100.00',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-12-19T00:00:00Z',
  },
  {
    id: 'artist-6',
    userId: 'user-6',
    walletAddress: 'GBXYZ...1122',
    artistName: 'Neon Pulse',
    genre: 'Synthwave',
    bio: 'Retro-futuristic beats from the neon underground.',
    profileImage: 'https://picsum.photos/seed/neon/400/400',
    coverImage: 'https://picsum.photos/seed/neon-cover/1200/400',
    totalTipsReceived: '11200.30',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-12-21T00:00:00Z',
  },
];

const artistSummary = (a: Artist): ArtistSummary => ({
  id: a.id,
  artistName: a.artistName,
});

const mockTracks: Track[] = [
  { id: 'exp-1', title: 'Neon Dreams', artist: artistSummary(mockArtists[0]), coverArt: 'https://picsum.photos/seed/neon-dreams/400/400', plays: 120543, tips: 1500, genre: 'Electronic', createdAt: '2024-12-20T10:00:00Z' },
  { id: 'exp-2', title: 'Midnight Rain', artist: artistSummary(mockArtists[1]), coverArt: 'https://picsum.photos/seed/midnight-rain/400/400', plays: 98200, tips: 1250, genre: 'Lo-fi', createdAt: '2024-12-19T14:00:00Z' },
  { id: 'exp-3', title: 'Crystal Caverns', artist: artistSummary(mockArtists[2]), coverArt: 'https://picsum.photos/seed/crystal/400/400', plays: 87650, tips: 980, genre: 'Ambient', createdAt: '2024-12-22T08:00:00Z' },
  { id: 'exp-4', title: 'City Block', artist: artistSummary(mockArtists[3]), coverArt: 'https://picsum.photos/seed/city-block/400/400', plays: 156300, tips: 2100, genre: 'Hip-Hop', createdAt: '2024-12-21T16:00:00Z' },
  { id: 'exp-5', title: 'Bamboo Forest', artist: artistSummary(mockArtists[4]), coverArt: 'https://picsum.photos/seed/bamboo/400/400', plays: 65400, tips: 890, genre: 'World', createdAt: '2024-12-18T12:00:00Z' },
  { id: 'exp-6', title: 'Retrograde', artist: artistSummary(mockArtists[5]), coverArt: 'https://picsum.photos/seed/retrograde/400/400', plays: 142800, tips: 1800, genre: 'Synthwave', createdAt: '2024-12-23T09:00:00Z' },
  { id: 'exp-7', title: 'Stellar Drift', artist: artistSummary(mockArtists[0]), coverArt: 'https://picsum.photos/seed/stellar/400/400', plays: 78900, tips: 1050, genre: 'Electronic', createdAt: '2024-12-17T20:00:00Z' },
  { id: 'exp-8', title: 'Rainy Café', artist: artistSummary(mockArtists[1]), coverArt: 'https://picsum.photos/seed/rainy-cafe/400/400', plays: 92100, tips: 1150, genre: 'Lo-fi', createdAt: '2024-12-24T07:00:00Z' },
  { id: 'exp-9', title: 'Ancient Echoes', artist: artistSummary(mockArtists[2]), coverArt: 'https://picsum.photos/seed/ancient/400/400', plays: 54300, tips: 720, genre: 'Ambient', createdAt: '2024-12-16T15:00:00Z' },
  { id: 'exp-10', title: 'Hood Anthem', artist: artistSummary(mockArtists[3]), coverArt: 'https://picsum.photos/seed/hood/400/400', plays: 201500, tips: 2850, genre: 'Hip-Hop', createdAt: '2024-12-25T11:00:00Z' },
  { id: 'exp-11', title: 'Sahara Wind', artist: artistSummary(mockArtists[4]), coverArt: 'https://picsum.photos/seed/sahara/400/400', plays: 47200, tips: 630, genre: 'World', createdAt: '2024-12-15T18:00:00Z' },
  { id: 'exp-12', title: 'Laser Highway', artist: artistSummary(mockArtists[5]), coverArt: 'https://picsum.photos/seed/laser/400/400', plays: 133400, tips: 1700, genre: 'Synthwave', createdAt: '2024-12-26T13:00:00Z' },
];

const GENRES = ['Electronic', 'Lo-fi', 'Ambient', 'Hip-Hop', 'World', 'Synthwave', 'Jazz', 'R&B', 'Pop', 'Rock', 'Classical', 'Reggae'];

const GENRE_COLORS: Record<string, string> = {
  Electronic: 'from-violet-500 to-purple-700',
  'Lo-fi': 'from-teal-400 to-cyan-700',
  Ambient: 'from-emerald-400 to-green-700',
  'Hip-Hop': 'from-orange-400 to-red-600',
  World: 'from-amber-400 to-yellow-700',
  Synthwave: 'from-pink-500 to-fuchsia-700',
  Jazz: 'from-indigo-400 to-blue-700',
  'R&B': 'from-rose-400 to-pink-700',
  Pop: 'from-sky-400 to-blue-600',
  Rock: 'from-slate-500 to-gray-800',
  Classical: 'from-amber-300 to-orange-600',
  Reggae: 'from-green-400 to-lime-700',
};

// --- Service Functions ---

export interface FeaturedArtist extends Artist {
  featuredTrack: Track;
  weeklyListeners: number;
}

export const exploreService = {
  fetchFeaturedArtist: (): Promise<FeaturedArtist> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        const artist = mockArtists[3]; // Urban Symphony — highest tips
        resolve({
          ...artist,
          featuredTrack: mockTracks.find((t) => t.artist.id === artist.id)!,
          weeklyListeners: 45200,
        });
      }, MOCK_DELAY),
    );
  },

  fetchTrendingTracks: (): Promise<Track[]> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        // Trending = weighted by plays + tips
        resolve(
          [...mockTracks].sort((a, b) => b.plays + b.tips * 10 - (a.plays + a.tips * 10)),
        );
      }, MOCK_DELAY),
    );
  },

  fetchNewReleases: (): Promise<Track[]> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve(
          [...mockTracks].sort(
            (a, b) =>
              new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
          ),
        );
      }, MOCK_DELAY),
    );
  },

  fetchTopArtists: (): Promise<Artist[]> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve(
          [...mockArtists].sort(
            (a, b) =>
              parseFloat(b.totalTipsReceived || '0') -
              parseFloat(a.totalTipsReceived || '0'),
          ),
        );
      }, MOCK_DELAY),
    );
  },

  fetchRecentlyTipped: (): Promise<Track[]> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve([...mockTracks].sort((a, b) => b.tips - a.tips).slice(0, 8));
      }, MOCK_DELAY),
    );
  },

  fetchGenres: (): Promise<{ name: string; gradient: string }[]> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve(
          GENRES.map((name) => ({
            name,
            gradient: GENRE_COLORS[name] || 'from-gray-400 to-gray-700',
          })),
        );
      }, MOCK_DELAY / 2),
    );
  },

  fetchTracksByGenre: (
    genre: string,
    sortBy: 'popularity' | 'recency' = 'popularity',
  ): Promise<Track[]> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        let filtered = mockTracks.filter(
          (t) => t.genre?.toLowerCase() === genre.toLowerCase(),
        );
        if (sortBy === 'popularity') {
          filtered.sort((a, b) => b.plays - a.plays);
        } else {
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
          );
        }
        resolve(filtered);
      }, MOCK_DELAY),
    );
  },
};
