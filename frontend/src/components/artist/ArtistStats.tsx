import React from 'react';

interface ArtistStatsProps {
  totalTipsReceived: number;
  followerCount: number;
  trackCount: number;
}

const ArtistStats: React.FC<ArtistStatsProps> = ({
  totalTipsReceived,
  followerCount,
  trackCount,
}) => {
  const stats = [
    { label: 'Total Tips', value: `${totalTipsReceived.toLocaleString()} XLM` },
    { label: 'Followers', value: followerCount.toLocaleString() },
    { label: 'Tracks', value: trackCount.toString() },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Stats</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ArtistStats;
