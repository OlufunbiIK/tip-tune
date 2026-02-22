import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupportedAsset } from './entities/supported-asset.entity';
import { StellarService } from '../stellar/stellar.service';

const mockAssetsRepository = {
  find: jest.fn(),
};

const mockStellarService = {
  getConversionRate: jest.fn(),
};

describe('AssetsService', () => {
  let service: AssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getRepositoryToken(SupportedAsset),
          useValue: mockAssetsRepository,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllSupported', () => {
    it('should return enabled assets', async () => {
      const assets = [{ assetCode: 'USDC' }];
      mockAssetsRepository.find.mockResolvedValue(assets);

      const result = await service.findAllSupported();
      expect(result).toEqual(assets);
      expect(mockAssetsRepository.find).toHaveBeenCalledWith({
        where: { isEnabled: true },
      });
    });
  });

  describe('getConversionRate', () => {
    it('should call stellar service for conversion', async () => {
      const rate = { rate: 0.5, estimatedAmount: '50' };
      mockStellarService.getConversionRate.mockResolvedValue(rate);

      const result = await service.getConversionRate('XLM', 'USDC', 100);
      expect(result).toEqual(rate);
      expect(mockStellarService.getConversionRate).toHaveBeenCalledWith(
        'XLM',
        'USDC',
        100,
      );
    });
  });
});
