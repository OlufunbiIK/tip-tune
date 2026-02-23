import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { Eye, EyeOff, Maximize, Minimize, Play, RotateCcw, Square } from 'lucide-react';
import LiveTipAlert from './LiveTipAlert';
import SessionTicker from './SessionTicker';
import HypeMeter from './HypeMeter';
import LiveLeaderboard from './LiveLeaderboard';
import type { LeaderboardEntry, LiveSessionState, LiveTipEvent } from './types';
import { truncateAddress } from '../../utils/stellar';

const SESSION_STORAGE_KEY = 'tiptune.livePerformance.session.v1';
const LARGE_TIP_THRESHOLD_XLM = 25;
const MAX_ALERTS = 6;
const MAX_PARTICLES = 24;

interface TipNotificationPayload {
  type?: string;
  data?: {
    tipId?: string;
    amount?: number;
    asset?: string;
    senderAddress?: string;
    isAnonymous?: boolean;
    createdAt?: string | Date;
  };
}

interface BurstParticle {
  id: string;
  x: number;
  y: number;
  duration: number;
  size: number;
}

const defaultSessionState: LiveSessionState = {
  artistId: '',
  isSessionActive: false,
  privacyMode: false,
  sessionStartedAt: null,
  sessionTotalXlm: 0,
  tipCount: 0,
  hypeScore: 0,
  alerts: [],
  leaderboard: [],
};

const loadSessionState = (): LiveSessionState => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return defaultSessionState;
    const parsed = JSON.parse(raw) as LiveSessionState;
    return {
      ...defaultSessionState,
      ...parsed,
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
    };
  } catch {
    return defaultSessionState;
  }
};

const getSocketBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  return apiUrl.replace('/api', '');
};

