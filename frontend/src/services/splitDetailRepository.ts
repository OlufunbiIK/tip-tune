/**
 * Split Detail Repository
 * 
 * This repository provides a single typed contract for fetching split detail data.
 * It hides the complexity of:
 * - Profile hydration
 * - Receipt lookup
 * - Activity mapping
 * - Signed URL generation
 * - Participant directory fallbacks
 * 
 * The page consumes one normalized view model instead of coordinating raw API fan-out.
 */

import apiClient from '../utils/api-client';
import { sessionManager } from '../utils/session';

// ============================================================================
// Types
// ============================================================================

export interface SplitDetailViewModel {
  /** The split/collaboration data */
  split: SplitDetail;
  /** Hydrated profiles for all participants */
  profiles: Record<string, ParticipantProfile>;
  /** Receipt data if available */
  receipts?: Record<string, ReceiptData>;
  /** Activity feed for this split */
  activities: Activity[];
  /** Signed URLs for any associated assets */
  signedUrls?: Record<string, string>;
  /** Metadata about the fetch operation */
  meta: {
    hasMissingProfiles: boolean;
    hasMissingReceipts: boolean;
    activityFetchFailed: boolean;
    participantNamesResolved: boolean;
  };
}

export interface SplitDetail {
  id: string;
  trackId: string;
  track?: any;
  collaborators: CollaboratorSplit[];
  totalSplitPercentage: number;
  remainingSplitPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorSplit {
  id: string;
  artistId: string;
  artistName?: string;
  role: string;
  splitPercentage: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  invitationMessage?: string;
  rejectionReason?: string;
  respondedAt?: string;
  artist?: any;
}

export interface ParticipantProfile {
  id: string;
  name: string;
  avatar?: string;
  walletAddress?: string;
  bio?: string;
  profileImage?: string;
}

export interface ReceiptData {
  id: string;
  amount: number;
  assetCode: string;
  stellarTxHash?: string;
  timestamp: string;
  status: 'pending' | 'verified' | 'failed' | 'reversed';
}

export interface Activity {
  id: string;
  type: string;
  actorId: string;
  actorName?: string;
  targetId: string;
  description: string;
  timestamp: string;
}

export interface SplitDetailRepositoryOptions {
  /** Whether to fetch activities */
  includeActivities?: boolean;
  /** Whether to fetch receipts */
  includeReceipts?: boolean;
  /** Whether to generate signed URLs */
  includeSignedUrls?: boolean;
  /** Whether to use session fallback for missing profiles */
  useSessionFallback?: boolean;
}

// ============================================================================
// Repository Implementation
// ============================================================================

class SplitDetailRepository {
  /**
   * Fetch split detail with all related data in a single operation
   */
  async getSplitDetail(
    splitId: string,
    options: SplitDetailRepositoryOptions = {}
  ): Promise<SplitDetailViewModel> {
    const {
      includeActivities = true,
      includeReceipts = true,
      includeSignedUrls = false,
      useSessionFallback = true,
    } = options;

    // Fetch all data in parallel using Promise.allSettled
    const results = await Promise.allSettled([
      this.fetchSplitData(splitId),
      includeActivities ? this.fetchActivities(splitId) : Promise.resolve([]),
      includeReceipts ? this.fetchReceipts(splitId) : Promise.resolve({}),
      includeSignedUrls ? this.fetchSignedUrls(splitId) : Promise.resolve({}),
    ]);

    // Extract results with error handling
    const splitResult = results[0];
    const activitiesResult = results[1];
    const receiptsResult = results[2];
    const signedUrlsResult = results[3];

    // Extract split data
    const split = splitResult.status === 'fulfilled' ? splitResult.value : null;
    if (!split) {
      throw new Error('Failed to fetch split data');
    }

    // Extract activities with fallback
    const activities = activitiesResult.status === 'fulfilled' ? activitiesResult.value : [];
    const activityFetchFailed = activitiesResult.status === 'rejected';

    // Extract receipts with fallback
    const receipts = receiptsResult.status === 'fulfilled' ? receiptsResult.value : {};
    const hasMissingReceipts = receiptsResult.status === 'rejected';

    // Extract signed URLs with fallback
    const signedUrls = signedUrlsResult.status === 'fulfilled' ? signedUrlsResult.value : undefined;

    // Hydrate profiles for all collaborators
    const profiles = await this.hydrateProfiles(split.collaborators, useSessionFallback);
    const hasMissingProfiles = Object.values(profiles).some(p => !p);

    // Resolve participant names from session if needed
    const participantNamesResolved = this.resolveParticipantNames(split.collaborators, profiles);

    // Enhance activities with actor names
    const enhancedActivities = this.enhanceActivities(activities, profiles, useSessionFallback);

    return {
      split,
      profiles,
      receipts,
      activities: enhancedActivities,
      signedUrls,
      meta: {
        hasMissingProfiles,
        hasMissingReceipts,
        activityFetchFailed,
        participantNamesResolved,
      },
    };
  }

