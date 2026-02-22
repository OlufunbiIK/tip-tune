/// <reference types="vitest/globals" />
import { render, waitFor } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ExplorePage from '../ExplorePage';

// Mock the explore service
vi.mock('../../services/exploreService', () => ({
    exploreService: {
        fetchFeaturedArtist: vi.fn().mockResolvedValue({
            id: 'artist-1',
            userId: 'user-1',
            walletAddress: 'GBXYZ',
            artistName: 'Test Artist',
            genre: 'Electronic',
            bio: 'Test bio for the featured artist',
            profileImage: 'https://example.com/profile.jpg',
            coverImage: 'https://example.com/cover.jpg',
            totalTipsReceived: '5000',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-12-01T00:00:00Z',
            featuredTrack: {
                id: 'track-1',
                title: 'Featured Track',
                artist: { id: 'artist-1', artistName: 'Test Artist' },
                coverArt: 'https://example.com/cover.jpg',
                plays: 10000,
                tips: 500,
            },
            weeklyListeners: 25000,
        }),
        fetchTrendingTracks: vi.fn().mockResolvedValue([
            {
                id: 'trend-1',
                title: 'Trending Song',
                artist: { id: 'a1', artistName: 'Artist A' },
                coverArt: 'https://example.com/t1.jpg',
                plays: 50000,
                tips: 1000,
                genre: 'Pop',
                createdAt: '2024-12-01T00:00:00Z',
            },
        ]),
        fetchNewReleases: vi.fn().mockResolvedValue([
            {
                id: 'new-1',
                title: 'New Song',
                artist: { id: 'a2', artistName: 'Artist B' },
                coverArt: 'https://example.com/n1.jpg',
                plays: 5000,
                tips: 200,
                genre: 'Jazz',
                createdAt: '2024-12-25T00:00:00Z',
            },
        ]),
        fetchTopArtists: vi.fn().mockResolvedValue([
            {
                id: 'top-a1',
                userId: 'u1',
                walletAddress: 'W1',
                artistName: 'Top Artist',
                genre: 'Rock',
                profileImage: 'https://example.com/a1.jpg',
                totalTipsReceived: '10000',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-12-01T00:00:00Z',
            },
        ]),
        fetchRecentlyTipped: vi.fn().mockResolvedValue([
            {
                id: 'tip-1',
                title: 'Tipped Song',
                artist: { id: 'a3', artistName: 'Artist C' },
                coverArt: 'https://example.com/tip1.jpg',
                plays: 30000,
                tips: 2000,
                genre: 'Hip-Hop',
                createdAt: '2024-12-20T00:00:00Z',
            },
        ]),
        fetchGenres: vi.fn().mockResolvedValue([
            { name: 'Electronic', gradient: 'from-violet-500 to-purple-700' },
            { name: 'Hip-Hop', gradient: 'from-orange-400 to-red-600' },
            { name: 'Jazz', gradient: 'from-indigo-400 to-blue-700' },
        ]),
        fetchTracksByGenre: vi.fn().mockResolvedValue([
            {
                id: 'genre-1',
                title: 'Electronic Track',
                artist: { id: 'a4', artistName: 'Artist D' },
                coverArt: 'https://example.com/g1.jpg',
                plays: 20000,
                tips: 800,
                genre: 'Electronic',
                createdAt: '2024-12-15T00:00:00Z',
            },
        ]),
    },
}));

describe('ExplorePage', () => {
    const renderPage = () =>
        render(
            <MemoryRouter>
                <ExplorePage />
            </MemoryRouter>,
        );

    it('renders the page heading', async () => {
        renderPage();
        expect(screen.getByRole('heading', { name: /Explore/i })).toBeInTheDocument();
    });

    it('renders section titles after data loads', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Trending Tracks')).toBeInTheDocument();
        });
        expect(screen.getByText('New Releases')).toBeInTheDocument();
        expect(screen.getByText('Browse by Genre')).toBeInTheDocument();
        expect(screen.getByText('Top Artists This Week')).toBeInTheDocument();
        expect(screen.getByText('Recently Tipped')).toBeInTheDocument();
    });

    it('renders hero section with featured artist', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByTestId('hero-section')).toBeInTheDocument();
        });
        expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('renders genre cards', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByTestId('genre-cards')).toBeInTheDocument();
        });
        expect(screen.getByTestId('genre-card-Electronic')).toBeInTheDocument();
        expect(screen.getByTestId('genre-card-Hip-Hop')).toBeInTheDocument();
        expect(screen.getByTestId('genre-card-Jazz')).toBeInTheDocument();
    });

    it('shows filtered tracks when a genre is selected', async () => {
        const user = userEvent.setup();
        renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('genre-card-Electronic')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('genre-card-Electronic'));

        await waitFor(() => {
            expect(screen.getByTestId('track-grid')).toBeInTheDocument();
        });
        expect(screen.getByText('Electronic Tracks')).toBeInTheDocument();
    });

    it('renders scroll buttons in carousels', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getAllByTestId('scroll-left').length).toBeGreaterThan(0);
        });
        expect(screen.getAllByTestId('scroll-right').length).toBeGreaterThan(0);
    });

    it('shows skeleton loading states initially', () => {
        renderPage();
        expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
    });

    it('renders sort dropdown when genre is selected', async () => {
        const user = userEvent.setup();
        renderPage();

        await waitFor(() => {
            expect(screen.getByTestId('genre-card-Jazz')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('genre-card-Jazz'));

        await waitFor(() => {
            expect(screen.getByTestId('sort-select')).toBeInTheDocument();
        });
    });
});
