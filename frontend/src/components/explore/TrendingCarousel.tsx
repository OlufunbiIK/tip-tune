import React, { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Coins } from 'lucide-react';
import { Track, Artist } from '../../types';

type CarouselItem = Track | Artist;

interface TrendingCarouselProps {
    title: string;
    items: CarouselItem[];
    loading: boolean;
    type?: 'tracks' | 'artists';
}

const isTrack = (item: CarouselItem): item is Track =>
    'coverArt' in item && 'plays' in item;

const isArtist = (item: CarouselItem): item is Artist =>
    'artistName' in item && 'walletAddress' in item;

const formatNumber = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

/* Skeleton card while loading */
const SkeletonCard: React.FC = () => (
    <div className="flex-shrink-0 w-40 sm:w-48 md:w-52 animate-pulse" data-testid="carousel-skeleton">
        <div className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
);

/* Individual track card */
const TrackCard: React.FC<{ track: Track }> = ({ track }) => (
    <div className="flex-shrink-0 w-40 sm:w-48 md:w-52 group cursor-pointer">
        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
            <img
                src={track.coverArt}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary-blue flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg">
                    <Play size={18} fill="white" className="text-white ml-0.5" />
                </div>
            </div>
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-primary-blue transition-colors">
            {track.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {track.artist?.artistName}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
                <Play size={10} /> {formatNumber(track.plays)}
            </span>
            <span className="flex items-center gap-1 text-gold">
                <Coins size={10} /> {formatNumber(track.tips)}
            </span>
        </div>
    </div>
);

/* Individual artist card */
const ArtistCard: React.FC<{ artist: Artist }> = ({ artist }) => (
    <div className="flex-shrink-0 w-40 sm:w-48 md:w-52 group cursor-pointer">
        <div className="relative aspect-square rounded-full overflow-hidden mb-3 shadow-md mx-auto w-32 sm:w-40 md:w-44">
            <img
                src={artist.profileImage || 'https://picsum.photos/seed/default/400/400'}
                alt={artist.artistName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm text-center truncate group-hover:text-primary-blue transition-colors">
            {artist.artistName}
        </h4>
        {artist.genre && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5">
                {artist.genre}
            </p>
        )}
        <p className="text-xs text-gold text-center mt-1">
            {formatNumber(parseFloat(artist.totalTipsReceived || '0'))} XLM
        </p>
    </div>
);

const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
    title,
    items,
    loading,
    type = 'tracks',
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollState = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const scrollAmount = scrollRef.current.clientWidth * 0.75;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
        setTimeout(updateScrollState, 350);
    };

    return (
        <section className="relative" data-testid={`carousel-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="Scroll left"
                        data-testid="scroll-left"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="Scroll right"
                        data-testid="scroll-right"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Scrollable row */}
            <div
                ref={scrollRef}
                onScroll={updateScrollState}
                className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : items.map((item) =>
                        type === 'artists' && isArtist(item) ? (
                            <ArtistCard key={item.id} artist={item} />
                        ) : isTrack(item) ? (
                            <TrackCard key={item.id} track={item} />
                        ) : null,
                    )}
            </div>
        </section>
    );
};

export default TrendingCarousel;
