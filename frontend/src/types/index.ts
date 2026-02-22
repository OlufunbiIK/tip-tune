// Common types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Track types
export interface Track {
  id: string;
  // artist: string;
  title: string;
  coverArt: string;
  plays: number;
  artistId?: string;
  tips: number;
  artist: ArtistSummary;
  filename?: string;
  url?: string;
  streamingUrl?: string;
  fileSize?: bigint;
  mimeType?: string;
  duration?: number;
  isPublic?: boolean;
  description?: string;
  genre?: string;
  album?: string;
  playCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Tip types
export enum TipStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Tip {
  id: string;
  tipperName: string;
  tipperAvatar: string;
  amount: number;
  message: string;
  timestamp: string; // ISO 8601 string from API
  trackId?: string; // UUID string matching Track.id
}

/** Extended tip for history page: amount in asset, USD, track, Stellar link */
export interface TipHistoryItem extends Tip {
  stellarTxHash?: string;
  assetCode?: string;
  usdAmount?: number;
  trackTitle?: string;
  /** For "Sent" tab: artist name; for "Received" tab: tipper is already shown */
  artistName?: string;
}

// User types
export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  createdAt: string;
}

// Artist types
export interface Artist {
  id: string;
  userId: string;
  walletAddress: string;
  artistName: string;
  genre?: string;
  bio?: string;
  profileImage?: string;
  coverImage?: string;
  totalTipsReceived?: string;
  emailNotifications?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Gamification Types
export enum BadgeCategory {
  TIPPER = 'tipper',
  ARTIST = 'artist',
  SPECIAL = 'special',
}

export enum BadgeTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  imageUrl: string | null;
  criteria: Record<string, any>;
  nftAssetCode: string | null;
  createdAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  nftTxHash: string | null;
  badge: Badge; // When relations are loaded
}

export interface ArtistSummary {
  id: string;
  artistName: string;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
  track?: Track;
}

export interface SmartPlaylist {
  id: string;
  playlistId: string;
  criteria: Record<string, any>;
  autoUpdate: boolean;
  lastUpdated?: string | null;
}

export type PlaylistCollaboratorRole = 'owner' | 'editor' | 'viewer';
export type PlaylistCollaboratorStatus = 'pending' | 'accepted';

export interface PlaylistCollaborator {
  id: string;
  playlistId: string;
  userId: string;
  role: PlaylistCollaboratorRole;
  status: PlaylistCollaboratorStatus;
  invitedAt: string;
  acceptedAt?: string | null;
  user?: User;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  approvalRequired: boolean;
  coverImage?: string;
  trackCount: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  playlistTracks?: PlaylistTrack[];
  smartPlaylist?: SmartPlaylist | null;
}

export type PlaylistChangeAction = 'add_track' | 'remove_track' | 'reorder_tracks';
export type PlaylistChangeStatus = 'pending' | 'approved' | 'rejected';

export interface PlaylistChangeRequest {
  id: string;
  playlistId: string;
  requestedById: string;
  action: PlaylistChangeAction;
  payload: Record<string, any>;
  status: PlaylistChangeStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  requestedBy?: User;
  reviewedBy?: User | null;
}

export type ActivityType =
  | 'new_track'
  | 'tip_sent'
  | 'tip_received'
  | 'artist_followed'
  | 'new_follower'
  | 'playlist_track_added'
  | 'playlist_track_removed'
  | 'playlist_collaborator_invited'
  | 'playlist_collaborator_accepted'
  | 'playlist_collaborator_rejected'
  | 'playlist_collaborator_role_updated'
  | 'playlist_collaborator_removed'
  | 'playlist_change_requested'
  | 'playlist_change_approved'
  | 'playlist_change_rejected'
  | 'smart_playlist_refreshed';

export type EntityType = 'track' | 'tip' | 'artist' | 'playlist' | 'smart_playlist';

export interface Activity {
  id: string;
  userId: string;
  activityType: ActivityType;
  entityType: EntityType;
  entityId: string;
  metadata?: Record<string, any>;
  isSeen?: boolean;
  createdAt: string;
  user?: User;
}

export interface ActivityFeedResponse {
  data: Activity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    unseenCount: number;
  };
}

// FIX: Import React to resolve 'React' namespace error.
import React from 'react';

export interface StatCardData {
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  icon: React.ReactNode;
}

export interface ChartDataPoint {
  date: string;
  tips: number;
}

// export interface Track {
//   id: number;
//   title: string;
//   artist: string;
//   coverArt: string;
//   plays: number;
//   tips: number;
// }


export interface UserProfile {
  name: string;
  bio: string;
  avatar: string;
  walletAddress: string;
}