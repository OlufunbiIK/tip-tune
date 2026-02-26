import React from 'react';
import type { LeaderboardEntry } from './types';

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[];
  privacyMode: boolean;
}

const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({ entries, privacyMode }) => {
  const top = entries.slice(0, 5);

  return (
    <div className="rounded-2xl border border-blue-primary/40 bg-navy/80 p-4 shadow-xl">
      <h2 className="text-xs uppercase tracking-[0.2em] text-ice-blue">Top tippers (session)</h2>
      {top.length === 0 ? (
        <p className="mt-4 text-sm text-slate-300">No tips in this session yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map((entry, index) => (
            <li
              key={`${entry.tipperName}-${index}`}
              className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  #{index + 1} {privacyMode ? 'Hidden supporter' : entry.tipperName}
                </p>
                <p className="text-xs text-slate-300">{entry.tipCount} tips</p>
              </div>
              <p className="text-sm font-bold text-mint">
                {privacyMode ? '••••' : `${entry.total.toFixed(2)} XLM`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveLeaderboard;
