import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetScope, SupportedAsset } from './entities/supported-asset.entity';
import {
  AmbiguousAssetException,
  AssetNotEnabledException,
  AssetNotFoundException,
  IssuerRequiredException,
} from './assets.exceptions';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Skip real JWT / admin guards for controller-layer tests
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('../auth/guards/admin.guard', () => ({
  AdminGuard: class {
    canActivate() {
      return true;
    }
  },
}));

const ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

function makeAsset(overrides: Partial<SupportedAsset> = {}): SupportedAsset {
  const a = new SupportedAsset();
  a.id = overrides.id ?? 'uuid-1';
  a.code = overrides.code ?? 'USDC';
  a.issuer = overrides.issuer !== undefined ? overrides.issuer : ISSUER;
  a.name = overrides.name ?? 'USD Coin';
  a.logoUrl = null;
  a.decimals = 7;
  a.scope = overrides.scope ?? AssetScope.GLOBAL;
  a.artistId = overrides.artistId ?? null;
  a.isEnabled = overrides.isEnabled !== undefined ? overrides.isEnabled : true;
  a.createdAt = new Date();
  a.updatedAt = new Date();
  return a;
}

const mockAssetsService: Partial<Record<keyof AssetsService, jest.Mock>> = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  remove: jest.fn(),
  resolve: jest.fn(),
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('AssetsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [
        { provide: AssetsService, useValue: mockAssetsService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  // ── GET /v1/assets ────────────────────────────────────────────────────────

  describe('GET /v1/assets', () => {
    it('returns global asset list', async () => {
      const assets = [makeAsset()];
      mockAssetsService.findAll!.mockResolvedValue(assets);

      const res = await request(app.getHttpServer()).get('/v1/assets').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].code).toBe('USDC');
    });

    it('passes artistId query to service', async () => {
      mockAssetsService.findAll!.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/v1/assets?artistId=artist-123')
        .expect(200);

      expect(mockAssetsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ artistId: 'artist-123' }),
      );
    });

    it('passes enabledOnly query to service', async () => {
      mockAssetsService.findAll!.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/v1/assets?enabledOnly=true')
        .expect(200);

      expect(mockAssetsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ enabledOnly: true }),
      );
    });
  });

  // ── GET /v1/assets/resolve ────────────────────────────────────────────────

  describe('GET /v1/assets/resolve', () => {
    it('resolves XLM with no issuer', async () => {
      const xlm = makeAsset({ code: 'XLM', issuer: null });
      mockAssetsService.resolve!.mockResolvedValue(xlm);

      const res = await request(app.getHttpServer())
        .get('/v1/assets/resolve?code=XLM')
        .expect(200);

      expect(res.body.code).toBe('XLM');
    });

    it('resolves USDC with issuer param', async () => {
      mockAssetsService.resolve!.mockResolvedValue(makeAsset());

      await request(app.getHttpServer())
        .get(`/v1/assets/resolve?code=USDC&issuer=${ISSUER}`)
        .expect(200);

      expect(mockAssetsService.resolve).toHaveBeenCalledWith('USDC', ISSUER, undefined);
    });

    it('returns 400 when ambiguous', async () => {
      mockAssetsService.resolve!.mockRejectedValue(new AmbiguousAssetException('USDC'));

      await request(app.getHttpServer())
        .get('/v1/assets/resolve?code=USDC')
        .expect(400);
    });

    it('returns 404 for unknown asset', async () => {
      mockAssetsService.resolve!.mockRejectedValue(new AssetNotFoundException('FAKE', ISSUER));

      await request(app.getHttpServer())
        .get(`/v1/assets/resolve?code=FAKE&issuer=${ISSUER}`)
        .expect(404);
    });

    it('returns 422 for disabled asset', async () => {
      mockAssetsService.resolve!.mockRejectedValue(new AssetNotEnabledException('USDC', ISSUER));

      await request(app.getHttpServer())
        .get(`/v1/assets/resolve?code=USDC&issuer=${ISSUER}`)
        .expect(422);
    });

    it('returns 400 when code is missing', async () => {
      await request(app.getHttpServer())
        .get('/v1/assets/resolve')
        .expect(400);
    });
  });

  // ── GET /v1/assets/:id ────────────────────────────────────────────────────

  describe('GET /v1/assets/:id', () => {
    it('returns asset by id', async () => {
      const asset = makeAsset();
      mockAssetsService.findOne!.mockResolvedValue(asset);

      const res = await request(app.getHttpServer())
        .get('/v1/assets/uuid-1')
        .expect(200);

      expect(res.body.id).toBe('uuid-1');
    });

    it('returns 404 for unknown id', async () => {
      mockAssetsService.findOne!.mockRejectedValue(new AssetNotFoundException('uuid-1'));

      await request(app.getHttpServer())
        .get('/v1/assets/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ── POST /v1/assets ───────────────────────────────────────────────────────

  describe('POST /v1/assets (admin)', () => {
    it('creates a global asset', async () => {
      const created = makeAsset();
      mockAssetsService.create!.mockResolvedValue(created);

      const res = await request(app.getHttpServer())
        .post('/v1/assets')
        .send({ code: 'USDC', issuer: ISSUER, name: 'USD Coin' })
        .expect(201);

      expect(res.body.code).toBe('USDC');
    });

    it('returns 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/v1/assets')
        .send({ code: 'USDC', issuer: ISSUER })
        .expect(400);
    });

    it('returns 400 when service rejects (no issuer for non-XLM)', async () => {
      mockAssetsService.create!.mockRejectedValue(new IssuerRequiredException('USDC'));

      const res = await request(app.getHttpServer())
        .post('/v1/assets')
        .send({ code: 'USDC', name: 'USD Coin' })
        .expect(400);

      expect(res.body.message).toMatch(/issuer/i);
    });
  });

  // ── PATCH /v1/assets/:id/enable ───────────────────────────────────────────

  describe('PATCH /v1/assets/:id/enable', () => {
    it('enables an asset and returns 200', async () => {
      const asset = makeAsset({ isEnabled: true });
      mockAssetsService.enable!.mockResolvedValue(asset);

      const res = await request(app.getHttpServer())
        .patch('/v1/assets/uuid-1/enable')
        .expect(200);

      expect(res.body.isEnabled).toBe(true);
    });
  });

  // ── PATCH /v1/assets/:id/disable ──────────────────────────────────────────

  describe('PATCH /v1/assets/:id/disable', () => {
    it('disables an asset and returns 200', async () => {
      const asset = makeAsset({ isEnabled: false });
      mockAssetsService.disable!.mockResolvedValue(asset);

      const res = await request(app.getHttpServer())
        .patch('/v1/assets/uuid-1/disable')
        .expect(200);

      expect(res.body.isEnabled).toBe(false);
    });
  });

  // ── DELETE /v1/assets/:id ─────────────────────────────────────────────────

  describe('DELETE /v1/assets/:id', () => {
    it('removes an asset and returns 204', async () => {
      mockAssetsService.remove!.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/v1/assets/uuid-1')
        .expect(204);
    });
  });
});
