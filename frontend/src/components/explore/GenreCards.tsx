import React from 'react';

export interface GenreItem {
    name: string;
    gradient: string;
}

interface GenreCardsProps {
    genres: GenreItem[];
    loading: boolean;
    selectedGenre: string | null;
    onGenreSelect: (genre: string | null) => void;
}

const GenreCardSkeleton: React.FC = () => (
    <div className="animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 h-24 sm:h-28" data-testid="genre-skeleton" />
);

const GenreCards: React.FC<GenreCardsProps> = ({
    genres,
    loading,
    selectedGenre,
    onGenreSelect,
}) => {
    return (
        <section data-testid="genre-cards">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Browse by Genre
                </h3>
                {selectedGenre && (
                    <button
                        onClick={() => onGenreSelect(null)}
                        className="text-sm text-primary-blue hover:text-primary-blue/80 font-medium transition-colors"
                    >
                        Clear filter
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {loading
                    ? Array.from({ length: 12 }).map((_, i) => <GenreCardSkeleton key={i} />)
                    : genres.map((genre) => {
                        const isSelected = selectedGenre === genre.name;
                        return (
                            <button
                                key={genre.name}
                                onClick={() =>
                                    onGenreSelect(isSelected ? null : genre.name)
                                }
                                className={`relative rounded-xl h-24 sm:h-28 overflow-hidden transition-all duration-300 group
                    ${isSelected
                                        ? 'ring-2 ring-primary-blue ring-offset-2 dark:ring-offset-deep-slate scale-95'
                                        : 'hover:scale-105 hover:shadow-lg'
                                    }`}
                                data-testid={`genre-card-${genre.name}`}
                            >
                                {/* Gradient background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${genre.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />

                                {/* Pattern overlay for texture */}
                                <div className="absolute inset-0 opacity-10"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                                        backgroundSize: '30px 30px',
                                    }}
                                />

                                {/* Genre name */}
                                <div className="relative h-full flex items-center justify-center px-3">
                                    <span className="text-white font-bold text-sm sm:text-base text-center drop-shadow-md">
                                        {genre.name}
                                    </span>
                                </div>

                                {/* Selected indicator */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                        <svg className="w-3 h-3 text-primary-blue" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
            </div>
        </section>
    );
};

export default GenreCards;
