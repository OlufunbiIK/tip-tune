import { FeeCalculatorService } from './fee-calculator.service';
import { FeeConfiguration } from './entities/fee-configuration.entity';
import { Tip } from '../tips/entities/tip.entity';

describe('FeeCalculatorService', () => {
  let service: FeeCalculatorService;

  const baseTip: Tip = {
    id: 'tip-id',
    artistId: 'artist-id',
    trackId: null,
    stellarTxHash: 'hash',
    senderAddress: 'sender',
    receiverAddress: 'receiver',
    amount: 100,
    assetCode: 'XLM',
    assetIssuer: null,
    assetType: 'native',
    message: null,
    stellarMemo: null,
    status: null,
    type: null,
    verifiedAt: null,
    failedAt: null,
    failureReason: null,
    reversedAt: null,
    reversalReason: null,
    stellarTimestamp: null,
    exchangeRate: null,
    fiatCurrency: null,
    fiatAmount: null,
    isAnonymous: false,
    isPublic: false,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    artist: null,
    track: null,
  } as any;

  beforeEach(() => {
    service = new FeeCalculatorService();
  });

  it('calculates simple percentage fee', () => {
    const config: FeeConfiguration = {
      id: 'config-id',
      feePercentage: '2.5',
      minimumFeeXLM: null,
      maximumFeeXLM: null,
      waivedForVerifiedArtists: false,
      effectiveFrom: new Date(),
      createdById: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = service.calculateFee(baseTip, config, {
      isVerifiedArtist: false,
      convertedAmountXLM: null,
    });

    expect(result.feeAmountXLM).toBeCloseTo(2.5);
    expect(result.waived).toBe(false);
  });

  it('applies minimum and maximum fee bounds', () => {
    const config: FeeConfiguration = {
      id: 'config-id',
      feePercentage: '1',
      minimumFeeXLM: '2',
      maximumFeeXLM: '3',
      waivedForVerifiedArtists: false,
      effectiveFrom: new Date(),
      createdById: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const smallTip = { ...baseTip, amount: 10 };
    const smallResult = service.calculateFee(smallTip as any, config, {
      isVerifiedArtist: false,
      convertedAmountXLM: null,
    });
    expect(smallResult.feeAmountXLM).toBeCloseTo(2);

    const largeTip = { ...baseTip, amount: 1000 };
    const largeResult = service.calculateFee(largeTip as any, config, {
      isVerifiedArtist: false,
      convertedAmountXLM: null,
    });
    expect(largeResult.feeAmountXLM).toBeCloseTo(3);
  });

  it('waives fee for verified artists when configured', () => {
    const config: FeeConfiguration = {
      id: 'config-id',
      feePercentage: '5',
      minimumFeeXLM: null,
      maximumFeeXLM: null,
      waivedForVerifiedArtists: true,
      effectiveFrom: new Date(),
      createdById: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = service.calculateFee(baseTip, config, {
      isVerifiedArtist: true,
      convertedAmountXLM: null,
    });

    expect(result.feeAmountXLM).toBe(0);
    expect(result.waived).toBe(true);
  });

  it('uses converted XLM amount when provided', () => {
    const config: FeeConfiguration = {
      id: 'config-id',
      feePercentage: '10',
      minimumFeeXLM: null,
      maximumFeeXLM: null,
      waivedForVerifiedArtists: false,
      effectiveFrom: new Date(),
      createdById: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = service.calculateFee(baseTip, config, {
      isVerifiedArtist: false,
      convertedAmountXLM: 50,
    });

    expect(result.feeAmountXLM).toBeCloseTo(5);
  });
});
