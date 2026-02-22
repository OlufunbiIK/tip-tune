import React, { useRef, useEffect } from 'react';
import { useSpring, animated, useTransition } from 'react-spring';
import { useReducedMotion } from '../utils/animationUtils';
import { LeaderboardEntry } from '../services/leaderboardService';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  scoreLabel?: string;
  showRankChange?: boolean;
  onEntryClick?: (entry: LeaderboardEntry) => void;
  currentUserId?: string;
}

// ─── Rank Badge ────────────────────────────────────────────────────────────────

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const reducedMotion = useReducedMotion();
  const isTop = rank <= 3;

  const STYLES: Record<number, string> = {
    1: 'bg-accent-gold/20 text-accent-gold border border-accent-gold/50',
    2: 'bg-gray-400/20 text-gray-300 border border-gray-400/40',
    3: 'bg-orange-400/20 text-orange-300 border border-orange-400/40',
  };
  const EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm
        ${isTop ? STYLES[rank] : 'bg-white/5 text-gray-400 border border-white/10'}
        ${!reducedMotion && rank === 1 ? 'animate-rank-glow' : ''}
      `}
    >
      {isTop ? EMOJI[rank] : rank}
    </div>
  );
};

// ─── Rank Change Arrow ─────────────────────────────────────────────────────────

const RankChangeBadge: React.FC<{ change?: number }> = ({ change }) => {
  const reducedMotion = useReducedMotion();

  const spring = useSpring({
    from: { opacity: 0, y: -6 },
    to: { opacity: 1, y: 0 },
    config: { tension: 200, friction: 14 },
    immediate: reducedMotion,
  });

  if (!change) {
    return (
      <span className="text-gray-600 flex items-center gap-0.5 text-xs">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
        —
      </span>
    );
  }

  const isUp = change > 0;

  return (
    <animated.span
      style={reducedMotion ? {} : spring}
      className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
      {Math.abs(change)}
    </animated.span>
  );
};

// ─── Main Table ────────────────────────────────────────────────────────────────

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  scoreLabel = 'Score',
  showRankChange = true,
  onEntryClick,
  currentUserId,
}) => {
  const reducedMotion = useReducedMotion();
  const prevEntriesRef = useRef<Set<string>>(new Set());

  // Detect which IDs are brand-new (for fade-up slide-in)
  const newIds = new Set<string>();
  for (const e of entries) {
    if (!prevEntriesRef.current.has(e.id)) newIds.add(e.id);
  }
  useEffect(() => {
    prevEntriesRef.current = new Set(entries.map(e => e.id));
  }, [entries]);

  // React-spring transition for row enter
  const transitions = useTransition(entries, {
    keys: e => e.id,
    from: { opacity: 0, y: 12, scale: 0.97 },
    enter: { opacity: 1, y: 0, scale: 1 },
    config: { tension: 220, friction: 20 },
    immediate: reducedMotion,
  });

  const formatScore = (score: number): string => {
    if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(2)}M`;
    if (score >= 1_000) return `${(score / 1_000).toFixed(2)}K`;
    return score.toFixed(2);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="min-w-full divide-y divide-white/6">
        <thead>
          <tr className="bg-white/3">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Rank</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Artist</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">{scoreLabel}</th>
            {showRankChange && (
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Change</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {transitions((style, entry) => {
            const isCurrentUser = currentUserId && entry.id === currentUserId;
            const isNew = newIds.has(entry.id);

            return (
              <animated.tr
                key={entry.id}
                style={reducedMotion ? {} : style}
                className={[
                  'group transition-colors duration-150',
                  onEntryClick ? 'cursor-pointer' : '',
                  isCurrentUser ? 'bg-blue-primary/10 border-l-2 border-blue-primary' : 'hover:bg-white/3',
                  !reducedMotion && isNew ? 'animate-fade-up' : '',
                ].join(' ')}
                onClick={() => onEntryClick?.(entry)}
              >
                {/* Rank */}
                <td className="px-4 py-3">
                  <RankBadge rank={entry.rank} />
                </td>

                {/* Name + avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.name}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-primary/20 flex items-center justify-center ring-1 ring-blue-primary/30">
                        <span className="text-blue-primary text-sm font-semibold">
                          {entry.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-100 flex items-center gap-1.5">
                        {entry.name}
                        {isCurrentUser && (
                          <span className="text-[10px] bg-blue-primary/20 text-blue-primary px-1.5 py-0.5 rounded-full border border-blue-primary/30 font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      {entry.additionalData?.genre && (
                        <div className="text-xs text-gray-500">{entry.additionalData.genre}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Score */}
                <td className="px-4 py-3 text-right">
                  <div className="text-sm font-bold text-gray-100">{formatScore(entry.score)}</div>
                  {entry.additionalData?.tipCount && (
                    <div className="text-xs text-gray-500">{entry.additionalData.tipCount} tips</div>
                  )}
                </td>

                {/* Rank change */}
                {showRankChange && (
                  <td className="px-4 py-3 text-center">
                    <RankChangeBadge change={entry.change} />
                  </td>
                )}
              </animated.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
