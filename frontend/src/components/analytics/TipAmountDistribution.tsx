import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface TipAmountDistributionProps {
    data: { range: string; count: number }[];
}

const TipAmountDistribution: React.FC<TipAmountDistributionProps> = ({ data }) => {
    return (
        <div className="w-full h-[300px] p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Tip Amount Distribution
            </h3>

            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="range"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={12}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={12}
                        tickLine={false}
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
                        dataKey="count"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                        animationDuration={1500}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TipAmountDistribution;
