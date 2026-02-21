import React from 'react';

interface ArtistHeaderProps {
  artistName: string;
  coverImage: string;
  profileImage: string;
  followerCount: number;
  isFollowing: boolean;
  isFollowPending?: boolean;
  onFollowToggle: () => void;
  onShare: () => void;
  shareStatus?: string | null;
}

const ArtistHeader: React.FC<ArtistHeaderProps> = ({
  artistName,
  coverImage,
  profileImage,
  followerCount,
  isFollowing,
  isFollowPending = false,
  onFollowToggle,
  onShare,
  shareStatus,
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div
        className="h-36 w-full bg-cover bg-center sm:h-48"
        style={{ backgroundImage: `url(${coverImage})` }}
        aria-label={`${artistName} cover image`}
      />
      <div className="px-4 pb-4 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <img
              src={profileImage}
              alt={`${artistName} profile`}
              className="h-24 w-24 rounded-full border-4 border-white object-cover sm:h-28 sm:w-28"
            />
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-gray-900">{artistName}</h1>
              <p className="text-sm text-gray-600">{followerCount.toLocaleString()} followers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onFollowToggle}
              disabled={isFollowPending}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                isFollowing ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {isFollowPending ? 'Updating...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            <button
              onClick={onShare}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Share Profile
            </button>
          </div>
        </div>
        {shareStatus ? <p className="mt-3 text-sm text-green-700">{shareStatus}</p> : null}
      </div>
    </section>
  );
};

export default ArtistHeader;
