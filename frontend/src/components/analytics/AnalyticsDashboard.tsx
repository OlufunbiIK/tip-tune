import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import TipsLineChart from './TipsLineChart';
import GenrePieChart from './GenrePieChart';
import TopTracksBar from './TopTracksBar';
import PlayHeatmap from './PlayHeatmap';
import FollowerGrowth from './FollowerGrowth';
import TipAmountDistribution from './TipAmountDistribution';
import TipStream from './TipStream';
import GeographicMap from './GeographicMap';
import { Download, LayoutDashboard, Share2, RefreshCw } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
    const dashboardRef = useRef<HTMLDivElement>(null);

    const exportAsImage = async () => {
        if (dashboardRef.current === null) return;

        try {
            const dataUrl = await toPng(dashboardRef.current, { cacheBust: true, backgroundColor: '#0f172a' });
            const link = document.createElement('a');
            link.download = `tiptune-analytics-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('oops, something went wrong!', err);
        }
    };

    // Mock Data
    const tipsHistory = [
        { date: '2024-01-01', amount: 120 },
        { date: '2024-01-02', amount: 180 },
        { date: '2024-01-03', amount: 150 },
        { date: '2024-01-04', amount: 240 },
        { date: '2024-01-05', amount: 310 },
        { date: '2024-01-06', amount: 280 },
        { date: '2024-01-07', amount: 350 },
    ];

    const genreData = [
        { genre: 'Electronic', value: 45, color: '#8b5cf6' },
        { genre: 'Lo-Fi', value: 30, color: '#ec4899' },
        { genre: 'Jazz', value: 15, color: '#3b82f6' },
        { genre: 'Ambient', value: 10, color: '#10b981' },
    ];

    const topTracks = [
        { name: 'Neon Nights', artist: 'SynthWave', tipAmount: 850, playCount: 1200 },
        { name: 'Midnight Rain', artist: 'LoFi Girl', tipAmount: 620, playCount: 950 },
        { name: 'Stellar Drift', artist: 'Cosmic', tipAmount: 510, playCount: 800 },
        { name: 'Cyber Beats', artist: 'Glitch', tipAmount: 480, playCount: 1100 },
        { name: 'Dream State', artist: 'Sleepy', tipAmount: 390, playCount: 750 },
    ];

    const followerGrowth = [
        { date: 'Mon', followers: 1200 },
        { date: 'Tue', followers: 1250 },
        { date: 'Wed', followers: 1240 },
        { date: 'Thu', followers: 1320 },
        { date: 'Fri', followers: 1400 },
        { date: 'Sat', followers: 1550 },
        { date: 'Sun', followers: 1620 },
    ];

    const tipDistribution = [
        { range: '$1-5', count: 450 },
        { range: '$6-10', count: 280 },
        { range: '$11-20', count: 150 },
        { range: '$21-50', count: 80 },
        { range: '$50+', count: 35 },
    ];

    const heatmapData = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        count: Math.floor(Math.random() * 15)
    }));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 font-sans">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-4">
                        <LayoutDashboard className="w-10 h-10 text-purple-500" />
                        Artist Analytics
                    </h1>
                    <p className="text-slate-400 text-lg">Real-time performance metrics and tip statistics.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 backdrop-blur-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={exportAsImage}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-lg shadow-purple-500/20 font-bold"
                    >
                        <Download className="w-4 h-4" />
                        Export Image
                    </button>
                </div>
            </div>

            <div ref={dashboardRef} className="max-w-7xl mx-auto space-y-8">
                {/* Top Row: Stream and Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <TipStream />
                    </div>
                    <div>
                        <FollowerGrowth data={followerGrowth} />
                    </div>
                </div>

                {/* Middle Row: Tips and Genre */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <TipsLineChart data={tipsHistory} />
                    <GenrePieChart data={genreData} />
                </div>

                {/* Third Row: Tracks and Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <TopTracksBar data={topTracks} />
                    </div>
                    <div className="lg:col-span-1">
                        <TipAmountDistribution data={tipDistribution} />
                    </div>
                    <div className="lg:col-span-1">
                        <GeographicMap />
                    </div>
                </div>

                {/* Bottom Row: Heatmap */}
                <div>
                    <PlayHeatmap data={heatmapData} />
                </div>
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex justify-between items-center text-slate-500 text-sm">
                <p>© 2024 TipTune Analytics. Advanced Artist Insights.</p>
                <div className="flex gap-6">
                    <button className="hover:text-white transition-colors">Documentation</button>
                    <button className="hover:text-white transition-colors">API Keys</button>
                    <button className="hover:text-white transition-colors flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> Share Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
