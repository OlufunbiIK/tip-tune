import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('collaborations')
@UseGuards(AuthGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
  ) {}

  /**
   * Invite an artist to collaborate on a track
   * Only primary artist can do this
   */
  @Post('tracks/:trackId/invite')
  inviteCollaborator(
    @Param('trackId') trackId: string,
    @Body() dto: InviteCollaboratorDto,
    @Req() req,
  ) {
    return this.collaborationService.inviteCollaborator(
      trackId,
      req.user.id,
      dto,
    );
  }

  /**
   * Approve or reject a collaboration invite
   */
  @Patch(':collaborationId/approval')
  updateApprovalStatus(
    @Param('collaborationId') collaborationId: string,
    @Body() dto: UpdateApprovalDto,
    @Req() req,
  ) {
    return this.collaborationService.updateApprovalStatus(
      collaborationId,
      req.user.id,
      dto.status,
    );
  }

  /**
   * Get all collaborations for a track
   */
  @Get('tracks/:trackId')
  getTrackCollaborations(
    @Param('trackId') trackId: string,
  ) {
    return this.collaborationService.getCollaborationsByTrack(trackId);
  }
}
