import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import NotFoundPage from "./pages/NotFoundPage";
import BadgesPage from "./pages/BadgesPage";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import TipHistoryPage from "./pages/TipHistoryPage";
import TipReceiptPage from "./pages/TipReceiptPage";
import GiftReceiptPage from "./pages/GiftReceiptPage";
import AppHeader from "./components/layout/AppHeader";
import MusicPlayer, { tracks } from "./components/player/MusicPlayer";
import { ArtistOnboarding } from "./components/ArtistOnboarding";
import SearchPage from "./pages/SearchPage";

import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import InstallPrompt from "./components/InstallPrompt";
import LivePerformanceMode from "./components/live-performance/LivePerformanceMode";
import { PlayerProvider } from "./contexts/PlayerContext";
import { AmbientMode } from "./components/ambient";

function App() {
  return (
    <div className="min-h-screen bg-app text-app theme-transition">
      <AppHeader />
      <PlayerProvider tracks={tracks}>
        <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/artists/:artistId" element={<ArtistProfilePage />} />
            <Route path="/tips/history" element={<TipHistoryPage />} />
            <Route path="/tips/:tipId/receipt" element={<TipReceiptPage />} />
            <Route path="/gifts/:giftId" element={<GiftReceiptPage />} />
            <Route path="/live-performance" element={<LivePerformanceMode />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/onboarding" element={<ArtistOnboarding />} />
          </Routes>
          <MusicPlayer tracks={tracks} />
          <AmbientMode />
        </main>
      </PlayerProvider>
      <InstallPrompt />
    </div>
  );
}

export default App;
