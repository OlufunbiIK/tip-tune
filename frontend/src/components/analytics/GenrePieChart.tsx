import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { GenreDistribution } from '../../types/analytics';

interface GenrePieChartProps {
    data: GenreDistribution[];
}

const GenrePieChart: React.FC<GenrePieChartProps> = ({ data }) => {
    return (
        <div className="w-full h-[400px] p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl group transition-all duration-300 hover:bg-white/10">
            <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Genre Distribution
            </h3>

            <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="genre"
                        animationBegin={0}
                        animationDuration={1500}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-white/70 text-sm">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GenrePieChart;
