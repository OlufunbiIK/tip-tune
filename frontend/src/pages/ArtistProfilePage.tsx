import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ArtistBio from '@/components/artist/ArtistBio';
import ArtistHeader from '@/components/artist/ArtistHeader';
import ArtistStats from '@/components/artist/ArtistStats';
import ArtistTrackList from '@/components/artist/ArtistTrackList';
import Skeleton from '@/components/ui/Skeleton';
import { fetchArtistProfilePage, followArtist, unfollowArtist } from '@/services/artistService';
import { ArtistProfilePageData } from '@/types';

const ArtistProfilePage: React.FC = () => {
  const { artistId = 'dj-melodica' } = useParams();
  const [profileData, setProfileData] = useState<ArtistProfilePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const loadArtist = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchArtistProfilePage(artistId);
      setProfileData(data);
    } catch {
      setError('Unable to load artist profile right now.');
    } finally {
      setIsLoading(false);
    }
  }, [artistId]);

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
    <div className="space-y-6 pb-24">
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
          <ArtistTrackList tracks={profileData.tracks} />
        </div>
        <div className="space-y-6">
          <ArtistBio bio={profileData.artist.bio} socialLinks={profileData.artist.socialLinks} />
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tips</h2>
            <ul className="mt-3 space-y-3">
              {profileData.recentTips.map((tip) => (
                <li key={tip.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {tip.tipperName || 'Anonymous'} tipped {tip.amount.toFixed(2)} XLM
                  </p>
                  <p className="text-xs text-gray-600">{new Date(tip.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfilePage;
