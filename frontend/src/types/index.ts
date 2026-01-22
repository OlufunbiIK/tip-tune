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
  title: string;
  artist?: string;
  filename: string;
  url: string;
  streamingUrl: string;
  fileSize: bigint;
  mimeType: string;
  duration?: number;
  isPublic: boolean;
  description?: string;
  genre?: string;
  album?: string;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

// Tip types
export enum TipStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Tip {
  id: string;
  fromUserId: string;
  toArtistId: string;
  trackId?: string;
  amount: number;
  usdValue: number;
  stellarTxHash: string;
  status: TipStatus;
  message?: string;
  createdAt: string;
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
  walletAddress: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}
