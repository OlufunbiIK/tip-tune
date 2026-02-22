
import { UserProfile,  ChartDataPoint, Track, Tip } from '../types';

const MOCK_DELAY = 1200;

// Mock Data
const mockUserProfile: UserProfile = {
  name: 'DJ Melodica',
  bio: 'Bringing beats from the future to your ears. Music is life. Tips appreciated!',
  avatar: 'https://i.pravatar.cc/150?u=djmelodica',
  walletAddress: '0x1234...5678ABCD...EFGH',
};

const mockTracks: Track[] = [
  { id: 'track-1', title: 'Neon Dreams', coverArt: 'https://picsum.photos/seed/track1/100/100', plays: 120543, tips: 1500.50, artist: { id: 'artist-1', artistName: 'DJ Melodica' } },
  { id: 'track-2', title: 'City Lights', coverArt: 'https://picsum.photos/seed/track2/100/100', plays: 98765, tips: 1250.75, artist: { id: 'artist-2', artistName: 'City Beats' } },
  { id: 'track-3', title: 'Sunset Groove', coverArt: 'https://picsum.photos/seed/track3/100/100', plays: 76543, tips: 980.00, artist: { id: 'artist-3', artistName: 'Sunset Collective' } },
  { id: 'track-4', title: 'Midnight Drive', coverArt: 'https://picsum.photos/seed/track4/100/100', plays: 54321, tips: 750.25, artist: { id: 'artist-4', artistName: 'Midnight Riders' } },
];

const mockRecentTips: Tip[] = Array.from({ length: 25 }, (_, i) => ({
  id: `tip_${Date.now()}_${i}`,
  tipperName: `Fan #${Math.floor(Math.random() * 1000)}`,
  tipperAvatar: `https://i.pravatar.cc/150?u=fan${i}`,
  amount: parseFloat((Math.random() * (50 - 1) + 1).toFixed(2)),
  message: i % 3 === 0 ? 'Love your new track!' : (i % 3 === 1 ? 'Keep it up!' : 'This is fire! 🔥'),
  timestamp: new Date(Date.now() - i * 1000 * 60 * 60 * (Math.random() * 5)).toISOString(),
  trackId: mockTracks[i % mockTracks.length].id,
}));

// Mock API Functions
export const fetchUserProfile = (): Promise<UserProfile> => {
  return new Promise(resolve => setTimeout(() => resolve(mockUserProfile), MOCK_DELAY));
};

export const fetchDashboardStats = (): Promise<{ totalTips: number; totalPlays: number; supporterCount: number; }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const totalTips = mockTracks.reduce((sum, track) => sum + track.tips, 0);
      const totalPlays = mockTracks.reduce((sum, track) => sum + track.plays, 0);
      const supporterCount = 1245; // static for now
      resolve({ totalTips, totalPlays, supporterCount });
    }, MOCK_DELAY);
  });
};

export const fetchTipsChartData = (): Promise<ChartDataPoint[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const data: ChartDataPoint[] = [];
            const today = new Date();
            for (let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                data.push({
                    date: date.toISOString().split('T')[0],
                    tips: Math.floor(Math.random() * (200 - 50 + 1)) + 50,
                });
            }
            resolve(data);
        }, MOCK_DELAY);
    });
};

export const fetchTopTracks = (): Promise<Track[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...mockTracks].sort((a, b) => b.tips - a.tips));
    }, MOCK_DELAY);
  });
};

export const fetchRecentTips = (): Promise<Tip[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockRecentTips.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, MOCK_DELAY);
  });
};

export const updateUserProfile = (profile: UserProfile): Promise<UserProfile> => {
    return new Promise(resolve => {
        setTimeout(() => {
            // Profile updated successfully (sensitive data not logged for privacy)
            resolve(profile);
        }, 1000);
    });
}
