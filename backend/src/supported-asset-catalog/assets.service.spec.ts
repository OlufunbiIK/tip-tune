import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AssetsService } from './assets.service';
import { AssetScope, SupportedAsset } from './entities/supported-asset.entity';
import { CreateSupportedAssetDto } from './dto/assets.dto';
import {
  AmbiguousAssetException,
  AssetAlreadyExistsException,
  AssetNotEnabledException,
  AssetNotFoundException,
  IssuerRequiredException,
} from './assets.exceptions';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ISSUER_A = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const ISSUER_B = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function makeAsset(overrides: Partial<SupportedAsset> = {}): SupportedAsset {
  const a = new SupportedAsset();
  a.id = overrides.id ?? 'uuid-1';
  a.code = overrides.code ?? 'USDC';
  a.issuer = overrides.issuer !== undefined ? overrides.issuer : ISSUER_A;
  a.name = overrides.name ?? 'USD Coin';
  a.logoUrl = overrides.logoUrl ?? null;
  a.decimals = overrides.decimals ?? 7;
  a.scope = overrides.scope ?? AssetScope.GLOBAL;
  a.artistId = overrides.artistId ?? null;
  a.isEnabled = overrides.isEnabled !== undefined ? overrides.isEnabled : true;
  a.createdAt = new Date('2024-01-01');
  a.updatedAt = new Date('2024-01-01');
  return a;
}

const XLM_ASSET = makeAsset({ id: 'xlm-uuid', code: 'XLM', issuer: null, name: 'Stellar Lumens' });

// ── Repo mock factory ─────────────────────────────────────────────────────────

type MockRepo = Partial<Record<keyof Repository<SupportedAsset>, jest.Mock>>;

