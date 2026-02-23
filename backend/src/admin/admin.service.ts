import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { Report } from '../reports/entities/report.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminRole } from './entities/admin-role.entity';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Artist)
    private artistRepository: Repository<Artist>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(AdminAuditLog)
    private auditLogRepository: Repository<AdminAuditLog>,
    @InjectRepository(AdminRole)
    private adminRoleRepository: Repository<AdminRole>,
  ) {}

  async getOverviewStats(): Promise<AdminStatsDto> {
    const totalUsers = await this.userRepository.count();
    const totalArtists = await this.artistRepository.count();
    const totalTracks = await this.trackRepository.count();

    const tipsResult = await this.userRepository.query(
      'SELECT COALESCE(SUM(total_tips_received), 0) as total FROM artists',
    );
    const totalTips = tipsResult[0]?.total || '0';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activeUsers24h = await this.userRepository.count({
      where: { updatedAt: MoreThan(yesterday) },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers7d = await this.userRepository.count({
      where: { createdAt: MoreThan(sevenDaysAgo) },
    });

    const pendingReports = await this.reportRepository.count({
      where: { status: 'pending' as any },
    });

    const bannedUsers = await this.userRepository.count({
      where: { status: UserStatus.BANNED },
    });

    const verifiedArtists = await this.artistRepository.count({
      where: { isVerified: true },
    });

    return {
      totalUsers,
      totalArtists,
      totalTracks,
      totalTips,
      activeUsers24h,
      newUsers7d,
      pendingReports,
      bannedUsers,
      verifiedArtists,
    };
  }

  async getUsers(filterDto: UserFilterDto): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (filterDto.status) {
      query.andWhere('user.status = :status', { status: filterDto.status });
    }

    if (filterDto.search) {
      query.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    const sortField = filterDto.sort || 'createdAt';
    const sortOrder = filterDto.order || 'DESC';
    query.orderBy(`user.${sortField}`, sortOrder);

    return query.getMany();
  }

  async banUser(
    userId: string,
    banDto: BanUserDto,
    adminId: string,
    ipAddress: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.BANNED) {
      throw new BadRequestException('User is already banned');
    }

    const previousState = { status: user.status };
    user.status = UserStatus.BANNED;
    await this.userRepository.save(user);

    await this.logAction({
      adminId,
      action: 'ban_user',
      entityType: 'user',
      entityId: userId,
      previousState,
      newState: { status: UserStatus.BANNED },
      reason: banDto.reason,
      ipAddress,
    });

    return user;
  }

  async unbanUser(
    userId: string,
    adminId: string,
    ipAddress: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.BANNED) {
      throw new BadRequestException('User is not banned');
    }

    const previousState = { status: user.status };
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    await this.logAction({
      adminId,
      action: 'unban_user',
      entityType: 'user',
      entityId: userId,
      previousState,
      newState: { status: UserStatus.ACTIVE },
      reason: 'User unbanned by admin',
      ipAddress,
    });

    return user;
  }

  async verifyArtist(
    artistId: string,
    adminId: string,
    ipAddress: string,
  ): Promise<Artist> {
    const artist = await this.artistRepository.findOne({
      where: { id: artistId },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.isVerified) {
      throw new BadRequestException('Artist is already verified');
    }

    const previousState = { isVerified: artist.isVerified };
    artist.isVerified = true;
    await this.artistRepository.save(artist);

    await this.logAction({
      adminId,
      action: 'verify_artist',
      entityType: 'artist',
      entityId: artistId,
      previousState,
      newState: { isVerified: true },
      reason: 'Artist verified by admin',
      ipAddress,
    });

    return artist;
  }

  async unverifyArtist(
    artistId: string,
    adminId: string,
    ipAddress: string,
  ): Promise<Artist> {
    const artist = await this.artistRepository.findOne({
      where: { id: artistId },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const previousState = { isVerified: artist.isVerified };
    artist.isVerified = false;
    await this.artistRepository.save(artist);

    await this.logAction({
      adminId,
      action: 'unverify_artist',
      entityType: 'artist',
      entityId: artistId,
      previousState,
      newState: { isVerified: false },
      reason: 'Artist unverified by admin',
      ipAddress,
    });

    return artist;
  }

  async removeTrack(
    trackId: string,
    reason: string,
    adminId: string,
    ipAddress: string,
  ): Promise<void> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
    });
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    await this.logAction({
      adminId,
      action: 'remove_track',
      entityType: 'track',
      entityId: trackId,
      previousState: { title: track.title, isPublic: track.isPublic },
      newState: { deleted: true },
      reason,
      ipAddress,
    });

    await this.trackRepository.remove(track);
  }

  async getPendingReports(): Promise<Report[]> {
    return this.reportRepository.find({
      where: { status: 'pending' as any },
      relations: ['reporter', 'reportedUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolveReport(
    reportId: string,
    resolveDto: ResolveReportDto,
    adminId: string,
    ipAddress: string,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const previousState = { status: report.status };
    report.status = 'resolved' as any;
    await this.reportRepository.save(report);

    await this.logAction({
      adminId,
      action: 'resolve_report',
      entityType: 'report',
      entityId: reportId,
      previousState,
      newState: { status: 'resolved', resolution: resolveDto.resolution },
      reason: resolveDto.notes,
      ipAddress,
    });

    return report;
  }

  async getAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
    return this.auditLogRepository.find({
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private async logAction(data: {
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    previousState?: any;
    newState?: any;
    reason: string;
    ipAddress: string;
  }): Promise<void> {
    const log = this.auditLogRepository.create(data);
    await this.auditLogRepository.save(log);
  }
}
