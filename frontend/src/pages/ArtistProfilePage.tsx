import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ArtistBio from '@/components/artist/ArtistBio';
import ArtistHeader from '@/components/artist/ArtistHeader';
import ArtistStats from '@/components/artist/ArtistStats';
import ArtistTrackList from '@/components/artist/ArtistTrackList';
import Skeleton from '@/components/ui/Skeleton';
import { fetchArtistProfilePage, followArtist, unfollowArtist } from '@/services/artistService';
import { ArtistProfilePageData } from '@/types';
import SongRequestModal from '@/components/requests/SongRequestModal';
import RequestQueue from '@/components/requests/RequestQueue';
import type { SongRequest } from '@/components/requests/types';
import RequestNotification from '@/components/requests/RequestNotification';
import {
  ComboCounter,
  ComboTimer,
  OnFireAnimation,
  StreakBadge,
  StreakDisplay,
} from '@/components/combo';
import { useTipCombo } from '@/hooks/useTipCombo';
import {
  buildArtistThemeVariables,
  resolveArtistAccentColor,
  setArtistAccentPreference,
} from '@/utils/theme';

const ArtistProfilePage: React.FC = () => {
  const { artistId = 'dj-melodica' } = useParams();
  const [profileData, setProfileData] = useState<ArtistProfilePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [artistAccent, setArtistAccent] = useState<string>('#6366f1');
  const combo = useTipCombo({ windowMs: 30_000 });

  const loadArtist = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchArtistProfilePage(artistId);
      setProfileData(data);
      setArtistAccent(resolveArtistAccentColor(data.artist.id, data.artist.accentColor));
    } catch {
      setError('Unable to load artist profile right now.');
    } finally {
      setIsLoading(false);
    }
  }, [artistId]);

  const artistThemeVariables = useMemo(
    () => buildArtistThemeVariables(profileData?.artist.id, artistAccent),
    [profileData?.artist.id, artistAccent],
  );

  useEffect(() => {
    loadArtist();
  }, [loadArtist]);

  const handleFollowToggle = async () => {
    if (!profileData || isFollowPending) return;

    setIsFollowPending(true);
    try {
      const response = profileData.artist.isFollowing
        ? await unfollowArtist(profileData.artist.id)
        : await followArtist(profileData.artist.id);

      setProfileData((current) => {
        if (!current) return current;
        return {
          ...current,
          artist: {
            ...current.artist,
            isFollowing: response.isFollowing,
            followerCount: response.followerCount,
          },
        };
      });
    } catch {
      setError('Could not update follow state. Please retry.');
    } finally {
      setIsFollowPending(false);
    }
  };

  const handleShare = async () => {
    if (!profileData) return;

    const link = `${window.location.origin}/artists/${profileData.artist.id}`;
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(link);
      setShareStatus('Profile link copied');
    } catch {
      setShareStatus(link);
    }
  };

  const handleCreateRequest = async ({
    trackId,
    tipAmount,
    assetCode,
    message,
  }: {
    trackId: string;
    tipAmount: number;
    assetCode: 'XLM' | 'USDC';
    message?: string;
  }) => {
    if (!profileData) return;

    // Simple duplicate prevention: only one pending request per track from same fan name placeholder
    const fanName = 'You';
    const hasDuplicate = requests.some(
      (r) =>
        r.trackId === trackId &&
        r.fanName === fanName &&
        r.status === 'pending'
    );
    if (hasDuplicate) {
      setNotification('You have already requested this track. Please wait for the artist.');
      return;
    }

    const track = profileData.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const newRequest: SongRequest = {
      id: `req_${Date.now()}`,
      trackId,
      trackTitle: track.title,
      tipAmount,
      assetCode,
      fanName,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      message,
    };

    setRequests((prev) => [newRequest, ...prev]);
    combo.registerTip(tipAmount);
    setNotification('Song request sent! Higher tips move you up the queue.');
  };

  const handleAcceptRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'accepted' } : r))
    );
  };

  const handleDeclineRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'declined' } : r))
    );
  };

  const handlePlayRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'played' } : r))
    );
    setNotification('Fan has been notified that their request was played.');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p>{error}</p>
        <button onClick={loadArtist} className="mt-3 rounded-md bg-red-600 px-3 py-2 text-sm text-white">
          Retry
        </button>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div
      className="artist-theme-scope space-y-6 pb-24"
      style={artistThemeVariables as React.CSSProperties}
    >
      <ArtistHeader
        artistName={profileData.artist.artistName}
        coverImage={profileData.artist.coverImage}
        profileImage={profileData.artist.profileImage}
        followerCount={profileData.artist.followerCount}
        isFollowing={profileData.artist.isFollowing}
        isFollowPending={isFollowPending}
        onFollowToggle={handleFollowToggle}
        onShare={handleShare}
        shareStatus={shareStatus}
      />

      <ArtistStats
        totalTipsReceived={profileData.artist.totalTipsReceived}
        followerCount={profileData.artist.followerCount}
        trackCount={profileData.tracks.length}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <ArtistTrackList tracks={profileData.tracks} />
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="artist-accent-bg inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Request a song
            </button>
          </div>
        </div>
        <div className="space-y-6">
          <StreakBadge streakDays={combo.streak.currentDays} className="w-fit" />

          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-deep-slate">
            <h2 className="artist-accent-text text-lg font-semibold">Artist Theme</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pick an accent color for this artist profile.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={artistAccent}
                aria-label="Artist accent color"
                onChange={(event) => {
                  const next = setArtistAccentPreference(
                    profileData.artist.id,
                    event.target.value,
                  );
                  setArtistAccent(next ?? event.target.value);
                }}
                className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 p-1 dark:border-gray-700"
              />
              <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {artistAccent}
              </span>
            </div>
          </section>

          <ArtistBio bio={profileData.artist.bio} socialLinks={profileData.artist.socialLinks} />
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-deep-slate">
            <h2 className="artist-accent-text text-lg font-semibold text-gray-900 dark:text-white">
              Recent Tips
            </h2>
            <ul className="mt-3 space-y-3">
              {profileData.recentTips.map((tip) => (
                <li key={tip.id} className="artist-accent-soft-bg rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {tip.tipperName || 'Anonymous'} tipped {tip.amount.toFixed(2)} XLM
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{new Date(tip.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-deep-slate">
            <h2 className="artist-accent-text text-lg font-semibold text-gray-900 dark:text-white">Song Requests</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fans can attach a tip to their request. Higher tips are sorted to the top.
            </p>
            <StreakDisplay
              currentDays={combo.streak.currentDays}
              longestDays={combo.streak.longestDays}
              lastTipDate={combo.streak.lastTipDate}
            />
            <ComboCounter
              comboCount={combo.comboCount}
              multiplier={combo.multiplier}
              isActive={combo.comboActive}
            />
            <ComboTimer
              progress={combo.progress}
              isActive={combo.comboActive}
              remainingMs={combo.timeRemainingMs}
            />
            <OnFireAnimation active={combo.isOnFire} />
            {notification && (
              <RequestNotification message={notification} type="info" />
            )}
            <div className="mt-2">
              <RequestQueue
                requests={requests}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
                onPlay={handlePlayRequest}
              />
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Combo History
              </h3>
              {combo.history.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Land two or more tips within 30 seconds to record your first combo.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {combo.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-xs dark:bg-gray-800"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        x{entry.multiplier} combo ({entry.tipCount} tips)
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(entry.endedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      <SongRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        tracks={profileData.tracks}
        onCreateRequest={handleCreateRequest}
      />
    </div>
  );
};

export default ArtistProfilePage;
