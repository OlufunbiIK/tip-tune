import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Virtuoso } from "react-virtuoso";
import { User, Music } from "lucide-react";
import { highlightMatch } from "./AutocompleteDropdown";
import type { SearchResult } from "@/types/search.types";
import type { Artist, Track } from "@/types";

interface SearchResultsProps {
  results: SearchResult | null;
  query: string;
  searchLoading: boolean;
  searchError: Error | null;
  className?: string;
}

function ArtistRow({ artist, query }: { artist: Artist; query: string }) {
  return (
    <Link
      to={`/artist/${artist.id}`}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary-blue/50 hover:shadow-md dark:border-gray-700 dark:bg-deep-slate dark:hover:border-primary-blue/50"
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        {artist.profileImage ? (
          <img
            src={artist.profileImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-7 w-7 text-gray-500 dark:text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-deep-slate dark:text-white">
          {highlightMatch(artist.artistName, query)}
        </div>
        {artist.genre && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {highlightMatch(artist.genre, query)}
          </div>
        )}
      </div>
    </Link>
  );
}

function TrackRow({ track, query }: { track: Track; query: string }) {
  return (
    <Link
      to={`/track/${track.id}`}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary-blue/50 hover:shadow-md dark:border-gray-700 dark:bg-deep-slate dark:hover:border-primary-blue/50"
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
        {track.coverArt ? (
          <img
            src={track.coverArt}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-7 w-7 text-gray-500 dark:text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-deep-slate dark:text-white">
          {highlightMatch(track.title, query)}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {track.artist && highlightMatch(track.artist.artistName, query)}
          {track.genre && ` · ${highlightMatch(track.genre, query)}`}
        </div>
      </div>
      {(track.plays != null || track.tips != null) && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {track.plays != null &&
            `${Number(track.plays).toLocaleString()} plays`}
          {track.plays != null && track.tips != null && " · "}
          {track.tips != null && `${Number(track.tips).toLocaleString()} tips`}
        </div>
      )}
    </Link>
  );
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  searchLoading,
  searchError,
  className = "",
}) => {
  const { items, totalCount } = useMemo(() => {
    if (!results)
      return {
        items: [] as { type: "artist" | "track"; data: Artist | Track }[],
        totalCount: 0,
      };
    const list: { type: "artist" | "track"; data: Artist | Track }[] = [];
    const artists = results.artists?.data ?? [];
    const tracks = results.tracks?.data ?? [];
    const aTotal = results.artists?.total ?? 0;
    const tTotal = results.tracks?.total ?? 0;
    artists.forEach((a) => list.push({ type: "artist", data: a }));
    tracks.forEach((t) => list.push({ type: "track", data: t }));
    return { items: list, totalCount: aTotal + tTotal };
  }, [results]);

  if (searchError) {
    return (
      <div
        className={`rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300 ${className}`}
        role="alert"
      >
        {searchError.message}
      </div>
    );
  }

  if (searchLoading) {
    return (
      <div
        className={`flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-deep-slate ${className}`}
        data-testid="search-results-loading"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
        <span className="text-gray-600 dark:text-gray-400">Searching...</span>
      </div>
    );
  }

  if (items.length === 0 && results !== null) {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-deep-slate dark:text-gray-400 ${className}`}
        data-testid="search-results-empty"
      >
        No results found. Try different keywords or filters.
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={className} data-testid="search-results">
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {totalCount} result{totalCount !== 1 ? "s" : ""}
      </p>
      <Virtuoso
        style={{ height: "min(70vh, 600px)" }}
        totalCount={items.length}
        itemContent={(index) => {
          const row = items[index];
          if (row.type === "artist") {
            return (
              <div className="pb-3">
                <ArtistRow artist={row.data as Artist} query={query} />
              </div>
            );
          }
          return (
            <div className="pb-3">
              <TrackRow track={row.data as Track} query={query} />
            </div>
          );
        }}
      />
    </div>
  );
};

export default SearchResults;
