import { VerificationStatus, VerificationDocument, SocialProof } from '../entities/verification-request.entity';

export class VerificationResponseDto {
  id: string;
  artistId: string;
  status: VerificationStatus;
  documents: VerificationDocument[];
  socialProof: SocialProof[];
  additionalInfo?: string;
  reviewedById?: string;
  reviewNotes?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  updatedAt: Date;
}

export class ArtistVerificationStatusDto {
  isVerified: boolean;
  hasPendingRequest: boolean;
  requestId?: string;
  status?: VerificationStatus;
}
