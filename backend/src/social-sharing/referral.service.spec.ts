import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { ReferralService } from '../referral.service';
import { ReferralCode, RewardType } from '../entities/referral-code.entity';
import { Referral } from '../entities/referral.entity';
import { GenerateReferralCodeDto } from '../dto/referral.dto';

// ─── Factories ────────────────────────────────────────────────────────────────

const makeCode = (overrides: Partial<ReferralCode> = {}): ReferralCode =>
  ({
    id: 'code-uuid-1',
    userId: 'user-1',
    code: 'ABCD1234',
    usageCount: 0,
    maxUsages: null,
    rewardType: RewardType.XLM_BONUS,
    rewardValue: 10,
    isActive: true,
    expiresAt: null,
    createdAt: new Date('2025-01-01'),
    referrals: [],
    ...overrides,
  } as ReferralCode);

const makeReferral = (overrides: Partial<Referral> = {}): Referral =>
  ({
    id: 'ref-uuid-1',
    referrerId: 'user-1',
    referredUserId: 'user-2',
    referralCodeId: 'code-uuid-1',
    rewardClaimed: false,
    rewardClaimedAt: null,
    createdAt: new Date(),
    ...overrides,
  } as Referral);

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCodeRepo = () => ({
  update: jest.fn(),
  existsBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockReferralRepo = () => ({
  findOne: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn(),
    save: jest.fn(),
    increment: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('https://tiptune.app'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReferralService', () => {
  let service: ReferralService;
  let codeRepo: jest.Mocked<Repository<ReferralCode>>;
  let referralRepo: jest.Mocked<Repository<Referral>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: getRepositoryToken(ReferralCode), useFactory: mockCodeRepo },
        { provide: getRepositoryToken(Referral), useFactory: mockReferralRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    codeRepo = module.get(getRepositoryToken(ReferralCode));
    referralRepo = module.get(getRepositoryToken(Referral));

    // Reset query runner mocks
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  // ─── generateCode ──────────────────────────────────────────────────────────

  describe('generateCode', () => {
    const dto: GenerateReferralCodeDto = {
      rewardType: RewardType.XLM_BONUS,
      rewardValue: 10,
    };

    it('should generate a unique 8-char code and return shareable link', async () => {
      const saved = makeCode();
      codeRepo.update.mockResolvedValue({ affected: 1 } as any);
      codeRepo.existsBy.mockResolvedValue(false);
      codeRepo.create.mockReturnValue(saved);
      codeRepo.save.mockResolvedValue(saved);

      const result = await service.generateCode('user-1', dto);

      expect(codeRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isActive: true },
        { isActive: false },
      );
      expect(codeRepo.save).toHaveBeenCalled();
      expect(result.shareableLink).toContain(saved.code);
      expect(result.shareableLink).toContain('https://tiptune.app');
    });

    it('should retry if generated code already exists', async () => {
      const saved = makeCode();
      codeRepo.update.mockResolvedValue({ affected: 0 } as any);
      // First call: exists, second call: unique
      codeRepo.existsBy
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      codeRepo.create.mockReturnValue(saved);
      codeRepo.save.mockResolvedValue(saved);

      await service.generateCode('user-1', dto);
      expect(codeRepo.existsBy).toHaveBeenCalledTimes(2);
    });

    it('should set expiresAt when provided', async () => {
      const expiresAt = '2027-01-01T00:00:00Z';
      const saved = makeCode({ expiresAt: new Date(expiresAt) });
      codeRepo.update.mockResolvedValue({ affected: 0 } as any);
      codeRepo.existsBy.mockResolvedValue(false);
      codeRepo.create.mockReturnValue(saved);
      codeRepo.save.mockResolvedValue(saved);

      const result = await service.generateCode('user-1', { ...dto, expiresAt });
      expect(codeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: new Date(expiresAt) }),
      );
    });
  });

  // ─── getMyCode ─────────────────────────────────────────────────────────────

  describe('getMyCode', () => {
    it('should return active code for user', async () => {
      const code = makeCode();
      codeRepo.findOne.mockResolvedValue(code);

      const result = await service.getMyCode('user-1');
      expect(result.code).toBe('ABCD1234');
      expect(result.shareableLink).toBe('https://tiptune.app/register?ref=ABCD1234');
    });

    it('should throw NotFoundException if no active code exists', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      await expect(service.getMyCode('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── applyCode ─────────────────────────────────────────────────────────────

  describe('applyCode', () => {
    beforeEach(() => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
    });

    it('should successfully apply a valid referral code', async () => {
      const code = makeCode();
      const referral = makeReferral();

      codeRepo.findOne.mockResolvedValue(code);
      referralRepo.findOne.mockResolvedValue(null); // Not previously referred
      mockQueryRunner.manager.create.mockReturnValue(referral);
      mockQueryRunner.manager.save.mockResolvedValue(referral);
      mockQueryRunner.manager.increment.mockResolvedValue(undefined);

      const result = await service.applyCode('ABCD1234', 'user-2');

      expect(result.referralId).toBe('ref-uuid-1');
      expect(result.referrerId).toBe('user-1');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown code', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      await expect(service.applyCode('UNKNOWN1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on self-referral', async () => {
      const code = makeCode({ userId: 'user-2' }); // Same as referredUserId
      codeRepo.findOne.mockResolvedValue(code);

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(
        new BadRequestException('You cannot use your own referral code.'),
      );
    });

    it('should throw BadRequestException for expired code', async () => {
      const code = makeCode({ expiresAt: new Date('2020-01-01') });
      codeRepo.findOne.mockResolvedValue(code);

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(
        new BadRequestException('This referral code has expired.'),
      );
    });

    it('should throw BadRequestException when max usages reached', async () => {
      const code = makeCode({ usageCount: 10, maxUsages: 10 });
      codeRepo.findOne.mockResolvedValue(code);

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(
        new BadRequestException('This referral code has reached its usage limit.'),
      );
    });

    it('should throw ConflictException if user already referred', async () => {
      const code = makeCode();
      codeRepo.findOne.mockResolvedValue(code);
      referralRepo.findOne.mockResolvedValue(makeReferral()); // Already referred

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(ConflictException);
    });

    it('should rollback transaction on save failure', async () => {
      const code = makeCode();
      codeRepo.findOne.mockResolvedValue(code);
      referralRepo.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue(makeReferral());
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ─── claimReward ───────────────────────────────────────────────────────────

  describe('claimReward', () => {
    it('should mark reward as claimed', async () => {
      const referral = makeReferral({ referralCode: makeCode() as any });
      referralRepo.findOne.mockResolvedValue(referral);
      referralRepo.update.mockResolvedValue({ affected: 1 } as any);

      await service.claimReward('user-2');

      expect(referralRepo.update).toHaveBeenCalledWith(
        'ref-uuid-1',
        expect.objectContaining({ rewardClaimed: true }),
      );
    });

    it('should silently skip if no pending reward exists', async () => {
      referralRepo.findOne.mockResolvedValue(null);
      await expect(service.claimReward('user-2')).resolves.not.toThrow();
      expect(referralRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return accurate referral statistics', async () => {
      referralRepo.count
        .mockResolvedValueOnce(5)  // totalReferrals
        .mockResolvedValueOnce(3); // claimedRewards

      const mockQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '30.5' }),
      };
      referralRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      codeRepo.findOne.mockResolvedValue(makeCode({ usageCount: 5 }));

      const stats = await service.getStats('user-1');

      expect(stats.totalReferrals).toBe(5);
      expect(stats.claimedRewards).toBe(3);
      expect(stats.pendingRewards).toBe(2);
      expect(stats.totalRewardValue).toBe(30.5);
      expect(stats.codeUsageCount).toBe(5);
    });

    it('should handle zero rewards gracefully', async () => {
      referralRepo.count.mockResolvedValue(0);
      const mockQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      referralRepo.createQueryBuilder.mockReturnValue(mockQB as any);
      codeRepo.findOne.mockResolvedValue(null);

      const stats = await service.getStats('user-1');
      expect(stats.totalRewardValue).toBe(0);
      expect(stats.codeUsageCount).toBe(0);
    });
  });

  // ─── getLeaderboard ────────────────────────────────────────────────────────

  describe('getLeaderboard', () => {
    it('should return ranked leaderboard entries', async () => {
      const rows = [
        { userId: 'user-1', totalReferrals: '10', claimedRewards: '8' },
        { userId: 'user-2', totalReferrals: '5', claimedRewards: '3' },
      ];
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rows),
      };
      referralRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.getLeaderboard(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        rank: 1,
        userId: 'user-1',
        totalReferrals: 10,
        claimedRewards: 8,
      });
      expect(result[1].rank).toBe(2);
    });

    it('should return empty array when no referrals exist', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      referralRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.getLeaderboard(10);
      expect(result).toEqual([]);
    });
  });
});
