import React from 'react';
import { FeaturedArtist } from '../../services/exploreService';

interface HeroSectionProps {
    artist: FeaturedArtist | null;
    loading: boolean;
}

const HeroSkeleton: React.FC = () => (
    <div className="relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse h-64 sm:h-80 md:h-96" data-testid="hero-skeleton">
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
            <div className="h-8 w-64 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
            <div className="h-4 w-96 max-w-full bg-gray-300 dark:bg-gray-700 rounded mb-4" />
            <div className="flex gap-6">
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
        </div>
    </div>
);

const HeroSection: React.FC<HeroSectionProps> = ({ artist, loading }) => {
    if (loading || !artist) return <HeroSkeleton />;

    const formatNumber = (n: number) =>
        n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

    return (
        <section className="relative rounded-2xl overflow-hidden group" data-testid="hero-section">
            {/* Background image */}
            <div className="absolute inset-0">
                <img
                    src={artist.coverImage || artist.profileImage}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-blue/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative flex flex-col justify-end h-64 sm:h-80 md:h-96 p-6 sm:p-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/90 text-navy text-xs font-bold uppercase tracking-wide w-fit mb-3">
                    ⭐ Featured Artist
                </span>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                    {artist.artistName}
                </h2>

                <p className="text-white/70 text-sm sm:text-base max-w-xl mb-4 line-clamp-2">
                    {artist.bio}
                </p>

                <div className="flex items-center gap-6 text-white/60 text-sm mb-5">
                    <span>
                        <strong className="text-white">{formatNumber(artist.weeklyListeners)}</strong>{' '}
                        weekly listeners
                    </span>
                    <span>
                        <strong className="text-gold">{formatNumber(parseFloat(artist.totalTipsReceived || '0'))}</strong>{' '}
                        XLM tipped
                    </span>
                    {artist.genre && (
                        <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs">
                            {artist.genre}
                        </span>
                    )}
                </div>

                <button className="px-6 py-2.5 bg-primary-blue hover:bg-primary-blue/90 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-95 w-fit text-sm sm:text-base">
                    Explore Artist
                </button>
            </div>
        </section>
    );
};

export default HeroSection;
