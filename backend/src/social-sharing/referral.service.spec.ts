import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TipVerifiedEvent } from '../tips/events/tip-verified.event';
import { ApplyReferralResponseDto, GenerateReferralCodeDto } from './referral.dto';
import { ReferralCode, RewardType } from './referral-code.entity';
import { ReferralController } from './referral.controller';
import { Referral } from './referral.entity';
import { ReferralService } from './referral.service';

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

const mockCodeRepo = () => ({
  update: jest.fn(),
  existsBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
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
    findOne: jest.fn(),
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

describe('ReferralService', () => {
  let service: ReferralService;
  let codeRepo: jest.Mocked<Repository<ReferralCode>>;
  let referralRepo: jest.Mocked<Repository<Referral>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
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

    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockQueryRunner.connect.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
    mockQueryRunner.release.mockResolvedValue(undefined);
  });

  describe('generateCode', () => {
    const dto: GenerateReferralCodeDto = {
      rewardType: RewardType.XLM_BONUS,
      rewardValue: 10,
    };

    it('should generate a unique code and shareable link', async () => {
      const saved = makeCode();
      codeRepo.update.mockResolvedValue({ affected: 1 } as any);
      codeRepo.existsBy.mockResolvedValue(false);
      codeRepo.create.mockReturnValue(saved as any);
      codeRepo.save.mockResolvedValue(saved as any);

      const result = await service.generateCode('user-1', dto);

      expect(codeRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isActive: true },
        { isActive: false },
      );
      expect(result.shareableLink).toBe('https://tiptune.app/register?ref=ABCD1234');
    });
  });

  describe('applyCode', () => {
    it('should apply a valid referral code transactionally', async () => {
      const code = makeCode();
      const referral = makeReferral();

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(code)
        .mockResolvedValueOnce(null);
      mockQueryRunner.manager.create.mockReturnValue(referral);
      mockQueryRunner.manager.save.mockResolvedValue(referral);
      mockQueryRunner.manager.increment.mockResolvedValue(undefined);

      const result = await service.applyCode('ABCD1234', 'user-2');

      expect(result).toEqual<ApplyReferralResponseDto>({
        message: 'Referral code applied successfully.',
        referralId: 'ref-uuid-1',
        referrerId: 'user-1',
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject self-referral', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(
        makeCode({ userId: 'user-2' }),
      );

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(
        new BadRequestException('You cannot use your own referral code.'),
      );
    });

    it('should reject duplicate referrals', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(makeCode())
        .mockResolvedValueOnce(makeReferral());

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should convert unique race errors into ConflictException', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(makeCode())
        .mockResolvedValueOnce(null);
      mockQueryRunner.manager.create.mockReturnValue(makeReferral());
      mockQueryRunner.manager.save.mockRejectedValue({ code: '23505' });

      await expect(service.applyCode('ABCD1234', 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject unknown codes', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.applyCode('UNKNOWN1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('claimReward', () => {
    it('should claim the reward exactly once', async () => {
      referralRepo.findOne.mockResolvedValue(
        makeReferral({ referralCode: makeCode() as any }) as any,
      );
      referralRepo.update
        .mockResolvedValueOnce({ affected: 1 } as any)
        .mockResolvedValueOnce({ affected: 0 } as any);

      await expect(service.claimReward('user-2', 'tip-1')).resolves.toBe(true);
      await expect(service.claimReward('user-2', 'tip-1')).resolves.toBe(false);

      expect(referralRepo.update).toHaveBeenCalledWith(
        { id: 'ref-uuid-1', rewardClaimed: false },
        expect.objectContaining({ rewardClaimed: true }),
      );
    });

    it('should skip missing pending rewards', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReward('user-2')).resolves.toBe(false);
      expect(referralRepo.update).not.toHaveBeenCalled();
    });

    it('should trigger reward claiming from a verified tip event', async () => {
      const claimSpy = jest.spyOn(service, 'claimReward').mockResolvedValue(true);

      await service.handleTipVerified(
        new TipVerifiedEvent(
          {
            id: 'tip-1',
            artistId: 'artist-1',
            amount: 25,
            assetCode: 'XLM',
          } as any,
          'user-2',
        ),
      );

      expect(claimSpy).toHaveBeenCalledWith('user-2', 'tip-1');
    });
  });
});
