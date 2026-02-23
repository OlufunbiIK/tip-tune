import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { PayoutProcessorService } from './payout-processor.service';
import { PayoutsService } from './payouts.service';
import { PayoutRequest, PayoutStatus } from './entities/payout-request.entity';

// Mock stellar-sdk
jest.mock('stellar-sdk', () => {
  const Keypair = {
    fromSecret: jest.fn().mockReturnValue({
      publicKey: jest.fn().mockReturnValue('GPUBLIC_KEY'),
    }),
  };

  const TransactionBuilder = jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    addMemo: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      sign: jest.fn(),
    }),
  }));

  return {
    __esModule: true,
    default: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn().mockResolvedValue({ id: 'source' }),
        submitTransaction: jest.fn().mockResolvedValue({ hash: 'mockhash123' }),
      })),
      Networks: { TESTNET: 'Test SDF Network ; September 2015', PUBLIC: 'Public Global Stellar Network ; September 2015' },
      Keypair,
      TransactionBuilder,
      Asset: Object.assign(
        jest.fn().mockImplementation(() => ({})),
        { native: jest.fn().mockReturnValue({ isNative: () => true }) },
      ),
      BASE_FEE: '100',
      Operation: { payment: jest.fn().mockReturnValue({}) },
      Memo: { text: jest.fn().mockReturnValue({}) },
    },
  };
});

function makePayout(overrides: Partial<PayoutRequest> = {}): PayoutRequest {
  return Object.assign(new PayoutRequest(), {
    id: 'pay-uuid',
    artistId: 'artist-uuid',
    amount: 20,
    assetCode: 'XLM',
    destinationAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    status: PayoutStatus.PENDING,
    stellarTxHash: null,
    failureReason: null,
    requestedAt: new Date(),
    processedAt: null,
    ...overrides,
  });
}

describe('PayoutProcessorService', () => {
  let processor: PayoutProcessorService;
  let payoutsService: jest.Mocked<Pick<PayoutsService,
    'getPendingPayouts' | 'markProcessing' | 'finaliseSuccess' | 'finaliseFailure'>>;
  let dataSource: jest.Mocked<any>;

  const makeQr = () => ({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  });

  beforeEach(async () => {
    payoutsService = {
      getPendingPayouts: jest.fn(),
      markProcessing: jest.fn(),
      finaliseSuccess: jest.fn(),
      finaliseFailure: jest.fn(),
    };

    dataSource = { createQueryRunner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutProcessorService,
        { provide: PayoutsService, useValue: payoutsService },
        { provide: getRepositoryToken(PayoutRequest), useValue: {} },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def: any) => {
              if (key === 'STELLAR_PAYOUT_SECRET_KEY') return 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
              if (key === 'PAYOUT_PROCESSOR_INTERVAL_MS') return 999_999; // prevent actual polling
              return def;
            },
          },
        },
      ],
    }).compile();

    processor = module.get<PayoutProcessorService>(PayoutProcessorService);
    // Prevent interval from firing during tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('skips processing when already running', async () => {
    (processor as any).isProcessing = true;
    await processor.processPending();
    expect(payoutsService.getPendingPayouts).not.toHaveBeenCalled();
  });

  it('processes pending payouts and commits on success', async () => {
    const payout = makePayout();
    payoutsService.getPendingPayouts.mockResolvedValue([payout]);
    payoutsService.markProcessing.mockResolvedValue(undefined);
    payoutsService.finaliseSuccess.mockResolvedValue(undefined);

    const qr = makeQr();
    dataSource.createQueryRunner.mockReturnValue(qr);

    await processor.processPending();

    expect(payoutsService.markProcessing).toHaveBeenCalledWith(payout.id);
    expect(payoutsService.finaliseSuccess).toHaveBeenCalledWith(
      payout.id,
      'mockhash123',
      qr,
    );
    expect(qr.commitTransaction).toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalled();
  });

  it('marks as failed when Stellar transaction throws', async () => {
    const StellarSdk = (await import('stellar-sdk')).default as any;
    const payout = makePayout();

    payoutsService.getPendingPayouts.mockResolvedValue([payout]);
    payoutsService.markProcessing.mockResolvedValue(undefined);
    payoutsService.finaliseFailure.mockResolvedValue(undefined);

    // Make submitTransaction fail
    StellarSdk.Server.mockImplementationOnce(() => ({
      loadAccount: jest.fn().mockResolvedValue({}),
      submitTransaction: jest.fn().mockRejectedValue(new Error('horizon error')),
    }));
    // Need to re-instantiate – instead, stub private method
    jest
      .spyOn(processor as any, 'submitStellarTransaction')
      .mockRejectedValue(new Error('horizon error'));

    const successQr = makeQr();
    const failQr = makeQr();
    dataSource.createQueryRunner
      .mockReturnValueOnce(successQr)
      .mockReturnValueOnce(failQr);

    await processor.processPending();

    expect(payoutsService.finaliseFailure).toHaveBeenCalledWith(
      payout.id,
      'horizon error',
      failQr,
    );
    expect(successQr.rollbackTransaction).toHaveBeenCalled();
    expect(failQr.commitTransaction).toHaveBeenCalled();
  });

  it('processes zero pending payouts gracefully', async () => {
    payoutsService.getPendingPayouts.mockResolvedValue([]);
    await expect(processor.processPending()).resolves.not.toThrow();
  });

  it('resets isProcessing flag after run', async () => {
    payoutsService.getPendingPayouts.mockResolvedValue([]);
    await processor.processPending();
    expect((processor as any).isProcessing).toBe(false);
  });

  it('resets isProcessing flag even on error', async () => {
    payoutsService.getPendingPayouts.mockRejectedValue(new Error('db error'));
    await processor.processPending();
    expect((processor as any).isProcessing).toBe(false);
  });
});
