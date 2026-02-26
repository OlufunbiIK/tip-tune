/**
 * GiftRecipientSearch — debounced username search to select the friend
 * who will be publicly credited for the gift tip.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, UserCheck, Loader2 } from 'lucide-react';
import type { GiftUserRef } from '../../types';

export interface GiftRecipientSearchProps {
  value: GiftUserRef | null;
  onChange: (user: GiftUserRef | null) => void;
  /** Optional async search function — falls back to mock data */
  onSearch?: (query: string) => Promise<GiftUserRef[]>;
  placeholder?: string;
}

/* ---- Mock data used when no onSearch is provided ---- */
const MOCK_USERS: GiftUserRef[] = [
  { id: 'u1', username: 'stellar_fan', displayName: 'Stellar Fan', avatarUrl: 'https://i.pravatar.cc/40?u=stellar_fan' },
  { id: 'u2', username: 'music_lover', displayName: 'Music Lover', avatarUrl: 'https://i.pravatar.cc/40?u=music_lover' },
  { id: 'u3', username: 'wave_rider', displayName: 'Wave Rider', avatarUrl: 'https://i.pravatar.cc/40?u=wave_rider' },
  { id: 'u4', username: 'neon_dreamer', displayName: 'Neon Dreamer', avatarUrl: 'https://i.pravatar.cc/40?u=neon_dreamer' },
  { id: 'u5', username: 'beat_master', displayName: 'Beat Master', avatarUrl: 'https://i.pravatar.cc/40?u=beat_master' },
];

function defaultSearch(query: string): Promise<GiftUserRef[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      const q = query.toLowerCase();
      resolve(
        q.length < 2
          ? []
          : MOCK_USERS.filter(
              (u) =>
                u.username.toLowerCase().includes(q) ||
                u.displayName?.toLowerCase().includes(q)
            )
      );
    }, 400)
  );
}

const GiftRecipientSearch: React.FC<GiftRecipientSearchProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search by username…',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GiftUserRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchFn = onSearch ?? defaultSearch;

  /** Run search with 350 ms debounce */
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      setIsOpen(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (q.trim().length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const found = await searchFn(q.trim());
          setResults(found);
        } catch {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 350);
    },
    [searchFn]
  );

  /** Select a user from the dropdown */
  const handleSelect = useCallback(
    (user: GiftUserRef) => {
      onChange(user);
      setQuery('');
      setResults([]);
      setIsOpen(false);
    },
    [onChange]
  );

  /** Clear selected user */
  const handleClear = useCallback(() => {
    onChange(null);
    setQuery('');
    setResults([]);
  }, [onChange]);

  /** Close dropdown when clicking outside */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  /* ── Selected state ── */
  if (value) {
    return (
      <div
        data-testid="gift-recipient-selected"
        className="flex items-center gap-3 rounded-xl border border-purple-400 bg-purple-900/20 px-4 py-3"
      >
        {value.avatarUrl ? (
          <img src={value.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {(value.displayName ?? value.username).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{value.displayName ?? value.username}</p>
          <p className="text-xs text-purple-300 truncate">@{value.username}</p>
        </div>
        <UserCheck className="h-5 w-5 text-purple-400 flex-shrink-0" />
        <button
          type="button"
          onClick={handleClear}
          aria-label="Remove recipient"
          className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  /* ── Search input + dropdown ── */
  return (
    <div ref={containerRef} className="relative" data-testid="gift-recipient-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          aria-label="Search for gift recipient"
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3
            text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400
            transition-shadow"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (results.length > 0 || (query.length >= 2 && !isLoading)) && (
        <ul
          role="listbox"
          aria-label="User search results"
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-white/10
            bg-[#0B1C2D] shadow-xl overflow-hidden"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">No users found for "{query}"</li>
          ) : (
            results.map((user) => (
              <li key={user.id}>
                <button
                  role="option"
                  aria-selected={false}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5
                    text-left transition-colors group"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center
                      text-white text-sm font-bold flex-shrink-0">
                      {(user.displayName ?? user.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                      {user.displayName ?? user.username}
                    </p>
                    <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default GiftRecipientSearch;
