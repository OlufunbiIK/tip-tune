import { Test, TestingModule } from '@nestjs/testing';
import { FeeCalculatorService } from '../fee-calculator.service';
import { FeeConfiguration } from '../entities/fee-configuration.entity';

const makeConfig = (overrides: Partial<FeeConfiguration> = {}): FeeConfiguration => {
  const config = new FeeConfiguration();
  config.feePercentage = 2.5;
  config.minimumFeeXLM = 0.1;
  config.maximumFeeXLM = 100;
  config.waivedForVerifiedArtists = false;
  config.effectiveFrom = new Date();
  config.createdBy = 'admin-uuid';
  return Object.assign(config, overrides);
};

describe('FeeCalculatorService', () => {
  let service: FeeCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeeCalculatorService],
    }).compile();

    service = module.get<FeeCalculatorService>(FeeCalculatorService);
  });

  describe('calculate()', () => {
    it('should calculate standard fee correctly', () => {
      const result = service.calculate({
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig(),
      });

      expect(result.feeAmountXLM).toBe(2.5);
      expect(result.feeAmountUSD).toBeCloseTo(0.3, 4);
      expect(result.feePercentage).toBe(2.5);
      expect(result.isWaived).toBe(false);
      expect(result.netAmountXLM).toBe(97.5);
    });

    it('should waive fee for verified artist when config enables waiver', () => {
      const result = service.calculate({
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: true,
        config: makeConfig({ waivedForVerifiedArtists: true }),
      });

      expect(result.feeAmountXLM).toBe(0);
      expect(result.feeAmountUSD).toBe(0);
      expect(result.feePercentage).toBe(0);
      expect(result.isWaived).toBe(true);
      expect(result.netAmountXLM).toBe(100);
    });

    it('should NOT waive fee for verified artist when waiver is disabled', () => {
      const result = service.calculate({
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: true,
        config: makeConfig({ waivedForVerifiedArtists: false }),
      });

      expect(result.isWaived).toBe(false);
      expect(result.feeAmountXLM).toBeGreaterThan(0);
    });

    it('should apply minimum fee floor when raw fee is too small', () => {
      // 2.5% of 1 XLM = 0.025 XLM < minimum 0.1 XLM
      const result = service.calculate({
        amountXLM: 1,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig({ minimumFeeXLM: 0.1 }),
      });

      expect(result.feeAmountXLM).toBe(0.1);
      expect(result.netAmountXLM).toBe(0.9);
    });

    it('should apply maximum fee cap when raw fee exceeds cap', () => {
      // 2.5% of 10000 XLM = 250 XLM > max 100 XLM
      const result = service.calculate({
        amountXLM: 10000,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig({ maximumFeeXLM: 100 }),
      });

      expect(result.feeAmountXLM).toBe(100);
      expect(result.netAmountXLM).toBe(9900);
    });

    it('should handle zero tip amount gracefully', () => {
      const result = service.calculate({
        amountXLM: 0,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig(),
      });

      expect(result.feeAmountXLM).toBe(0);
      expect(result.feePercentage).toBe(0);
      expect(result.netAmountXLM).toBe(0);
    });

    it('should never let fee exceed the tip amount', () => {
      // Very tiny tip with a large minimum fee
      const result = service.calculate({
        amountXLM: 0.05,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig({ minimumFeeXLM: 0.1 }),
      });

      expect(result.feeAmountXLM).toBeLessThanOrEqual(0.05);
      expect(result.netAmountXLM).toBeGreaterThanOrEqual(0);
    });

    it('should handle 100% fee percentage edge case', () => {
      const result = service.calculate({
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig({ feePercentage: 100, maximumFeeXLM: 999999 }),
      });

      expect(result.feeAmountXLM).toBe(100);
      expect(result.netAmountXLM).toBe(0);
    });

    it('should handle 0% fee percentage', () => {
      const result = service.calculate({
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig({ feePercentage: 0, minimumFeeXLM: 0 }),
      });

      expect(result.feeAmountXLM).toBe(0);
      expect(result.netAmountXLM).toBe(100);
    });

    it('should handle very small XLM amounts with Stellar precision', () => {
      const result = service.calculate({
        amountXLM: 0.0000001, // 1 stroop
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
        config: makeConfig({ feePercentage: 10, minimumFeeXLM: 0 }),
      });

      // Should not produce negative or NaN values
      expect(result.feeAmountXLM).toBeGreaterThanOrEqual(0);
      expect(result.netAmountXLM).toBeGreaterThanOrEqual(0);
      expect(isNaN(result.feeAmountXLM)).toBe(false);
    });

    it('should calculate USD conversion correctly', () => {
      const result = service.calculate({
        amountXLM: 100,
        xlmToUsdRate: 0.5, // $0.50 per XLM
        isVerifiedArtist: false,
        config: makeConfig({ feePercentage: 2.5 }),
      });

      // 2.5 XLM * $0.50 = $1.25
      expect(result.feeAmountUSD).toBeCloseTo(1.25, 4);
    });
  });

  describe('parsePeriodToDate()', () => {
    it('should parse 30d correctly', () => {
      const result = service.parsePeriodToDate('30d');
      const expectedApprox = new Date();
      expectedApprox.setDate(expectedApprox.getDate() - 30);

      expect(result.getTime()).toBeCloseTo(expectedApprox.getTime(), -3);
    });

    it('should parse 7d correctly', () => {
      const result = service.parsePeriodToDate('7d');
      const expectedApprox = new Date();
      expectedApprox.setDate(expectedApprox.getDate() - 7);

      expect(result.getTime()).toBeCloseTo(expectedApprox.getTime(), -3);
    });

    it('should parse 1y correctly', () => {
      const result = service.parsePeriodToDate('1y');
      const expectedApprox = new Date();
      expectedApprox.setFullYear(expectedApprox.getFullYear() - 1);

      expect(result.getTime()).toBeCloseTo(expectedApprox.getTime(), -3);
    });

    it('should default to 30d for invalid period format', () => {
      const result = service.parsePeriodToDate('invalid');
      const expectedApprox = new Date();
      expectedApprox.setDate(expectedApprox.getDate() - 30);

      expect(result.getTime()).toBeCloseTo(expectedApprox.getTime(), -3);
    });
  });
});