  /**
   * Fetch base split data from API
   */
  private async fetchSplitData(splitId: string): Promise<SplitDetail> {
    const response = await apiClient.get(`/collaborations/${splitId}`);
    const data = response.data;

    // Transform API response to SplitDetail
    const collaborators: CollaboratorSplit[] = data.collaborators?.map((collab: {
      id: string;
      artistId: string;
      role: string;
      splitPercentage: number;
      approvalStatus: string;
      invitationMessage?: string;
      rejectionReason?: string;
      respondedAt?: string;
      artist?: {
        id: string;
        artistName: string;
        profileImage?: string;
        walletAddress?: string;
      };
    }) => ({
      id: collab.id,
      artistId: collab.artistId,
      artistName: collab.artist?.artistName,
      role: collab.role,
      splitPercentage: Number(collab.splitPercentage),
      approvalStatus: collab.approvalStatus,
      invitationMessage: collab.invitationMessage,
      rejectionReason: collab.rejectionReason,
      respondedAt: collab.respondedAt,
      artist: collab.artist,
    })) || [];

    const totalSplitPercentage = collaborators.reduce(
      (sum: number, collab: CollaboratorSplit) => sum + collab.splitPercentage,
      0
    );

    return {
      id: data.id,
      trackId: data.trackId,
      track: data.track,
      collaborators,
      totalSplitPercentage,
      remainingSplitPercentage: 100 - totalSplitPercentage,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /**
   * Fetch activity feed for this split
   */
  private async fetchActivities(splitId: string): Promise<Activity[]> {
    const response = await apiClient.get(`/collaborations/${splitId}/activities`);
    return response.data?.map((activity: {
      id: string;
      type: string;
      actorId: string;
      actorName?: string;
      targetId: string;
      description: string;
      timestamp: string;
    }) => ({
      id: activity.id,
      type: activity.type,
      actorId: activity.actorId,
      actorName: activity.actorName,
      targetId: activity.targetId,
      description: activity.description,
      timestamp: activity.timestamp,
    })) || [];
  }

  /**
   * Fetch receipt data for this split
   */
  private async fetchReceipts(splitId: string): Promise<Record<string, ReceiptData>> {
    const response = await apiClient.get(`/collaborations/${splitId}/receipts`);
    const receipts: Record<string, ReceiptData> = {};
    
    response.data?.forEach((receipt: {
      id: string;
      amount: number;
      assetCode: string;
      stellarTxHash: string;
      timestamp: string;
      status: string;
    }) => {
      receipts[receipt.id] = {
        id: receipt.id,
        amount: Number(receipt.amount),
        assetCode: receipt.assetCode,
        stellarTxHash: receipt.stellarTxHash,
        timestamp: receipt.timestamp,
        status: receipt.status as 'pending' | 'verified' | 'failed' | 'reversed',
      };
    });

    return receipts;
  }

  /**
   * Fetch signed URLs for assets
   */
  private async fetchSignedUrls(splitId: string): Promise<Record<string, string>> {
    const response = await apiClient.get(`/collaborations/${splitId}/signed-urls`);
    return response.data || {};
  }

  /**
   * Hydrate profiles for all collaborators
   */
  private async hydrateProfiles(
    collaborators: CollaboratorSplit[],
    useSessionFallback: boolean
  ): Promise<Record<string, ParticipantProfile>> {
    const profiles: Record<string, ParticipantProfile> = {};

    // Fetch profiles in parallel
    const profilePromises = collaborators.map(async (collab) => {
      try {
        const response = await apiClient.get(`/artists/${collab.artistId}`);
        const artist = response.data;

        // Update session manager with fetched profile
        if (useSessionFallback) {
          sessionManager.upsertParticipant({
            id: artist.id,
            name: artist.artistName,
            avatar: artist.profileImage,
            walletAddress: artist.walletAddress,
          });
        }

        return {
          id: artist.id,
          name: artist.artistName,
          avatar: artist.profileImage,
          walletAddress: artist.walletAddress,
          bio: artist.bio,
          profileImage: artist.profileImage,
        };
      } catch (error: unknown) {
        // Fallback to session if available
        if (useSessionFallback) {
          const sessionParticipant = sessionManager.getParticipant(collab.artistId);
          if (sessionParticipant) {
            return {
              id: sessionParticipant.id,
              name: sessionParticipant.name,
              avatar: sessionParticipant.avatar,
              walletAddress: sessionParticipant.walletAddress,
            };
          }
        }
        return null;
      }
    });

    const results = await Promise.allSettled(profilePromises);

    collaborators.forEach((collab, index) => {
      const result = results[index];
      if (result.status === 'fulfilled' && result.value) {
        profiles[collab.artistId] = result.value;
      } else {
        // Use session fallback as last resort
        const sessionParticipant = sessionManager.getParticipant(collab.artistId);
        if (sessionParticipant) {
          profiles[collab.artistId] = {
            id: sessionParticipant.id,
            name: sessionParticipant.name,
            avatar: sessionParticipant.avatar,
            walletAddress: sessionParticipant.walletAddress,
          };
        }
      }
    });

    return profiles;
  }

  /**
   * Resolve participant names from session for missing profiles
   */
  private resolveParticipantNames(
    collaborators: CollaboratorSplit[],
    profiles: Record<string, ParticipantProfile>
  ): boolean {
    let resolved = false;

    collaborators.forEach((collab) => {
      if (!profiles[collab.artistId]) {
        const sessionName = sessionManager.getParticipantName(collab.artistId);
        if (sessionName && sessionName !== 'Unknown') {
          profiles[collab.artistId] = {
            id: collab.artistId,
            name: sessionName,
          };
          resolved = true;
        }
      }
    });

    return resolved;
  }

  /**
   * Enhance activities with actor names from profiles or session
   */
  private enhanceActivities(
    activities: Activity[],
    profiles: Record<string, ParticipantProfile>,
    useSessionFallback: boolean
  ): Activity[] {
    return activities.map((activity) => {
      if (!activity.actorName) {
        // Try to get name from profiles
        const profile = profiles[activity.actorId];
        if (profile) {
          return { ...activity, actorName: profile.name };
        }

        // Fallback to session
        if (useSessionFallback) {
          const sessionName = sessionManager.getParticipantName(activity.actorId);
          if (sessionName && sessionName !== 'Unknown') {
            return { ...activity, actorName: sessionName };
          }
        }
      }

      return activity;
    });
  }
}

// Export singleton instance
export const splitDetailRepository = new SplitDetailRepository();
