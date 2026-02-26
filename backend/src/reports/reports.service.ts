import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportAction, ReportEntityType } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { User, UserStatus } from '../users/entities/user.entity';
import { Track } from '../tracks/entities/track.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Filter = require('bad-words');

@Injectable()
export class ReportsService {
  private filter: any;

  constructor(
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Track)
    private tracksRepository: Repository<Track>,
  ) {
    this.filter = new Filter();
  }

  async create(createReportDto: CreateReportDto, user: User): Promise<Report> {
    const report = this.reportsRepository.create({
      ...createReportDto,
      reportedBy: user,
    });
    return this.reportsRepository.save(report);
  }

  async findAll(query: any): Promise<Report[]> {
    const { status, entityType } = query;
    const where: any = {};
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    return this.reportsRepository.find({
      where,
      relations: ['reportedBy', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: ['reportedBy', 'reviewedBy'],
    });
    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
    return report;
  }

  async updateStatus(id: string, updateDto: UpdateReportStatusDto, admin: User): Promise<Report> {
    const report = await this.findOne(id);
    
    report.status = updateDto.status;
    report.reviewedBy = admin;
    report.reviewedAt = new Date();
    if (updateDto.reviewNotes) report.reviewNotes = updateDto.reviewNotes;
    if (updateDto.action) report.action = updateDto.action;

    // Handle Actions
    if (report.action === ReportAction.USER_BANNED) {
       if (report.entityType === ReportEntityType.USER) {
          await this.usersRepository.update(report.entityId, { status: UserStatus.BANNED });
       }
    } else if (report.action === ReportAction.CONTENT_REMOVED) {
       if (report.entityType === ReportEntityType.TRACK) {
         await this.tracksRepository.update(report.entityId, { isPublic: false });
       }
    }
    
    return this.reportsRepository.save(report);
  }

  checkProfanity(text: string): boolean {
    return this.filter.isProfane(text);
  }
}
