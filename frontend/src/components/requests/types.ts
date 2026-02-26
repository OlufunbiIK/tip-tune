export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'played' | 'expired';

export interface SongRequest {
  id: string;
  trackId: string;
  trackTitle: string;
  tipAmount: number;
  assetCode: string;
  fanName: string;
  fanAvatar?: string;
  message?: string;
  createdAt: string;
  expiresAt: string;
  status: RequestStatus;
}

