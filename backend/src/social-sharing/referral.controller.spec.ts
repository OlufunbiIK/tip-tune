import { Test, TestingModule } from '@nestjs/testing';
import { ReferralController } from '../referral.controller';
import { ReferralService } from '../referral.service';
import { RewardType } from '../entities/referral-code.entity';
import {
  GenerateReferralCodeDto,
  ReferralCodeResponseDto,
  ReferralStatsDto,
  LeaderboardEntryDto,
  ApplyReferralResponseDto,
} from '../dto/referral.dto';

const mockService = {
  generateCode: jest.fn(),
  getMyCode: jest.fn(),
  applyCode: jest.fn(),
  getStats: jest.fn(),
  getLeaderboard: jest.fn(),
};

const mockCodeResponse: ReferralCodeResponseDto = {
  id: 'code-uuid-1',
  code: 'ABCD1234',
  userId: 'user-1',
  rewardType: RewardType.XLM_BONUS,
  rewardValue: 10,
  usageCount: 0,
  isActive: true,
  shareableLink: 'https://tiptune.app/register?ref=ABCD1234',
  createdAt: new Date(),
};

describe('ReferralController', () => {
  let controller: ReferralController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [{ provide: ReferralService, useValue: mockService }],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
    jest.clearAllMocks();
  });

  describe('generateCode', () => {
    it('should call service and return code response', async () => {
      const dto: GenerateReferralCodeDto = {
        rewardType: RewardType.XLM_BONUS,
        rewardValue: 10,
      };
      mockService.generateCode.mockResolvedValue(mockCodeResponse);

      const result = await controller.generateCode('user-1', dto);

      expect(mockService.generateCode).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockCodeResponse);
    });
  });

  describe('getMyCode', () => {
    it('should return the active code for user', async () => {
      mockService.getMyCode.mockResolvedValue(mockCodeResponse);

      const result = await controller.getMyCode('user-1');
      expect(mockService.getMyCode).toHaveBeenCalledWith('user-1');
      expect(result.code).toBe('ABCD1234');
    });
  });

  describe('applyCode', () => {
    it('should uppercase code before passing to service', async () => {
      const expected: ApplyReferralResponseDto = {
        message: 'Referral code applied successfully.',
        referralId: 'ref-1',
        referrerId: 'user-1',
      };
      mockService.applyCode.mockResolvedValue(expected);

      const result = await controller.applyCode('abcd1234', 'user-2');

      expect(mockService.applyCode).toHaveBeenCalledWith('ABCD1234', 'user-2');
      expect(result.referrerId).toBe('user-1');
    });
  });

  describe('getStats', () => {
    it('should return stats for given userId', async () => {
      const stats: ReferralStatsDto = {
        totalReferrals: 5,
        claimedRewards: 3,
        pendingRewards: 2,
        totalRewardValue: 30,
        codeUsageCount: 5,
      };
      mockService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats('user-1');
      expect(mockService.getStats).toHaveBeenCalledWith('user-1');
      expect(result.totalReferrals).toBe(5);
    });
  });

  describe('getLeaderboard', () => {
    it('should cap limit at 50 and call service', async () => {
      const leaderboard: LeaderboardEntryDto[] = [
        { rank: 1, userId: 'user-1', totalReferrals: 10, claimedRewards: 8 },
      ];
      mockService.getLeaderboard.mockResolvedValue(leaderboard);

      const result = await controller.getLeaderboard(100); // Over cap

      expect(mockService.getLeaderboard).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(1);
    });

    it('should default to 10 when limit not provided', async () => {
      mockService.getLeaderboard.mockResolvedValue([]);
      await controller.getLeaderboard(10);
      expect(mockService.getLeaderboard).toHaveBeenCalledWith(10);
    });
  });
});
