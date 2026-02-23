import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface PricePoint {
  time: number;
  price: number;
}

export interface PriceSparklineProps {
  data: PricePoint[];
}

const PriceSparkline: React.FC<PriceSparklineProps> = ({ data }) => {
  if (!data.length) {
    return (
      <div className="h-10 w-24 rounded-lg bg-slate-800/60 animate-pulse" />
    );
  }

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
            labelFormatter={() => ''}
            contentStyle={{
              backgroundColor: 'rgb(15,23,42)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(148,163,184,0.4)',
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#sparklineGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceSparkline;

