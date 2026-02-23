import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { TrackStats } from '../../types/analytics';

interface TopTracksBarProps {
    data: TrackStats[];
}

const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'];

const TopTracksBar: React.FC<TopTracksBarProps> = ({ data }) => {
    return (
        <div className="w-full h-[400px] p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Top Tracks by Tips
            </h3>

            <ResponsiveContainer width="100%" height="80%">
                <BarChart
                    layout="vertical"
                    data={data}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        stroke="rgba(255,255,255,0.6)"
                        fontSize={12}
                        width={100}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    />
                    <Bar
                        dataKey="tipAmount"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        animationDuration={1500}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TopTracksBar;
