import React from 'react';

const GeographicMap: React.FC = () => {
    // Simplified world map data/dots for demonstration
    const tipLocations = [
        { x: 200, y: 100, city: 'New York', amount: 500 },
        { x: 450, y: 80, city: 'London', amount: 300 },
        { x: 500, y: 150, city: 'Paris', amount: 450 },
        { x: 700, y: 120, city: 'Tokyo', amount: 600 },
        { x: 300, y: 220, city: 'Sao Paulo', amount: 200 },
        { x: 600, y: 250, city: 'Sydney', amount: 150 },
    ];

    return (
        <div className="w-full p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden group">
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                Global Tip Presence
            </h3>

            <div className="relative aspect-[2/1] bg-slate-900/40 rounded-xl border border-white/5 p-4 overflow-hidden">
                {/* Simple SVG World Map Outline Placeholder */}
                <svg viewBox="0 0 800 400" className="w-full h-full opacity-20">
                    <path
                        d="M100,150 Q150,100 250,120 T400,100 T550,150 T700,120"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                    />
                    {/* Mock map shapes */}
                    <rect x="150" y="80" width="100" height="60" rx="20" fill="gray" />
                    <rect x="420" y="70" width="60" height="40" rx="10" fill="gray" />
                    <rect x="680" y="110" width="40" height="30" rx="5" fill="gray" />
                    <rect x="280" y="200" width="80" height="50" rx="15" fill="gray" />
                </svg>

                {tipLocations.map((loc, i) => (
                    <div
                        key={i}
                        className="absolute group/dot"
                        style={{ left: `${(loc.x / 800) * 100}%`, top: `${(loc.y / 400) * 100}%` }}
                    >
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-ping absolute" />
                        <div className="w-3 h-3 bg-purple-400 rounded-full relative shadow-[0_0_10px_purple]" />

                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-[10px] text-white opacity-0 group-hover/dot:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-2xl">
                            <div className="font-bold">{loc.city}</div>
                            <div className="text-purple-400">${loc.amount} tipped</div>
                        </div>
                    </div>
                ))}

                <div className="absolute bottom-4 left-4 text-[10px] text-white/30 uppercase tracking-widest">
                    Mocked Global Distribution
                </div>
            </div>
        </div>
    );
};

export default GeographicMap;
