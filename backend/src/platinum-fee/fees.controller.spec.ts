import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { FeesController } from '../fees.controller';
import { FeesService } from '../fees.service';
import { FeeCollectionStatus } from '../entities/platform-fee.entity';

const mockFeesService = {
  getActiveConfiguration: jest.fn(),
  getConfigurationHistory: jest.fn(),
  updateConfiguration: jest.fn(),
  getFeeLedger: jest.fn(),
  getPlatformTotals: jest.fn(),
  getFeeByTipId: jest.fn(),
  getArtistFeeSummary: jest.fn(),
};

// Mock guards to allow all requests through in tests
jest.mock('../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate() { return true; }
  },
}));

jest.mock('../../auth/guards/roles.guard', () => ({
  RolesGuard: class {
    canActivate() { return true; }
  },
}));

describe('FeesController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeesController],
      providers: [{ provide: FeesService, useValue: mockFeesService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /api/fees/configuration ───────────────────────────────────────────

  describe('GET /api/fees/configuration', () => {
    it('should return active fee configuration', async () => {
      const config = {
        id: 'cfg-1',
        feePercentage: 2.5,
        minimumFeeXLM: 0.1,
        maximumFeeXLM: 100,
        waivedForVerifiedArtists: false,
        effectiveFrom: new Date().toISOString(),
      };
      mockFeesService.getActiveConfiguration.mockResolvedValue(config);

      const res = await request(app.getHttpServer())
        .get('/api/fees/configuration')
        .expect(200);

      expect(res.body.feePercentage).toBe(2.5);
      expect(mockFeesService.getActiveConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  // ─── PUT /api/fees/configuration ───────────────────────────────────────────

  describe('PUT /api/fees/configuration', () => {
    it('should update configuration with valid payload', async () => {
      const updatedConfig = {
        id: 'cfg-2',
        feePercentage: 3,
        minimumFeeXLM: 0.2,
        maximumFeeXLM: 50,
        waivedForVerifiedArtists: true,
      };
      mockFeesService.updateConfiguration.mockResolvedValue(updatedConfig);

      const res = await request(app.getHttpServer())
        .put('/api/fees/configuration')
        .set('Authorization', 'Bearer test-token')
        .send({
          feePercentage: 3,
          minimumFeeXLM: 0.2,
          maximumFeeXLM: 50,
          waivedForVerifiedArtists: true,
        })
        .expect(200);

      expect(res.body.feePercentage).toBe(3);
    });

    it('should reject invalid configuration (fee > 100%)', async () => {
      await request(app.getHttpServer())
        .put('/api/fees/configuration')
        .set('Authorization', 'Bearer test-token')
        .send({
          feePercentage: 150,
          minimumFeeXLM: 0.1,
          maximumFeeXLM: 100,
          waivedForVerifiedArtists: false,
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .put('/api/fees/configuration')
        .set('Authorization', 'Bearer test-token')
        .send({ feePercentage: 2.5 })
        .expect(400);
    });
  });

  // ─── GET /api/fees/ledger ──────────────────────────────────────────────────

  describe('GET /api/fees/ledger', () => {
    it('should return paginated fee ledger', async () => {
      const ledger = {
        data: [{ id: 'fee-1' }, { id: 'fee-2' }],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockFeesService.getFeeLedger.mockResolvedValue(ledger);

      const res = await request(app.getHttpServer())
        .get('/api/fees/ledger')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.totalPages).toBe(1);
    });

    it('should pass period query parameter', async () => {
      mockFeesService.getFeeLedger.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await request(app.getHttpServer())
        .get('/api/fees/ledger?period=7d')
        .expect(200);

      expect(mockFeesService.getFeeLedger).toHaveBeenCalledWith(
        expect.objectContaining({ period: '7d' }),
      );
    });
  });

  // ─── GET /api/fees/platform-totals ────────────────────────────────────────

  describe('GET /api/fees/platform-totals', () => {
    it('should return aggregated platform totals', async () => {
      const totals = {
        totalFeesXLM: 500,
        totalFeesUSD: 60,
        totalCollected: 300,
        totalPending: 200,
        totalWaived: 0,
        totalTransactions: 100,
        averageFeeXLM: 5,
        averageFeePercentage: 2.5,
      };
      mockFeesService.getPlatformTotals.mockResolvedValue(totals);

      const res = await request(app.getHttpServer())
        .get('/api/fees/platform-totals')
        .expect(200);

      expect(res.body.totalFeesXLM).toBe(500);
      expect(res.body.totalTransactions).toBe(100);
    });
  });

  // ─── GET /api/fees/tip/:tipId ──────────────────────────────────────────────

  describe('GET /api/fees/tip/:tipId', () => {
    it('should return fee for valid tip UUID', async () => {
      const fee = {
        id: 'fee-1',
        tipId: '550e8400-e29b-41d4-a716-446655440000',
        feeAmountXLM: 2.5,
        collectionStatus: FeeCollectionStatus.PENDING,
      };
      mockFeesService.getFeeByTipId.mockResolvedValue(fee);

      const res = await request(app.getHttpServer())
        .get('/api/fees/tip/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(res.body.feeAmountXLM).toBe(2.5);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/fees/tip/not-a-uuid')
        .expect(400);
    });
  });

  // ─── GET /api/fees/summary/artist/:artistId ────────────────────────────────

  describe('GET /api/fees/summary/artist/:artistId', () => {
    it('should return artist fee summary', async () => {
      const summary = {
        artistId: '550e8400-e29b-41d4-a716-446655440001',
        totalFeesXLM: 25,
        totalFeesUSD: 3,
        waivedCount: 2,
        collectedCount: 8,
        pendingCount: 0,
        totalTips: 10,
      };
      mockFeesService.getArtistFeeSummary.mockResolvedValue(summary);

      const res = await request(app.getHttpServer())
        .get('/api/fees/summary/artist/550e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(res.body.totalTips).toBe(10);
      expect(res.body.waivedCount).toBe(2);
    });
  });
});
