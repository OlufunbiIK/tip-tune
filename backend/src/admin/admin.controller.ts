import {
  Controller,
  Get,
  Put,
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

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
