import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { Report, ReportStatus, ReportAction, ReportEntityType } from './entities/report.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Track } from '../tracks/entities/track.entity';
import { NotFoundException } from '@nestjs/common';

const mockReportRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

const mockUserRepository = () => ({
  update: jest.fn(),
});

const mockTrackRepository = () => ({
  update: jest.fn(),
});

describe('ReportsService', () => {
  let service: ReportsService;
  let reportRepository: any;
  let userRepository: any;
  let trackRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Report), useFactory: mockReportRepository },
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: getRepositoryToken(Track), useFactory: mockTrackRepository },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    reportRepository = module.get(getRepositoryToken(Report));
    userRepository = module.get(getRepositoryToken(User));
    trackRepository = module.get(getRepositoryToken(Track));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a report', async () => {
      const createReportDto = {
        entityType: ReportEntityType.TRACK,
        entityId: 'track-id',
        reason: 'spam' as any,
        description: 'spam content',
      };
      const user = { id: 'user-id' } as User;
      const expectedReport = { ...createReportDto, reportedBy: user, id: 'report-id' };

      reportRepository.create.mockReturnValue(expectedReport);
      reportRepository.save.mockResolvedValue(expectedReport);

      const result = await service.create(createReportDto, user);

      expect(reportRepository.create).toHaveBeenCalledWith({ ...createReportDto, reportedBy: user });
      expect(reportRepository.save).toHaveBeenCalledWith(expectedReport);
      expect(result).toEqual(expectedReport);
    });
  });

  describe('findAll', () => {
    it('should return an array of reports', async () => {
      const query = { status: ReportStatus.PENDING };
      const expectedReports = [{ id: 'report-id', status: ReportStatus.PENDING }];

      reportRepository.find.mockResolvedValue(expectedReports);

      const result = await service.findAll(query);

      expect(reportRepository.find).toHaveBeenCalledWith({
        where: { status: ReportStatus.PENDING },
        relations: ['reportedBy', 'reviewedBy'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(expectedReports);
    });
  });

  describe('findOne', () => {
    it('should return a report by id', async () => {
      const report = { id: 'report-id' };
      reportRepository.findOne.mockResolvedValue(report);

      const result = await service.findOne('report-id');

      expect(result).toEqual(report);
    });

    it('should throw NotFoundException if report not found', async () => {
      reportRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('report-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update report status and handle actions', async () => {
      const report = { 
        id: 'report-id', 
        entityType: ReportEntityType.USER, 
        entityId: 'user-id',
        status: ReportStatus.PENDING 
      };
      const updateDto = { 
        status: ReportStatus.RESOLVED, 
        action: ReportAction.USER_BANNED 
      };
      const admin = { id: 'admin-id' } as User;
      const updatedReport = { 
        ...report, 
        ...updateDto, 
        reviewedBy: admin,
        reviewedAt: expect.any(Date)
      };

      reportRepository.findOne.mockResolvedValue(report);
      reportRepository.save.mockResolvedValue(updatedReport);

      const result = await service.updateStatus('report-id', updateDto, admin);

      expect(reportRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: ReportStatus.RESOLVED,
        action: ReportAction.USER_BANNED,
        reviewedBy: admin,
      }));
      expect(userRepository.update).toHaveBeenCalledWith('user-id', { status: UserStatus.BANNED });
      expect(result).toEqual(updatedReport);
    });

    it('should hide content if action is CONTENT_REMOVED for a track', async () => {
      const report = { 
        id: 'report-id', 
        entityType: ReportEntityType.TRACK, 
        entityId: 'track-id',
        status: ReportStatus.PENDING 
      };
      const updateDto = { 
        status: ReportStatus.RESOLVED, 
        action: ReportAction.CONTENT_REMOVED 
      };
      const admin = { id: 'admin-id' } as User;

      reportRepository.findOne.mockResolvedValue(report);
      reportRepository.save.mockResolvedValue({ ...report, ...updateDto });

      await service.updateStatus('report-id', updateDto, admin);

      expect(trackRepository.update).toHaveBeenCalledWith('track-id', { isPublic: false });
    });
  });

  describe('checkProfanity', () => {
    it('should return true for profane text', () => {
      expect(service.checkProfanity('hell')).toBe(true);
    });

    it('should return false for clean text', () => {
      expect(service.checkProfanity('hello world')).toBe(false);
    });
  });
});