const LivePerformanceMode: React.FC = () => {
  const [session, setSession] = useState<LiveSessionState>(defaultSessionState);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [isConnected, setIsConnected] = useState(false);
  const [lastTipAt, setLastTipAt] = useState<string | null>(null);
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const previousArtistIdRef = useRef<string>('');

  useEffect(() => {
    setSession(loadSessionState());
  }, []);

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSession((prev) => ({
        ...prev,
        hypeScore: Math.max(0, prev.hypeScore - 3),
      }));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const addParticleBurst = useCallback(() => {
    const now = Date.now();
    const particles: BurstParticle[] = Array.from({ length: MAX_PARTICLES }).map((_, index) => ({
      id: `${now}-${index}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 900 + Math.random() * 1000,
      size: 5 + Math.random() * 8,
    }));
    setBurstParticles(particles);
    window.setTimeout(() => setBurstParticles([]), 1500);
  }, []);

  const handleIncomingTip = useCallback(
    (payload: TipNotificationPayload) => {
      if (!session.isSessionActive) return;
      const tip = payload.data;
      if (!tip || typeof tip.amount !== 'number') return;

      const asset = tip.asset || 'XLM';
      const isXlmTip = asset.toUpperCase() === 'XLM';
      const tipper = tip.isAnonymous ? 'Anonymous fan' : truncateAddress(tip.senderAddress || 'Guest fan', 5, 4);
      const isLargeTip = isXlmTip && tip.amount >= LARGE_TIP_THRESHOLD_XLM;

      const alert: LiveTipEvent = {
        id: tip.tipId || `tip-${Date.now()}`,
        tipperName: tipper,
        amount: tip.amount,
        asset,
        createdAt: typeof tip.createdAt === 'string' ? tip.createdAt : new Date().toISOString(),
        isLargeTip,
      };

      setSession((prev) => {
        const existing = prev.leaderboard.find((entry) => entry.tipperName === tipper);
        const updatedEntry: LeaderboardEntry = existing
          ? { ...existing, total: existing.total + (isXlmTip ? tip.amount : 0), tipCount: existing.tipCount + 1 }
          : { tipperName: tipper, total: isXlmTip ? tip.amount : 0, tipCount: 1 };

        const leaderboard = prev.leaderboard
          .filter((entry) => entry.tipperName !== tipper)
          .concat(updatedEntry)
          .sort((a, b) => b.total - a.total);

        return {
          ...prev,
          tipCount: prev.tipCount + 1,
          sessionTotalXlm: prev.sessionTotalXlm + (isXlmTip ? tip.amount : 0),
          hypeScore: Math.min(100, prev.hypeScore + Math.max(8, tip.amount * 1.2)),
          alerts: [alert, ...prev.alerts].slice(0, MAX_ALERTS),
          leaderboard,
        };
      });

      setLastTipAt(new Date().toISOString());
      if (isLargeTip) addParticleBurst();
    },
    [addParticleBurst, session.isSessionActive],
  );

  useEffect(() => {
    const socket = io(`${getSocketBaseUrl()}/tips`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (session.artistId) {
        socket.emit('join_artist_room', { artistId: session.artistId });
      }
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('tip_notification', handleIncomingTip);

    return () => {
      socket.off('tip_notification', handleIncomingTip);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleIncomingTip, session.artistId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const previous = previousArtistIdRef.current;
    const next = session.artistId.trim();

    if (previous && previous !== next) {
      socket.emit('leave_artist_room', { artistId: previous });
    }
    if (next && next !== previous) {
      socket.emit('join_artist_room', { artistId: next });
      previousArtistIdRef.current = next;
    }
  }, [session.artistId]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }, []);

  const setArtistId = useCallback((artistId: string) => {
    setSession((prev) => ({ ...prev, artistId }));
  }, []);

  const startSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isSessionActive: true,
      sessionStartedAt: prev.sessionStartedAt || new Date().toISOString(),
    }));
  }, []);

  const endSession = useCallback(() => {
    setSession((prev) => ({ ...prev, isSessionActive: false }));
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setSession((prev) => ({ ...prev, privacyMode: !prev.privacyMode }));
  }, []);

  const resetSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      sessionStartedAt: null,
      sessionTotalXlm: 0,
      tipCount: 0,
      hypeScore: 0,
      alerts: [],
      leaderboard: [],
      isSessionActive: false,
    }));
    setLastTipAt(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const sessionClockLabel = useMemo(() => {
    if (!session.sessionStartedAt) return 'Not started';
    return new Date(session.sessionStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [session.sessionStartedAt]);

  return (
    <section className="fixed inset-0 z-40 overflow-auto bg-gradient-to-b from-[#050b13] via-[#09192b] to-[#081220] text-white">
      <div className="relative mx-auto min-h-screen w-full max-w-[1600px] px-4 py-5 sm:px-6 md:px-8">
        {burstParticles.map((particle) => (
          <span
            key={particle.id}
            className="pointer-events-none absolute rounded-full bg-gold/70"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `coin-fly ${particle.duration}ms ease-out forwards`,
            }}
            aria-hidden="true"
          />
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-primary/40 bg-navy/70 p-3 backdrop-blur">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Live Performance Mode</h1>
            <p className="text-sm text-slate-300">
              Session started: {sessionClockLabel} | WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacyMode}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800/60"
            >
              {session.privacyMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {session.privacyMode ? 'Disable privacy' : 'Enable privacy'}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800/60"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-blue-primary/40 bg-navy/80 p-4 lg:col-span-4">
            <label htmlFor="live-artist-id" className="text-xs uppercase tracking-[0.2em] text-ice-blue">
              Artist ID (room subscription)
            </label>
            <input
              id="live-artist-id"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-blue-primary"
              value={session.artistId}
              onChange={(event) => setArtistId(event.target.value)}
              placeholder="Enter artist UUID"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-2 rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-mint/90"
              >
                <Play className="h-4 w-4" />
                Start session
              </button>
              <button
                type="button"
                onClick={endSession}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
              >
                <Square className="h-4 w-4" />
                End session
              </button>
              <button
                type="button"
                onClick={resetSession}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-rose-300"
              >
                <RotateCcw className="h-4 w-4" />
                Reset stats
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Stats persist locally until reset. Session can be paused/resumed.
            </p>
          </div>

          <div className="lg:col-span-4">
            <SessionTicker
              totalXlm={session.sessionTotalXlm}
              tipCount={session.tipCount}
              isSessionActive={session.isSessionActive}
              privacyMode={session.privacyMode}
            />
            <p className="mt-2 text-xs text-slate-300">
              Last tip: {lastTipAt ? new Date(lastTipAt).toLocaleTimeString() : 'No tips yet'}
            </p>
          </div>

          <div className="lg:col-span-4">
            <HypeMeter value={session.hypeScore} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="rounded-2xl border border-blue-primary/40 bg-navy/60 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ice-blue">
                Live tip alerts
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {session.alerts.length === 0 ? (
                  <p className="col-span-full rounded-xl border border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-300">
                    Waiting for live tips. Start session and ensure an artist room is selected.
                  </p>
                ) : (
                  session.alerts.map((tip) => (
                    <LiveTipAlert key={tip.id} tip={tip} privacyMode={session.privacyMode} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <LiveLeaderboard entries={session.leaderboard} privacyMode={session.privacyMode} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LivePerformanceMode;
