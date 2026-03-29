import { Test, TestingModule } from '@nestjs/testing';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ReferralController } from './referral.controller';
import {
  ApplyReferralResponseDto,
  GenerateReferralCodeDto,
  LeaderboardEntryDto,
  ReferralCodeResponseDto,
  ReferralStatsDto,
} from './referral.dto';
import { RewardType } from './referral-code.entity';
import { ReferralService } from './referral.service';

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

const currentUser: CurrentUserData = {
  userId: 'user-1',
  walletAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  isArtist: false,
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
    it('should call service with authenticated user id', async () => {
      const dto: GenerateReferralCodeDto = {
        rewardType: RewardType.XLM_BONUS,
        rewardValue: 10,
      };
      mockService.generateCode.mockResolvedValue(mockCodeResponse);

      const result = await controller.generateCode(currentUser, dto);

      expect(mockService.generateCode).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockCodeResponse);
    });
  });

  describe('getMyCode', () => {
    it('should return the active code for the authenticated user', async () => {
      mockService.getMyCode.mockResolvedValue(mockCodeResponse);

      const result = await controller.getMyCode(currentUser);

      expect(mockService.getMyCode).toHaveBeenCalledWith('user-1');
      expect(result.code).toBe('ABCD1234');
    });
  });

  describe('applyCode', () => {
    it('should uppercase the code and use the authenticated user id', async () => {
      const expected: ApplyReferralResponseDto = {
        message: 'Referral code applied successfully.',
        referralId: 'ref-1',
        referrerId: 'user-1',
      };
      mockService.applyCode.mockResolvedValue(expected);

      const result = await controller.applyCode('abcd1234', {
        ...currentUser,
        userId: 'user-2',
      });

      expect(mockService.applyCode).toHaveBeenCalledWith('ABCD1234', 'user-2');
      expect(result).toEqual(expected);
    });
  });

  describe('getStats', () => {
    it('should return stats for the requested user id', async () => {
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
    it('should cap the limit at 50', async () => {
      const leaderboard: LeaderboardEntryDto[] = [
        { rank: 1, userId: 'user-1', totalReferrals: 10, claimedRewards: 8 },
      ];
      mockService.getLeaderboard.mockResolvedValue(leaderboard);

      const result = await controller.getLeaderboard(100);

      expect(mockService.getLeaderboard).toHaveBeenCalledWith(50);
      expect(result).toEqual(leaderboard);
    });
  });
});
