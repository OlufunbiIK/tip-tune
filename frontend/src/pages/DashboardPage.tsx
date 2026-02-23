
import React, { useState, useEffect, useCallback } from 'react';
import { fetchDashboardStats, fetchTipsChartData, fetchTopTracks, fetchRecentTips, fetchUserProfile } from '../services/artistService';
import { ChartDataPoint, Tip, Track, UserProfile } from '../types';
import DashboardStats from '../components/dashboard/DashboardStats';
import TipsChart from '../components/dashboard/TipsChart';
import TopTracks from '../components/dashboard/TopTracks';
import RecentTips from '../components/dashboard/RecentTips';
import ProfileSection from '../components/dashboard/ProfileEdit';
import GoalList from '../components/goals/GoalList';
import CreateGoalModal from '../components/goals/CreateGoalModal';
import Button from '../components/common/Button';

const Dashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [stats, setStats] = useState<{ totalTips?: number; totalPlays?: number; supporterCount?: number }>({});
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [recentTips, setRecentTips] = useState<Tip[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
    const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
    const [refreshGoals, setRefreshGoals] = useState(0);

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [statsData, chartData, topTracksData, recentTipsData, userProfileData] = await Promise.all([
                fetchDashboardStats(),
                fetchTipsChartData(),
                fetchTopTracks(),
                fetchRecentTips(),
                fetchUserProfile(),
            ]);
            setStats(statsData);
            setChartData(chartData);
            setTopTracks(topTracksData);
            setRecentTips(recentTipsData);
            setUserProfile(userProfileData);
        } catch (err) {
            setError('Failed to load dashboard data. Please try again later.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Simulate tip updates with polling (for demo purposes)
    // Note: For production, replace with actual WebSocket integration using socket.io-client
    // See useNotifications hook for example WebSocket implementation
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLoading) {
                const newTip: Tip = {
                    id: `tip_${Date.now()}`,
                    tipperName: 'Realtime Fan',
                    tipperAvatar: 'https://i.pravatar.cc/150?u=realtime',
                    amount: parseFloat((Math.random() * 20).toFixed(2)),
                    message: 'Just got this tip!',
                    timestamp: new Date().toISOString(),
                    trackId: topTracks[Math.floor(Math.random() * topTracks.length)]?.id,
                };

                setRecentTips(prevTips => [newTip, ...prevTips]);
                setStats(prevStats => ({
                    ...prevStats,
                    totalTips: (prevStats.totalTips || 0) + newTip.amount
                }));
            }
        }, 15000); // New tip every 15 seconds

        return () => clearInterval(interval);
    }, [isLoading, topTracks]);

    if (error) {
        return <div className="text-center py-10 text-red-500 bg-red-100 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <DashboardStats
                totalTips={stats.totalTips}
                totalPlays={stats.totalPlays}
                supporterCount={stats.supporterCount}
                isLoading={isLoading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-2 space-y-6">
                    <TipsChart data={chartData} isLoading={isLoading} />

                    {userProfile?.walletAddress && (
                        <div className="bg-navy-900 rounded-xl p-6 border border-navy-800">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">My Goals</h2>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsCreateGoalOpen(true)}
                                >
                                    + Create Goal
                                </Button>
                            </div>
                            <GoalList
                                artistId={userProfile.walletAddress} // Assuming walletAddress is used as artist ID for now, need to verify
                                onTip={() => { }}
                                isOwner={true}
                                refreshKey={refreshGoals}
                            />
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1 h-full space-y-6">
                    <TopTracks tracks={topTracks} isLoading={isLoading} />
                </div>
            </div>

            <RecentTips tips={recentTips} tracks={topTracks} isLoading={isLoading} />

            <ProfileSection profile={userProfile} isLoading={isLoading} />

            <CreateGoalModal
                isOpen={isCreateGoalOpen}
                onClose={() => setIsCreateGoalOpen(false)}
                onSuccess={() => {
                    // Refresh goals list - logically GoalList should fetch on mount or we trigger a refetch
                    // For now, let's just close the modal. GoalList handles its own fetching.
                    // Ideally we pass a refresh trigger to GoalList.
                    setIsCreateGoalOpen(false);
                    // Force refresh or similar if needed. 
                    // To do this properly, we might need a refresh key or signal.
                    setRefreshGoals(prev => prev + 1);
                }}
            />
        </div>
    );
};

export default Dashboard;
