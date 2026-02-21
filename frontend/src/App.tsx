import { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import BadgesPage from "./pages/BadgesPage";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import DashboardPage from "./pages/DashboardPage";
import AppHeader from "./components/layout/AppHeader";
import MusicPlayer, { tracks } from "./components/player/MusicPlayer";
import { ArtistOnboarding } from "./components/ArtistOnboarding";
import { LiveRegionProvider } from "./components/a11y/LiveRegion";
import { SkipLink, KeyboardShortcutHelp } from "./components/a11y";
import { useKeyboardShortcuts } from "./hooks";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";

function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const openShortcuts = useCallback(() => setShowShortcuts(true), []);
  const closeShortcuts = useCallback(() => setShowShortcuts(false), []);

  useKeyboardShortcuts([
    { key: "?", action: openShortcuts, description: "Open keyboard shortcuts" },
  ]);

  return (
    <LiveRegionProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-deep-slate">
        <SkipLink targetId="main-content" />
        <AppHeader />
        <main
          id="main-content"
          className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6"
          tabIndex={-1}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/onboarding" element={<ArtistOnboarding />} />
          </Routes>

          <MusicPlayer tracks={tracks} />
        </main>

        <KeyboardShortcutHelp
          isOpen={showShortcuts}
          onClose={closeShortcuts}
        />
      </div>
    </LiveRegionProvider>
  );
}

export default App;
