import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ReportStatus, ReportAction, ReportEntityType, ReportReason } from './entities/report.entity';
import { User, UserRole } from '../users/entities/user.entity';

const mockReportsService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
});

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useFactory: mockReportsService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a report', async () => {
      const createReportDto: CreateReportDto = {
        entityType: ReportEntityType.TRACK,
        entityId: 'track-id',
        reason: ReportReason.SPAM,
        description: 'spam',
      };
      const user = { id: 'user-id' } as User;
      const expectedResult = { id: 'report-id', ...createReportDto };

      service.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createReportDto, user);

      expect(service.create).toHaveBeenCalledWith(createReportDto, user);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all reports', async () => {
      const query = { status: ReportStatus.PENDING };
      const expectedResult = [{ id: 'report-id' }];

      service.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return a report', async () => {
      const id = 'report-id';
      const expectedResult = { id };

      service.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateStatus', () => {
    it('should update report status', async () => {
      const id = 'report-id';
      const updateDto: UpdateReportStatusDto = { status: ReportStatus.RESOLVED };
      const admin = { id: 'admin-id', role: UserRole.ADMIN } as User;
      const expectedResult = { id, ...updateDto };

      service.updateStatus.mockResolvedValue(expectedResult);

      const result = await controller.updateStatus(id, updateDto, admin);

      expect(service.updateStatus).toHaveBeenCalledWith(id, updateDto, admin);
      expect(result).toEqual(expectedResult);
    });
  });
});
