import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '../components';
import RoleBadge from '../components/playlists/RoleBadge';
import { playlistService } from '../services/playlistService';
import {
  Activity,
  Playlist,
  PlaylistChangeRequest,
  PlaylistCollaborator,
  PlaylistCollaboratorRole,
  Track,
} from '../types';
import { getCurrentUserId } from '../utils/auth';

const formatDuration = (duration: number) => {
  if (!duration) {
    return '0:00';
  }
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getActivityLabel = (activity: Activity) => {
  const labels: Record<string, string> = {
    playlist_track_added: 'Added track',
    playlist_track_removed: 'Removed track',
    playlist_collaborator_invited: 'Invited collaborator',
    playlist_collaborator_accepted: 'Collaborator accepted',
    playlist_collaborator_rejected: 'Collaborator rejected',
    playlist_collaborator_role_updated: 'Updated collaborator role',
    playlist_collaborator_removed: 'Removed collaborator',
    playlist_change_requested: 'Change requested',
    playlist_change_approved: 'Change approved',
    playlist_change_rejected: 'Change rejected',
    smart_playlist_refreshed: 'Smart playlist refreshed',
  };
  return labels[activity.activityType] || activity.activityType;
};

const formatCriteria = (criteria?: Record<string, any>) => {
  if (!criteria) {
    return 'No criteria available.';
  }
  switch (criteria.type) {
    case 'genre':
      return `Genres: ${(criteria.genres || []).join(', ')}`;
    case 'artist':
      return `Artists: ${(criteria.artistIds || []).join(', ')}`;
    case 'date_range':
      return `Date range: ${criteria.from || 'Any'} to ${criteria.to || 'Any'}`;
    case 'most_tipped':
      return 'Most tipped tracks';
    case 'recently_played':
      return 'Recently played tracks';
    case 'followed_artists_latest':
      return 'Latest tracks from followed artists';
    default:
      return 'Custom criteria';
  }
};

const PlaylistDetailPage = () => {
  const { id } = useParams();
  const currentUserId = getCurrentUserId();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [collaborators, setCollaborators] = useState<PlaylistCollaborator[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [changeRequests, setChangeRequests] = useState<PlaylistChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [trackId, setTrackId] = useState('');
  const [trackPosition, setTrackPosition] = useState('');
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<PlaylistCollaboratorRole>('viewer');

  const role = useMemo(() => {
    if (!playlist) {
      return null;
    }
    if (currentUserId && playlist.userId === currentUserId) {
      return 'owner';
    }
    const collaborator = collaborators.find(
      (item) => item.userId === currentUserId && item.status === 'accepted',
    );
    return collaborator?.role || null;
  }, [playlist, collaborators, currentUserId]);

  const canEdit = role === 'owner' || role === 'editor';
  const canManage = role === 'owner';
  const isSmartPlaylist = Boolean(playlist?.smartPlaylist);

  const loadPlaylist = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const [playlistData, collaboratorData, activityData] = await Promise.all([
        playlistService.getById(id),
        playlistService.listCollaborators(id),
        playlistService.getActivities(id),
      ]);

      setPlaylist(playlistData);
      setCollaborators(collaboratorData);
      setActivities(activityData.data);

      if (playlistData.approvalRequired && playlistData.userId === currentUserId) {
        const requests = await playlistService.listChangeRequests(id, 'pending');
        setChangeRequests(requests);
      } else {
        setChangeRequests([]);
      }
    } catch (error) {
      setNotice('Failed to load playlist details.');
    } finally {
      setLoading(false);
    }
  }, [id, currentUserId]);

  const isChangeRequest = (
    value: Playlist | PlaylistChangeRequest,
  ): value is PlaylistChangeRequest => {
    return (value as PlaylistChangeRequest).action !== undefined;
  };

  const handleAddTrack = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !trackId) {
      return;
    }
    try {
      const payload: { trackId: string; position?: number } = { trackId };
      if (trackPosition) {
        payload.position = Number(trackPosition);
      }
      const result = await playlistService.addTrack(id, payload);
      if (isChangeRequest(result)) {
        setNotice('Change request submitted for approval.');
      } else {
        setNotice('Track added to playlist.');
      }
      setTrackId('');
      setTrackPosition('');
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to add track.');
    }
  };

  const handleRemoveTrack = async (track: Track) => {
    if (!id || !track.id) {
      return;
    }
    try {
      const result = await playlistService.removeTrack(id, track.id);
      if (isChangeRequest(result)) {
        setNotice('Change request submitted for approval.');
      } else {
        setNotice('Track removed from playlist.');
      }
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to remove track.');
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !inviteIdentifier.trim()) {
      return;
    }
    try {
      await playlistService.inviteCollaborator(id, inviteIdentifier.trim(), inviteRole);
      setInviteIdentifier('');
      setInviteRole('viewer');
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to invite collaborator.');
    }
  };

  const handleRoleChange = async (
    collaboratorId: string,
    nextRole: PlaylistCollaboratorRole,
  ) => {
    if (!id) {
      return;
    }
    try {
      await playlistService.updateCollaboratorRole(id, collaboratorId, nextRole);
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to update collaborator role.');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!id) {
      return;
    }
    try {
      await playlistService.removeCollaborator(id, collaboratorId);
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to remove collaborator.');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!id) {
      return;
    }
    try {
      await playlistService.approveChangeRequest(id, requestId);
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to approve change request.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!id) {
      return;
    }
    try {
      await playlistService.rejectChangeRequest(id, requestId);
      await loadPlaylist();
    } catch (error) {
      setNotice('Unable to reject change request.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy text-white p-6">
        <p className="text-ice-blue">Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-navy text-white p-6">
        <p className="text-red-400">Playlist not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-white/10 bg-navy-light">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/playlists" className="text-xl font-bold">
            Back to Playlists
          </Link>
          {isSmartPlaylist && (
            <span className="text-xs px-3 py-1 rounded-full border border-mint/40 text-mint uppercase tracking-wide">
              Smart Playlist
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-3 mb-6">
          <h1 className="text-3xl font-bold">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-white/70">{playlist.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-ice-blue">
            <span>{playlist.trackCount} tracks</span>
            <span>{formatDuration(playlist.totalDuration)}</span>
            {playlist.approvalRequired && (
              <span className="text-gold">Approval required</span>
            )}
            {role && (
              <span className="text-white/70">Your role: {role}</span>
            )}
          </div>
          {playlist.smartPlaylist && (
            <Card className="bg-white/5">
              <p className="text-sm text-ice-blue">Criteria</p>
              <p className="text-sm">{formatCriteria(playlist.smartPlaylist.criteria)}</p>
            </Card>
          )}
        </div>

        {notice && (
          <div className="mb-6 text-sm text-mint">{notice}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Tracks</h2>
                <span className="text-xs text-white/60">
                  {isSmartPlaylist ? 'Auto-generated' : 'Manual edits allowed'}
                </span>
              </div>

              <form
                onSubmit={handleAddTrack}
                className="flex flex-col gap-3 mb-6"
              >
                <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
                  <input
                    type="text"
                    placeholder="Track ID"
                    value={trackId}
                    onChange={(event) => setTrackId(event.target.value)}
                    className="rounded-md bg-white/10 border border-white/10 px-3 py-2 text-sm text-white"
                    disabled={!canEdit || isSmartPlaylist}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Position"
                    value={trackPosition}
                    onChange={(event) => setTrackPosition(event.target.value)}
                    className="rounded-md bg-white/10 border border-white/10 px-3 py-2 text-sm text-white"
                    disabled={!canEdit || isSmartPlaylist}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!canEdit || isSmartPlaylist}
                  >
                    Add Track
                  </Button>
                </div>
                {!canEdit && (
                  <p className="text-xs text-white/50">
                    You do not have permission to edit this playlist.
                  </p>
                )}
                {isSmartPlaylist && (
                  <p className="text-xs text-white/50">
                    Smart playlists are read-only.
                  </p>
                )}
              </form>

              <div className="space-y-4">
                {(playlist.playlistTracks || []).map((playlistTrack) => {
                  const track = playlistTrack.track;
                  const artistName = track?.artist?.artistName || 'Unknown artist';
                  return (
                    <div
                      key={playlistTrack.id}
                      className="flex items-center justify-between border-b border-white/10 pb-3"
                    >
                      <div>
                        <p className="font-medium">{track?.title || 'Untitled'}</p>
                        <p className="text-xs text-white/60">{artistName}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit || isSmartPlaylist}
                        onClick={() => track && handleRemoveTrack(track)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
                {(playlist.playlistTracks || []).length === 0 && (
                  <p className="text-sm text-white/60">No tracks yet.</p>
                )}
              </div>
            </Card>

            {canManage && playlist.approvalRequired && (
              <Card>
                <h2 className="text-xl font-semibold mb-4">Pending Changes</h2>
                {changeRequests.length === 0 && (
                  <p className="text-sm text-white/60">No pending requests.</p>
                )}
                <div className="space-y-3">
                  {changeRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-2 border border-white/10 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {request.action.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-white/60">
                          {request.requestedBy?.username || request.requestedById}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="border-b border-white/10 pb-3"
                  >
                    <p className="text-sm font-medium">
                      {getActivityLabel(activity)}
                    </p>
                    <p className="text-xs text-white/60">
                      {activity.user?.username || activity.userId} ·{' '}
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                    {activity.metadata?.trackTitle && (
                      <p className="text-xs text-white/50">
                        {activity.metadata.trackTitle}
                      </p>
                    )}
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-white/60">No activity yet.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-xl font-semibold mb-4">Collaborators</h2>
              <div className="space-y-3">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex flex-col gap-2 border border-white/10 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {collaborator.user?.username || collaborator.userId}
                        </p>
                        <p className="text-xs text-white/60">
                          {collaborator.status === 'pending'
                            ? 'Invite pending'
                            : 'Active collaborator'}
                        </p>
                      </div>
                      <RoleBadge role={collaborator.role} />
                    </div>
                    {canManage && collaborator.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <select
                          value={collaborator.role}
                          onChange={(event) =>
                            handleRoleChange(
                              collaborator.id,
                              event.target.value as PlaylistCollaboratorRole,
                            )
                          }
                          className="rounded-md bg-white/10 border border-white/10 px-2 py-1 text-xs text-white"
                        >
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {collaborators.length === 0 && (
                  <p className="text-sm text-white/60">
                    No collaborators yet.
                  </p>
                )}
              </div>
            </Card>

            {canManage && (
              <Card>
                <h2 className="text-xl font-semibold mb-4">Invite Collaborator</h2>
                <form className="space-y-3" onSubmit={handleInvite}>
                  <input
                    type="text"
                    placeholder="Email or username"
                    value={inviteIdentifier}
                    onChange={(event) => setInviteIdentifier(event.target.value)}
                    className="w-full rounded-md bg-white/10 border border-white/10 px-3 py-2 text-sm text-white"
                  />
                  <select
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value as PlaylistCollaboratorRole)
                    }
                    className="w-full rounded-md bg-white/10 border border-white/10 px-3 py-2 text-sm text-white"
                  >
                    <option value="editor">editor</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <Button type="submit" size="sm">
                    Send Invite
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlaylistDetailPage;
