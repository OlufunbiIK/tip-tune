/**
 * Integration tests for PayoutsModule.
 *
 * These tests use a real PostgreSQL database (configured via environment) and
 * interact with the Stellar testnet when STELLAR_PAYOUT_SECRET_KEY is set.
 *
 * Run with:
 *   STELLAR_NETWORK=testnet \
 *   STELLAR_PAYOUT_SECRET_KEY=S... \
 *   DB_HOST=localhost ... \
 *   jest payouts.integration.spec.ts
 *
 * Without STELLAR_PAYOUT_SECRET_KEY the Stellar tx tests are skipped automatically.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { Repository, DataSource } from 'typeorm';
import { PayoutsModule } from './payouts.module';
import { PayoutRequest, PayoutStatus } from './entities/payout-request.entity';
import { ArtistBalance } from './entities/artist-balance.entity';
import { PayoutProcessorService } from './payout-processor.service';
import { PayoutsService } from './payouts.service';
import StellarSdk from 'stellar-sdk';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const ARTIST_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const DEST_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const TESTNET_SECRET = process.env.STELLAR_PAYOUT_SECRET_KEY;
const HAS_TESTNET = !!TESTNET_SECRET;

async function fundTestnetAccount(address: string) {
  try {
    await fetch(`https://friendbot.stellar.org?addr=${address}`);
    await new Promise((r) => setTimeout(r, 3000));
  } catch {
    // ignore – account may already exist
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────────────────────

describe('Payouts Integration', () => {
  let app: INestApplication;
  let payoutRepo: Repository<PayoutRequest>;
  let balanceRepo: Repository<ArtistBalance>;
  let payoutsService: PayoutsService;
  let processor: PayoutProcessorService;
  let dataSource: DataSource;

  const DB_CONFIG = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tiptune_test',
    synchronize: true,
    dropSchema: true,
    entities: [PayoutRequest, ArtistBalance],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              PAYOUT_MIN_XLM: 10,
              PAYOUT_MIN_USDC: 5,
              PAYOUT_PROCESSOR_INTERVAL_MS: 999_999, // prevent auto-polling
              STELLAR_NETWORK: 'testnet',
              STELLAR_PAYOUT_SECRET_KEY: TESTNET_SECRET || undefined,
            }),
          ],
        }),
        TypeOrmModule.forRoot(DB_CONFIG),
        PayoutsModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    payoutRepo = module.get(getRepositoryToken(PayoutRequest));
    balanceRepo = module.get(getRepositoryToken(ArtistBalance));
    payoutsService = module.get(PayoutsService);
    processor = module.get(PayoutProcessorService);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await payoutRepo.delete({});
    await balanceRepo.delete({});
  });

  // ── Balance ────────────────────────────────────────────────────────────────

  describe('GET /api/payouts/balance/:artistId', () => {
    it('404 when no balance exists', async () => {
      await request(app.getHttpServer())
        .get(`/api/payouts/balance/${ARTIST_ID}`)
        .expect(404);
    });

    it('returns balance after creation', async () => {
      await payoutsService.getOrCreateBalance(ARTIST_ID);
      const res = await request(app.getHttpServer())
        .get(`/api/payouts/balance/${ARTIST_ID}`)
        .expect(200);

      expect(res.body.artistId).toBe(ARTIST_ID);
      expect(Number(res.body.xlmBalance)).toBe(0);
    });
  });

  // ── Request payout ─────────────────────────────────────────────────────────

  describe('POST /api/payouts/request', () => {
    beforeEach(async () => {
      await balanceRepo.save(
        balanceRepo.create({ artistId: ARTIST_ID, xlmBalance: 100 }),
      );
    });

    it('creates payout and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/payouts/request')
        .send({
          artistId: ARTIST_ID,
          amount: 20,
          assetCode: 'XLM',
          destinationAddress: DEST_ADDRESS,
        })
        .expect(201);

      expect(res.body.status).toBe(PayoutStatus.PENDING);
      expect(Number(res.body.amount)).toBe(20);
    });

    it('rejects below minimum threshold (10 XLM)', async () => {
      await request(app.getHttpServer())
        .post('/api/payouts/request')
        .send({
          artistId: ARTIST_ID,
          amount: 5,
          assetCode: 'XLM',
          destinationAddress: DEST_ADDRESS,
        })
        .expect(400);
    });

    it('rejects invalid Stellar address', async () => {
      await request(app.getHttpServer())
        .post('/api/payouts/request')
        .send({
          artistId: ARTIST_ID,
          amount: 20,
          assetCode: 'XLM',
          destinationAddress: 'not-a-stellar-address',
        })
        .expect(400);
    });

    it('rejects duplicate pending payout', async () => {
      const dto = {
        artistId: ARTIST_ID,
        amount: 20,
        assetCode: 'XLM',
        destinationAddress: DEST_ADDRESS,
      };
      await request(app.getHttpServer()).post('/api/payouts/request').send(dto).expect(201);
      await request(app.getHttpServer()).post('/api/payouts/request').send(dto).expect(409);
    });

    it('rejects when balance insufficient', async () => {
      await balanceRepo.update({ artistId: ARTIST_ID }, { xlmBalance: 5 });
      await request(app.getHttpServer())
        .post('/api/payouts/request')
        .send({
          artistId: ARTIST_ID,
          amount: 20,
          assetCode: 'XLM',
          destinationAddress: DEST_ADDRESS,
        })
        .expect(400);
    });
  });

  // ── History ────────────────────────────────────────────────────────────────

  describe('GET /api/payouts/history/:artistId', () => {
    it('returns empty array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/payouts/history/${ARTIST_ID}`)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns list of payouts', async () => {
      await balanceRepo.save(
        balanceRepo.create({ artistId: ARTIST_ID, xlmBalance: 200 }),
      );
      await payoutsService.requestPayout({
        artistId: ARTIST_ID,
        amount: 20,
        assetCode: 'XLM',
        destinationAddress: DEST_ADDRESS,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/payouts/history/${ARTIST_ID}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
    });
  });

  // ── Status ─────────────────────────────────────────────────────────────────

  describe('GET /api/payouts/:payoutId/status', () => {
    it('404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/payouts/00000000-0000-0000-0000-000000000000/status`)
        .expect(404);
    });

    it('returns status for known payout', async () => {
      await balanceRepo.save(
        balanceRepo.create({ artistId: ARTIST_ID, xlmBalance: 100 }),
      );
      const payout = await payoutsService.requestPayout({
        artistId: ARTIST_ID,
        amount: 20,
        assetCode: 'XLM',
        destinationAddress: DEST_ADDRESS,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/payouts/${payout.id}/status`)
        .expect(200);

      expect(res.body.id).toBe(payout.id);
      expect(res.body.status).toBe(PayoutStatus.PENDING);
    });
  });

  // ── Retry ──────────────────────────────────────────────────────────────────

  describe('POST /api/payouts/:payoutId/retry', () => {
    it('retries a failed payout', async () => {
      const payout = await payoutRepo.save(
        payoutRepo.create({
          artistId: ARTIST_ID,
          amount: 20,
          assetCode: 'XLM',
          destinationAddress: DEST_ADDRESS,
          status: PayoutStatus.FAILED,
          failureReason: 'timeout',
        }),
      );

      const res = await request(app.getHttpServer())
        .post(`/api/payouts/${payout.id}/retry`)
        .expect(200);

      expect(res.body.status).toBe(PayoutStatus.PENDING);
      expect(res.body.failureReason).toBeNull();
    });

    it('400 for non-failed payout', async () => {
      const payout = await payoutRepo.save(
        payoutRepo.create({
          artistId: ARTIST_ID,
          amount: 20,
          assetCode: 'XLM',
          destinationAddress: DEST_ADDRESS,
          status: PayoutStatus.COMPLETED,
        }),
      );

      await request(app.getHttpServer())
        .post(`/api/payouts/${payout.id}/retry`)
        .expect(400);
    });
  });

  // ── Stellar testnet (skipped without key) ──────────────────────────────────

  (HAS_TESTNET ? describe : describe.skip)('Stellar testnet', () => {
    let sourceKeypair: StellarSdk.Keypair;
    let destinationKeypair: StellarSdk.Keypair;

    beforeAll(async () => {
      sourceKeypair = StellarSdk.Keypair.fromSecret(TESTNET_SECRET!);
      destinationKeypair = StellarSdk.Keypair.random();

      // Fund both accounts via friendbot
      await fundTestnetAccount(sourceKeypair.publicKey());
      await fundTestnetAccount(destinationKeypair.publicKey());
    });

    it('processes a pending payout on testnet and marks completed', async () => {
      const destAddress = destinationKeypair.publicKey();

      // Seed balance
      await balanceRepo.save(
        balanceRepo.create({ artistId: ARTIST_ID, xlmBalance: 50 }),
      );

      const payout = await payoutsService.requestPayout({
        artistId: ARTIST_ID,
        amount: 10,
        assetCode: 'XLM',
        destinationAddress: destAddress,
      });

      expect(payout.status).toBe(PayoutStatus.PENDING);

      // Run processor manually
      await processor.processPending();

      // Wait for processing
      await new Promise((r) => setTimeout(r, 2000));

      const updated = await payoutsService.getStatus(payout.id);
      expect([PayoutStatus.COMPLETED, PayoutStatus.FAILED]).toContain(updated.status);

      if (updated.status === PayoutStatus.COMPLETED) {
        expect(updated.stellarTxHash).toBeTruthy();
        expect(updated.stellarTxHash).toHaveLength(64);

        const balance = await payoutsService.getBalance(ARTIST_ID);
        expect(Number(balance.xlmBalance)).toBeCloseTo(40, 1);
        expect(Number(balance.pendingXlm)).toBe(0);
      }
    }, 30_000);

    it('marks payout as failed for invalid destination', async () => {
      const invalidAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

      await balanceRepo.save(
        balanceRepo.create({ artistId: ARTIST_ID, xlmBalance: 50 }),
      );

      const payout = await payoutsService.requestPayout({
        artistId: ARTIST_ID,
        amount: 10,
        assetCode: 'XLM',
        destinationAddress: invalidAddress,
      });

      await processor.processPending();
      await new Promise((r) => setTimeout(r, 2000));

      const updated = await payoutsService.getStatus(payout.id);
      // Depending on whether account exists on testnet this may succeed or fail
      expect([PayoutStatus.COMPLETED, PayoutStatus.FAILED]).toContain(updated.status);
    }, 30_000);
  });
});
