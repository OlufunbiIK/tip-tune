import React from 'react';
import {
    // LineChart,
    // Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Brush,
    AreaChart,
    Area,
} from 'recharts';
import { TipDataPoint } from '../../types/analytics';

interface TipsLineChartProps {
    data: TipDataPoint[];
}

const TipsLineChart: React.FC<TipsLineChartProps> = ({ data }) => {
    return (
        <div className="w-full h-[400px] p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Tips Over Time
                </h3>
                <div className="flex gap-2">
                    <span className="text-xs text-white/40 uppercase tracking-widest">Interactive Zoom</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTips)"
                        animationDuration={1500}
                    />
                    <Brush
                        dataKey="date"
                        height={30}
                        stroke="#8b5cf6"
                        fill="rgba(255,255,255,0.05)"
                        travellerWidth={10}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TipsLineChart;
