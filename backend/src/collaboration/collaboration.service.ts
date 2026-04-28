import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import {
  Collaboration,
  ApprovalStatus,
} from "./entities/collaboration.entity";
import { Track } from "../tracks/entities/track.entity";
import { Artist } from "../artists/entities/artist.entity";
import { UpdateCollaborationDto } from "./dto/update-collaboration.dto";
import { UpdateApprovalDto } from "./dto/update-approval.dto";
import { InviteCollaboratorsDto } from "./dto/invite-collaborators.dto";
import { CollaborationSplitPolicy } from "./collaboration-split-policy";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class CollaborationService {
  constructor(
    @InjectRepository(Collaboration)
    private collaborationRepo: Repository<Collaboration>,
    @InjectRepository(Track)
    private trackRepo: Repository<Track>,
    @InjectRepository(Artist)
    private artistRepo: Repository<Artist>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private collaborationOutboxService: CollaborationOutboxService,
    private collaborationSplitPolicy: CollaborationSplitPolicy,
    private eventEmitter: EventEmitter2,
  ) {}

  async inviteCollaborators(
    userId: string,
    dto: InviteCollaboratorsDto,
  ): Promise<Collaboration[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify track ownership
      const track = await this.trackRepo.findOne({
        where: { id: dto.trackId },
        relations: ["artist"],
      });

      if (!track) {
        throw new NotFoundException("Track not found");
      }

      if (track.artist.userId !== userId) {
        throw new ForbiddenException(
          "Only track owner can invite collaborators",
        );
      }

      // Validate total split percentage using policy
      const newSplits = dto.collaborators.map(c => c.splitPercentage);
      await this.collaborationSplitPolicy.validateSplitReservation(dto.trackId, newSplits);

      // Create collaborations
      const collaborations: Collaboration[] = [];
      const inviteEvents: Array<{
        userId: string;
        trackId: string;
        trackTitle: string;
        invitedBy: string;
        role: string;
        splitPercentage: number;
        message?: string;
      }> = [];

      for (const collabDto of dto.collaborators) {
        // Validate split percentage bounds
        if (collabDto.splitPercentage < 0.01 || collabDto.splitPercentage > 100) {
          throw new BadRequestException(
            `Invalid split percentage: ${collabDto.splitPercentage}%. Must be between 0.01% and 100%`,
          );
        }

        // Verify artist exists
        const artist = await this.artistRepo.findOne({
          where: { id: collabDto.artistId },
        });

        if (!artist) {
          throw new NotFoundException(`Artist ${collabDto.artistId} not found`);
        }

        // Prevent self-invitation
        if (artist.userId === userId) {
          throw new BadRequestException("Cannot invite yourself as a collaborator");
        }

        // Check for duplicate invitation (including pending ones)
        const existing = await this.collaborationRepo.findOne({
          where: { trackId: dto.trackId, artistId: collabDto.artistId },
        });

        if (existing) {
          throw new BadRequestException(
            `Artist ${artist.artistName} is already invited or collaborating on this track`,
          );
        }

        const collaboration = this.collaborationRepo.create({
          trackId: dto.trackId,
          artistId: collabDto.artistId,
          role: collabDto.role,
          splitPercentage: collabDto.splitPercentage,
          invitationMessage: collabDto.invitationMessage,
          approvalStatus: ApprovalStatus.PENDING,
        });

        const saved = await queryRunner.manager.save(collaboration);
        collaborations.push(saved);

        // Queue notification for post-commit dispatch
        inviteEvents.push({
          userId: artist.userId,
          trackId: track.id,
          trackTitle: track.title,
          invitedBy: track.artist.artistName,
          role: collabDto.role,
          splitPercentage: collabDto.splitPercentage,
          message: collabDto.invitationMessage,
        });
      }

      await queryRunner.commitTransaction();

      // Queue notifications post-commit
      for (const event of inviteEvents) {
        await this.collaborationOutboxService.queueInviteNotification(event);
      }

      this.eventEmitter.emit("collaboration.invited", {
        trackId: dto.trackId,
        collaborations,
      });

      return collaborations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async respondToInvitation(
    userId: string,
    collaborationId: string,
    dto: UpdateCollaborationDto,
  ): Promise<Collaboration> {
    const collaboration = await this.collaborationRepo.findOne({
      where: { id: collaborationId },
      relations: ["artist", "track", "track.artist"],
    });

    if (!collaboration) {
      throw new NotFoundException("Collaboration not found");
    }

    if (collaboration.artist.userId !== userId) {
      throw new ForbiddenException(
        "Not authorized to respond to this invitation",
      );
    }

    if (collaboration.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException("Invitation already responded to");
    }

    // Validate rejection reason if rejecting
    if (dto.approvalStatus === ApprovalStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException("Rejection reason is required when declining an invitation");
    }

    collaboration.approvalStatus = dto.approvalStatus;
    collaboration.rejectionReason = dto.rejectionReason;
    collaboration.respondedAt = new Date();

    const updated = await this.collaborationRepo.save(collaboration);

    // If approving, re-validate total split allocation
    if (dto.approvalStatus === ApprovalStatus.APPROVED) {
      const allCollabs = await this.collaborationRepo.find({
        where: {
          trackId: collaboration.trackId,
          approvalStatus: In([ApprovalStatus.APPROVED, ApprovalStatus.PENDING]),
        },
      });

      const totalSplit = allCollabs.reduce(
        (sum, collab) => sum + Number(collab.splitPercentage),
        0,
      );

      if (totalSplit > 100) {
        // This should not happen if reservations are working, but safety check
        throw new BadRequestException(
          `Accepting this invitation would exceed total split limit. Total: ${totalSplit}%`,
        );
      }
    }

    // Queue notification post-commit
    await this.collaborationOutboxService.queueResponseNotification({
      collaborationId,
      userId: collaboration.track.artist.userId,
      collaboratorName: collaboration.artist.artistName,
      trackTitle: collaboration.track.title,
      status: dto.approvalStatus,
      reason: dto.rejectionReason,
    });

    this.eventEmitter.emit("collaboration.responded", {
      collaboration: updated,
      status: dto.approvalStatus,
    });

    return updated;
  }

  async updateCollaborationStatus(
    collaborationId: string,
    userId: string,
    dto: UpdateApprovalDto,
  ): Promise<Collaboration> {
    return this.respondToInvitation(userId, collaborationId, {
      approvalStatus: dto.status,
      rejectionReason: dto.rejectionReason,
    });
  }

  async getTrackCollaborators(trackId: string): Promise<Collaboration[]> {
    return this.collaborationRepo.find({
      where: { trackId },
      relations: ["artist"],
      order: { createdAt: "ASC" },
    });
  }

  async getArtistCollaborations(artistId: string): Promise<Collaboration[]> {
    return this.collaborationRepo.find({
      where: { artistId },
      relations: ["track", "track.artist"],
      order: { createdAt: "DESC" },
    });
  }

  async getPendingInvitations(userId: string): Promise<Collaboration[]> {
    const artist = await this.artistRepo.findOne({ where: { userId } });

    if (!artist) {
      return [];
    }

    return this.collaborationRepo.find({
      where: {
        artistId: artist.id,
        approvalStatus: ApprovalStatus.PENDING,
      },
      relations: ["track", "track.artist"],
      order: { createdAt: "DESC" },
    });
  }

  async removeCollaborator(
    userId: string,
    collaborationId: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const collaboration = await queryRunner.manager.findOne(Collaboration, {
        where: { id: collaborationId },
        relations: ["track", "track.artist"],
      });

      if (!collaboration) {
        throw new NotFoundException("Collaboration not found");
      }

      // Only track owner can remove collaborators
      if (collaboration.track.artist.userId !== userId) {
        throw new ForbiddenException("Only track owner can remove collaborators");
      }

      // Cannot remove approved collaborators if they have pending revenue
      if (collaboration.approvalStatus === ApprovalStatus.APPROVED) {
        // Add additional business logic here if needed
        // For now, allow removal but log the event
        this.eventEmitter.emit("collaboration.approved_removed", {
          collaboration,
          removedBy: userId,
        });
      }

      await queryRunner.manager.remove(collaboration);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit("collaboration.removed", {
        collaborationId,
        trackId: collaboration.trackId,
        removedBy: userId,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async validateSplitPercentages(trackId: string): Promise<{
    isValid: boolean;
    total: number;
    remaining: number;
  }> {
    const collaborations = await this.collaborationRepo.find({
      where: { trackId, approvalStatus: ApprovalStatus.APPROVED },
    });

    const total = collaborations.reduce(
      (sum, collab) => sum + Number(collab.splitPercentage),
      0,
    );

    return {
      isValid: total <= 100,
      total,
      remaining: 100 - total,
    };
  }

  async getCollaborationStats(trackId: string) {
    const collaborations = await this.getTrackCollaborators(trackId);

    return {
      total: collaborations.length,
      approved: collaborations.filter(
        (c) => c.approvalStatus === ApprovalStatus.APPROVED,
      ).length,
      pending: collaborations.filter(
        (c) => c.approvalStatus === ApprovalStatus.PENDING,
      ).length,
      rejected: collaborations.filter(
        (c) => c.approvalStatus === ApprovalStatus.REJECTED,
      ).length,
      splitAllocated: collaborations
        .filter((c) => c.approvalStatus === ApprovalStatus.APPROVED)
        .reduce((sum, c) => sum + Number(c.splitPercentage), 0),
    };
  }
}
