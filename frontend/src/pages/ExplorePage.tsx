import React, { useState, useEffect } from 'react';
import HeroSection from '../components/explore/HeroSection';
import TrendingCarousel from '../components/explore/TrendingCarousel';
import GenreCards from '../components/explore/GenreCards';
import TrackGrid from '../components/explore/TrackGrid';
import { exploreService, FeaturedArtist } from '../services/exploreService';
import { Track, Artist } from '../types';
import type { GenreItem } from '../components/explore/GenreCards';

const ExplorePage: React.FC = () => {
    // Data states
    const [featuredArtist, setFeaturedArtist] = useState<FeaturedArtist | null>(null);
    const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
    const [newReleases, setNewReleases] = useState<Track[]>([]);
    const [topArtists, setTopArtists] = useState<Artist[]>([]);
    const [recentlyTipped, setRecentlyTipped] = useState<Track[]>([]);
    const [genres, setGenres] = useState<GenreItem[]>([]);
    const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

    // UI states
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'popularity' | 'recency'>('popularity');

    // Loading states
    const [heroLoading, setHeroLoading] = useState(true);
    const [trendingLoading, setTrendingLoading] = useState(true);
    const [newReleasesLoading, setNewReleasesLoading] = useState(true);
    const [artistsLoading, setArtistsLoading] = useState(true);
    const [tippedLoading, setTippedLoading] = useState(true);
    const [genresLoading, setGenresLoading] = useState(true);
    const [gridLoading, setGridLoading] = useState(false);

    // Fetch all data on mount
    useEffect(() => {
        exploreService.fetchFeaturedArtist().then((data) => {
            setFeaturedArtist(data);
            setHeroLoading(false);
        });

        exploreService.fetchTrendingTracks().then((data) => {
            setTrendingTracks(data);
            setTrendingLoading(false);
        });

        exploreService.fetchNewReleases().then((data) => {
            setNewReleases(data);
            setNewReleasesLoading(false);
        });

        exploreService.fetchTopArtists().then((data) => {
            setTopArtists(data);
            setArtistsLoading(false);
        });

        exploreService.fetchRecentlyTipped().then((data) => {
            setRecentlyTipped(data);
            setTippedLoading(false);
        });

        exploreService.fetchGenres().then((data) => {
            setGenres(data);
            setGenresLoading(false);
        });
    }, []);

    // Fetch filtered tracks when genre or sort changes
    useEffect(() => {
        if (!selectedGenre) {
            setFilteredTracks([]);
            return;
        }

        setGridLoading(true);
        exploreService.fetchTracksByGenre(selectedGenre, sortBy).then((data) => {
            setFilteredTracks(data);
            setGridLoading(false);
        });
    }, [selectedGenre, sortBy]);

    return (
        <div className="min-h-screen pb-32">
            {/* Page header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Explore
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
                    Discover new music, trending tracks, and amazing artists
                </p>
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-10 sm:gap-14">
                {/* 1. Hero — Featured Artist */}
                <HeroSection artist={featuredArtist} loading={heroLoading} />

                {/* 2. Trending Tracks */}
                <TrendingCarousel
                    title="Trending Tracks"
                    items={trendingTracks}
                    loading={trendingLoading}
                    type="tracks"
                />

                {/* 3. New Releases */}
                <TrendingCarousel
                    title="New Releases"
                    items={newReleases}
                    loading={newReleasesLoading}
                    type="tracks"
                />

                {/* 4. Browse by Genre */}
                <GenreCards
                    genres={genres}
                    loading={genresLoading}
                    selectedGenre={selectedGenre}
                    onGenreSelect={setSelectedGenre}
                />

                {/* 5. Genre filtered results (visible when a genre is selected) */}
                {selectedGenre && (
                    <TrackGrid
                        tracks={filteredTracks}
                        loading={gridLoading}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        title={`${selectedGenre} Tracks`}
                    />
                )}

                {/* 6. Top Artists This Week */}
                <TrendingCarousel
                    title="Top Artists This Week"
                    items={topArtists}
                    loading={artistsLoading}
                    type="artists"
                />

                {/* 7. Recently Tipped Tracks */}
                <TrendingCarousel
                    title="Recently Tipped"
                    items={recentlyTipped}
                    loading={tippedLoading}
                    type="tracks"
                />
            </div>
        </div>
    );
};

export default ExplorePage;
