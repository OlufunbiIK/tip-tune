
import React from 'react';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { Coins, Headphones, HeartHandshake } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatter';

interface DashboardStatsProps {
  totalTips?: number;
  totalPlays?: number;
  supporterCount?: number;
  isLoading: boolean;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; isLoading: boolean }> = ({ title, value, icon, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center">
          <Skeleton className="w-12 h-12 rounded-full mr-4" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center">
        <div className="mr-4">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary-blue to-secondary-indigo flex items-center justify-center shadow-sm">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-sm font-display font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-mono font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ totalTips, totalPlays, supporterCount, isLoading }) => {
  const stats = [
    {
      title: 'Total Tips',
      value: totalTips !== undefined ? formatCurrency(totalTips) : '...',
      icon: <Coins className="h-5 w-5 text-white" />,
    },
    {
      title: 'Total Plays',
      value: totalPlays !== undefined ? formatNumber(totalPlays) : '...',
      icon: <Headphones className="h-5 w-5 text-white" />,
    },
    {
      title: 'Supporters',
      value: supporterCount !== undefined ? formatNumber(supporterCount) : '...',
      icon: <HeartHandshake className="h-5 w-5 text-white" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(stat => (
        <StatCard key={stat.title} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
};

export default DashboardStats;
