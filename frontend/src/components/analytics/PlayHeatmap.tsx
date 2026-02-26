import React, { useMemo } from 'react';
import { HeatmapData } from '../../types/analytics';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';

interface PlayHeatmapProps {
    data: HeatmapData[];
}

const PlayHeatmap: React.FC<PlayHeatmapProps> = ({ data }) => {
    const days = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 364); // Last year
        return eachDayOfInterval({ start, end });
    }, []);

    const getIntensity = (date: Date) => {
        const entry = data.find(d => isSameDay(new Date(d.date), date));
        if (!entry) return 0;
        return Math.min(entry.count / 10, 1); // Normalize to 0-1
    };

    const getColor = (intensity: number) => {
        if (intensity === 0) return 'rgba(255,255,255,0.05)';
        return `rgba(52, 211, 153, ${0.2 + intensity * 0.8})`; // Greenish
    };

    return (
        <div className="w-full p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                Play Count Heatmap
            </h3>

            <div className="flex flex-col gap-1 overflow-x-auto pb-4">
                <div className="flex gap-1">
                    {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                            {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                                const intensity = getIntensity(day);
                                return (
                                    <div
                                        key={dayIndex}
                                        className="w-3 h-3 rounded-sm transition-all duration-300 hover:scale-125 cursor-pointer relative group"
                                        style={{ backgroundColor: getColor(intensity) }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                                            {format(day, 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-white/40 uppercase tracking-tighter">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-white/5" />
                <div className="w-3 h-3 rounded-sm bg-emerald-900/40" />
                <div className="w-3 h-3 rounded-sm bg-emerald-700/60" />
                <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                <span>More</span>
            </div>
        </div>
    );
};

export default PlayHeatmap;
