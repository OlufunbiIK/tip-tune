
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartDataPoint } from '../../types';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { formatCurrency } from '../../utils/formatter';

interface TipsChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="font-bold">
          {new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-primary-blue font-mono">{`Tips: ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

const TipsChart: React.FC<TipsChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-80 w-full" />
      </Card>
    );
  }
  
  return (
    <Card>
      <h2 className="text-xl font-mono font-bold mb-4">Tips (Last 30 Days)</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
                dataKey="date" 
                tickFormatter={(dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                axisLine={false}
                tickLine={false}
            />
            <YAxis 
                tickFormatter={(value) => `$${value}`}
                tick={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="tips" stroke="#4338CA" fillOpacity={1} fill="url(#colorTips)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TipsChart;