function mockRepo(overrides: MockRepo = {}): MockRepo {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => Object.assign(new SupportedAsset(), dto)),
    save: jest.fn((entity) => Promise.resolve(entity)),
    remove: jest.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssetsService', () => {
  let service: AssetsService;
  let repo: MockRepo;

  beforeEach(async () => {
    repo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: getRepositoryToken(SupportedAsset), useValue: repo },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a global asset successfully', async () => {
      repo.findOne!.mockResolvedValue(null);
      repo.save!.mockImplementation((e) => Promise.resolve({ ...e, id: 'new-uuid' }));

      const dto: CreateSupportedAssetDto = {
        code: 'USDC',
        issuer: ISSUER_A,
        name: 'USD Coin',
        scope: AssetScope.GLOBAL,
      };
      const result = await service.create(dto);

      expect(result.code).toBe('USDC');
      expect(result.issuer).toBe(ISSUER_A);
      expect(result.isEnabled).toBe(true);
    });

    it('creates XLM (native, no issuer)', async () => {
      repo.findOne!.mockResolvedValue(null);

      const dto: CreateSupportedAssetDto = {
        code: 'XLM',
        name: 'Stellar Lumens',
      };
      const result = await service.create(dto);
      expect(result.issuer).toBeNull();
    });

    it('throws IssuerRequiredException for non-XLM without issuer', async () => {
      const dto: CreateSupportedAssetDto = { code: 'USDC', name: 'USD Coin' };
      await expect(service.create(dto)).rejects.toBeInstanceOf(IssuerRequiredException);
    });

    it('throws AssetAlreadyExistsException for duplicate (code, issuer)', async () => {
      repo.findOne!.mockResolvedValue(makeAsset());

      const dto: CreateSupportedAssetDto = {
        code: 'USDC',
        issuer: ISSUER_A,
        name: 'USD Coin',
      };
      await expect(service.create(dto)).rejects.toBeInstanceOf(AssetAlreadyExistsException);
    });

    it('creates an artist-scoped asset', async () => {
      repo.findOne!.mockResolvedValue(null);

      const dto: CreateSupportedAssetDto = {
        code: 'TIP',
        issuer: ISSUER_A,
        name: 'TipTune Token',
        scope: AssetScope.ARTIST,
        artistId: 'artist-123',
      };
      const result = await service.create(dto);
      expect(result.scope).toBe(AssetScope.ARTIST);
      expect(result.artistId).toBe('artist-123');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns global assets when no artistId given', async () => {
      const globalAsset = makeAsset({ scope: AssetScope.GLOBAL });
      repo.find!.mockResolvedValue([globalAsset]);

      const results = await service.findAll({});

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ scope: AssetScope.GLOBAL }),
          ]),
        }),
      );
      expect(results).toHaveLength(1);
    });

    it('includes artist-scoped assets when artistId is provided', async () => {
      const globalAsset = makeAsset({ id: 'g1', scope: AssetScope.GLOBAL });
      const artistAsset = makeAsset({
        id: 'a1',
        code: 'TIP',
        scope: AssetScope.ARTIST,
        artistId: 'artist-123',
      });
      repo.find!.mockResolvedValue([globalAsset, artistAsset]);

      const results = await service.findAll({ artistId: 'artist-123' });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ scope: AssetScope.ARTIST, artistId: 'artist-123' }),
          ]),
        }),
      );
      expect(results).toHaveLength(2);
    });
  });

  // ── resolve ─────────────────────────────────────────────────────────────────

  describe('resolve()', () => {
    // ── XLM (native) ──────────────────────────────────────────────────────────

    it('resolves XLM by code with no issuer', async () => {
      repo.findOne!.mockResolvedValue(XLM_ASSET);

      const result = await service.resolve('XLM');
      expect(result.code).toBe('XLM');
      expect(result.issuer).toBeNull();
    });

    it('throws AssetNotFoundException when XLM not in catalog', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.resolve('XLM')).rejects.toBeInstanceOf(AssetNotFoundException);
    });

    it('throws AssetNotEnabledException for disabled XLM', async () => {
      repo.findOne!.mockResolvedValue({ ...XLM_ASSET, isEnabled: false });
      await expect(service.resolve('XLM')).rejects.toBeInstanceOf(AssetNotEnabledException);
    });

    // ── Non-native with explicit issuer ────────────────────────────────────────

    it('resolves a non-native asset with explicit issuer', async () => {
      const usdc = makeAsset();
      repo.findOne!.mockResolvedValue(usdc);

      const result = await service.resolve('USDC', ISSUER_A);
      expect(result.issuer).toBe(ISSUER_A);
    });

    it('throws AssetNotFoundException for unknown (code, issuer) pair', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.resolve('USDC', ISSUER_A)).rejects.toBeInstanceOf(
        AssetNotFoundException,
      );
    });

    it('throws AssetNotEnabledException for disabled asset with explicit issuer', async () => {
      repo.findOne!.mockResolvedValue(makeAsset({ isEnabled: false }));
      await expect(service.resolve('USDC', ISSUER_A)).rejects.toBeInstanceOf(
        AssetNotEnabledException,
      );
    });

    // ── Non-native without issuer (ambiguity checks) ───────────────────────────

    it('resolves unambiguously when exactly one enabled match exists', async () => {
      const usdc = makeAsset({ scope: AssetScope.GLOBAL });
      repo.find!.mockResolvedValue([usdc]);

      const result = await service.resolve('USDC');
      expect(result.issuer).toBe(ISSUER_A);
    });

    it('throws AmbiguousAssetException when multiple enabled issuers exist', async () => {
      const usdcA = makeAsset({ id: '1', issuer: ISSUER_A });
      const usdcB = makeAsset({ id: '2', issuer: ISSUER_B });
      repo.find!.mockResolvedValue([usdcA, usdcB]);

      await expect(service.resolve('USDC')).rejects.toBeInstanceOf(AmbiguousAssetException);
    });

    it('resolves when one of two candidates is disabled (only one enabled)', async () => {
      const usdcA = makeAsset({ id: '1', issuer: ISSUER_A, isEnabled: true });
      const usdcB = makeAsset({ id: '2', issuer: ISSUER_B, isEnabled: false });
      repo.find!.mockResolvedValue([usdcA, usdcB]);

      const result = await service.resolve('USDC');
      expect(result.issuer).toBe(ISSUER_A);
    });

    it('throws AssetNotEnabledException when all candidates are disabled', async () => {
      const usdcA = makeAsset({ id: '1', isEnabled: false });
      repo.find!.mockResolvedValue([usdcA]);

      await expect(service.resolve('USDC')).rejects.toBeInstanceOf(AssetNotEnabledException);
    });

    it('throws AssetNotFoundException when no candidates found without issuer', async () => {
      repo.find!.mockResolvedValue([]);
      await expect(service.resolve('USDC')).rejects.toBeInstanceOf(AssetNotFoundException);
    });

    // ── Artist-scoped resolution ───────────────────────────────────────────────

    it('includes artist-scoped asset in resolution when artistId provided', async () => {
      const artistAsset = makeAsset({
        code: 'TIP',
        issuer: ISSUER_A,
        scope: AssetScope.ARTIST,
        artistId: 'artist-xyz',
      });
      repo.find!.mockResolvedValue([artistAsset]);

      const result = await service.resolve('TIP', undefined, 'artist-xyz');
      expect(result.scope).toBe(AssetScope.ARTIST);
      expect(result.artistId).toBe('artist-xyz');
    });

    it('does not expose artist-scoped asset when no artistId given', async () => {
      // No global TIP asset, artist-scoped not queried → empty results
      repo.find!.mockResolvedValue([]);
      await expect(service.resolve('TIP')).rejects.toBeInstanceOf(AssetNotFoundException);
    });
  });

  // ── enable / disable ────────────────────────────────────────────────────────

  describe('enable() / disable()', () => {
    it('enables a disabled asset', async () => {
      const asset = makeAsset({ isEnabled: false });
      repo.findOne!.mockResolvedValue(asset);
      repo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.enable(asset.id);
      expect(result.isEnabled).toBe(true);
    });

    it('disables an enabled asset', async () => {
      const asset = makeAsset({ isEnabled: true });
      repo.findOne!.mockResolvedValue(asset);
      repo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.disable(asset.id);
      expect(result.isEnabled).toBe(false);
    });

    it('throws AssetNotFoundException when enabling unknown id', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.enable('bad-uuid')).rejects.toBeInstanceOf(AssetNotFoundException);
    });
  });

  // ── isSupported ─────────────────────────────────────────────────────────────

  describe('isSupported()', () => {
    it('returns true for enabled asset', async () => {
      repo.findOne!.mockResolvedValue(makeAsset());
      expect(await service.isSupported('USDC', ISSUER_A)).toBe(true);
    });

    it('returns false for disabled asset', async () => {
      repo.findOne!.mockResolvedValue(makeAsset({ isEnabled: false }));
      expect(await service.isSupported('USDC', ISSUER_A)).toBe(false);
    });

    it('returns false for unknown asset', async () => {
      repo.findOne!.mockResolvedValue(null);
      expect(await service.isSupported('FAKE', ISSUER_A)).toBe(false);
    });
  });

  // ── buildCatalogMap ──────────────────────────────────────────────────────────

  describe('buildCatalogMap()', () => {
    it('builds a map keyed by catalogKey', async () => {
      const usdc = makeAsset({ id: '1', code: 'USDC', issuer: ISSUER_A });
      const xlm = makeAsset({ id: '2', code: 'XLM', issuer: null });
      repo.find!.mockResolvedValue([usdc, xlm]);

      const map = await service.buildCatalogMap();

      expect(map.has(`USDC:${ISSUER_A}`)).toBe(true);
      expect(map.has('XLM:native')).toBe(true);
    });
  });
});
