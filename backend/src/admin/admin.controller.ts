import {
  Controller,
  Get,
  Put,
  Post, // <-- Added Post here
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { RequirePermission } from './decorators/require-permission.decorator';
import { PERMISSIONS } from './constants/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserFilterDto } from './dto/user-filter.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

// --- NEW IMPORT FOR ISSUE #205 ---
import { TipReconciliationService } from '../tips/tip-reconciliation.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    // --- NEW INJECTION FOR ISSUE #205 ---
    private readonly reconciliationService: TipReconciliationService,
  ) {}

  @Get('stats/overview')
  @RequirePermission(PERMISSIONS.VIEW_STATS)
  async getOverviewStats() {
    return this.adminService.getOverviewStats();
  }

  @Get('users')
  @RequirePermission(PERMISSIONS.VIEW_USERS)
  async getUsers(@Query() filterDto: UserFilterDto) {
    return this.adminService.getUsers(filterDto);
  }

  @Put('users/:userId/ban')
  @RequirePermission(PERMISSIONS.BAN_USERS)
  async banUser(
    @Param('userId') userId: string,
    @Body() banDto: BanUserDto,
    @CurrentUser() admin: User,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.adminService.banUser(userId, banDto, admin.id, ipAddress);
  }

  @Put('users/:userId/unban')
  @RequirePermission(PERMISSIONS.UNBAN_USERS)
  async unbanUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: User,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.adminService.unbanUser(userId, admin.id, ipAddress);
  }

  @Put('artists/:artistId/verify')
  @RequirePermission(PERMISSIONS.VERIFY_ARTISTS)
  async verifyArtist(
    @Param('artistId') artistId: string,
    @CurrentUser() admin: User,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.adminService.verifyArtist(artistId, admin.id, ipAddress);
  }

  @Put('artists/:artistId/unverify')
  @RequirePermission(PERMISSIONS.UNVERIFY_ARTISTS)
  async unverifyArtist(
    @Param('artistId') artistId: string,
    @CurrentUser() admin: User,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.adminService.unverifyArtist(artistId, admin.id, ipAddress);
  }

  @Delete('tracks/:trackId')
  @RequirePermission(PERMISSIONS.REMOVE_TRACKS)
  async removeTrack(
    @Param('trackId') trackId: string,
    @Body('reason') reason: string,
    @CurrentUser() admin: User,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.adminService.removeTrack(trackId, reason, admin.id, ipAddress);
  }

  @Get('reports/pending')
  @RequirePermission(PERMISSIONS.VIEW_REPORTS)
  async getPendingReports() {
    return this.adminService.getPendingReports();
  }

  @Put('reports/:reportId/resolve')
  @RequirePermission(PERMISSIONS.RESOLVE_REPORTS)
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() resolveDto: ResolveReportDto,
    @CurrentUser() admin: User,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.adminService.resolveReport(
      reportId,
      resolveDto,
      admin.id,
      ipAddress,
    );
  }

  @Get('audit-logs')
  @RequirePermission(PERMISSIONS.VIEW_AUDIT_LOGS)
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit);
  }

  @Post('reconcile/tracks')
  // Optional: Add a @RequirePermission() decorator here if you have a specific permission for this
  async triggerFullReconciliation() {
    this.reconciliationService.reconcileAllTracks();
    return { message: 'Full track reconciliation process started in the background.' };
  }

  @Post('reconcile/tracks/:trackId')
  async triggerSingleReconciliation(@Param('trackId') trackId: string) {
    await this.reconciliationService.reconcileTrack(trackId);
    return { message: `Reconciliation completed for track ${trackId}.` };
  }

  @Get('reconcile/discrepancies')
  async getDiscrepancies() {
    const discrepancies = await this.reconciliationService.findDiscrepancies();
    return { 
      count: discrepancies.length,
      discrepancies 
    };
  }
}