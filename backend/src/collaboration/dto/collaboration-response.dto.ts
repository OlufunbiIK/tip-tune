import {
  CollaborationRole,
  ApprovalStatus,
} from "../entities/collaboration.entity";

export class CollaborationResponseDto {
  id: string;
  trackId: string;
  artistId: string;
  artistName: string;
  artistUsername: string;
  role: CollaborationRole;
  splitPercentage: number;
  approvalStatus: ApprovalStatus;
  invitationMessage?: string;
  rejectionReason?: string;
  respondedAt?: Date;
  createdAt: Date;
}
