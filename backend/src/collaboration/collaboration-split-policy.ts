import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Collaboration, ApprovalStatus } from './entities/collaboration.entity';

@Injectable()
export class CollaborationSplitPolicy {
  constructor(
    @InjectRepository(Collaboration)
    private collaborationRepo: Repository<Collaboration>,
  ) {}

  /**
   * Validate that adding new splits won't exceed 100% total
   * Includes both approved and pending collaborations
   */
  async validateSplitReservation(
    trackId: string,
    newSplits: number[],
  ): Promise<void> {
    const existingCollabs = await this.collaborationRepo.find({
      where: {
        trackId,
        approvalStatus: In([ApprovalStatus.APPROVED, ApprovalStatus.PENDING]),
      },
    });

    const existingSplit = existingCollabs.reduce(
      (sum, collab) => sum + Number(collab.splitPercentage),
      0,
    );

    const newSplit = newSplits.reduce((sum, split) => sum + split, 0);
    const totalSplit = existingSplit + newSplit;

    if (totalSplit > 100) {
      throw new BadRequestException(
        `Total split percentage (${totalSplit}%) exceeds 100%. Remaining: ${100 - existingSplit}%`,
      );
    }

    // Ensure primary artist retains minimum split
    const primaryArtistSplit = 100 - totalSplit;
    if (primaryArtistSplit < 0.01) {
      throw new BadRequestException(
        'Primary artist must retain at least 0.01% of split',
      );
    }
  }

  /**
   * Get current reserved split percentage for a track
   */
  async getReservedSplit(trackId: string): Promise<number> {
    const collabs = await this.collaborationRepo.find({
      where: {
        trackId,
        approvalStatus: In([ApprovalStatus.APPROVED, ApprovalStatus.PENDING]),
      },
    });

    return collabs.reduce(
      (sum, collab) => sum + Number(collab.splitPercentage),
      0,
    );
  }

  /**
   * Get available split percentage for new invitations
   */
  async getAvailableSplit(trackId: string): Promise<number> {
    const reserved = await this.getReservedSplit(trackId);
    return Math.max(0, 100 - reserved);
  }
}