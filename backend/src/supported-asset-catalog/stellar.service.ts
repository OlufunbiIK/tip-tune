import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  StellarToml,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { AssetsService } from '../assets/assets.service';
import { SupportedAsset } from '../assets/entities/supported-asset.entity';
import {
  AssetNotFoundException,
  AssetNotEnabledException,
} from '../assets/assets.exceptions';

export interface ConversionResult {
  fromAsset: SupportedAsset;
  toAsset: SupportedAsset;
  /** Stellar path-payment paths discovered by the Horizon path-finding endpoint */
  paths: Asset[][];
  /** Best quoted source amount for 1 unit of destination */
  bestRate: string | null;
}

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;

  constructor(private readonly assetsService: AssetsService) {}

  onModuleInit() {
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
    this.server = new Horizon.Server(horizonUrl, { allowHttp: false });
    this.logger.log(`Stellar Horizon connected → ${horizonUrl}`);
  }

  // ── Asset helpers ──────────────────────────────────────────────────────────

  /**
   * Convert a SupportedAsset entity into the SDK's Asset object.
   * Native XLM is handled transparently.
   */
  toSdkAsset(asset: SupportedAsset): Asset {
    if (asset.isNative) return Asset.native();
    if (!asset.issuer) {
      throw new Error(
        `SupportedAsset ${asset.code} is not native but has no issuer – data integrity error`,
      );
    }
    return new Asset(asset.code, asset.issuer);
  }

  /**
   * Resolve a Stellar asset from the supported catalog in an issuer-aware way.
   *
   * This is the **single entry point** for any service that needs to turn a
   * (code, issuer?) pair into a verified, enabled SupportedAsset.
   *
   * @throws AssetNotFoundException       – asset not in catalog
   * @throws AssetNotEnabledException     – asset disabled by admin
   * @throws AmbiguousAssetException      – multiple issuers, no explicit issuer param
   * @throws IssuerRequiredException      – non-XLM asset with no issuer
   */
  async resolveAsset(
    code: string,
    issuer?: string | null,
    artistId?: string,
  ): Promise<SupportedAsset> {
    return this.assetsService.resolve(code, issuer, artistId);
  }

  // ── Conversion / path-finding ──────────────────────────────────────────────

  /**
   * Perform an issuer-aware conversion lookup between two supported assets.
   *
   * Both assets must be in the enabled supported catalog before the Horizon
   * path-finding query is executed.  This prevents silent fallbacks to
   * unsupported issuers.
   *
   * @param fromCode     Source asset code
   * @param fromIssuer   Source asset issuer (null / undefined for XLM)
   * @param toCode       Destination asset code
   * @param toIssuer     Destination asset issuer (null / undefined for XLM)
   * @param artistId     Optional artist scope for catalog resolution
   */
  async getConversionPaths(
    fromCode: string,
    fromIssuer: string | null | undefined,
    toCode: string,
    toIssuer: string | null | undefined,
    artistId?: string,
  ): Promise<ConversionResult> {
    // ── 1. Validate both assets against the supported catalog ─────────────────
    const [fromAsset, toAsset] = await Promise.all([
      this.assetsService.resolve(fromCode, fromIssuer, artistId),
      this.assetsService.resolve(toCode, toIssuer, artistId),
    ]);

    const sdkFrom = this.toSdkAsset(fromAsset);
    const sdkTo = this.toSdkAsset(toAsset);

    this.logger.debug(
      `Path-finding ${fromAsset.catalogKey} → ${toAsset.catalogKey}`,
    );

    // ── 2. Query Horizon strict-receive path-finding ───────────────────────────
    try {
      const result = await this.server
        .strictReceivePaths(
          [sdkFrom],
          sdkTo,
          '1', // destination amount used for rate discovery
        )
        .call();

      const paths = result.records.map((r) =>
        r.path.map((p) =>
          p.asset_type === 'native'
            ? Asset.native()
            : new Asset(p.asset_code!, p.asset_issuer!),
        ),
      );

      // Best rate = smallest source_amount (cheapest path for 1 unit dest)
      const bestRate =
        result.records.length > 0
          ? result.records
              .map((r) => parseFloat(r.source_amount))
              .sort((a, b) => a - b)[0]
              .toFixed(fromAsset.decimals)
          : null;

      return { fromAsset, toAsset, paths, bestRate };
    } catch (err: any) {
      this.logger.error(
        `Horizon path-finding failed for ${fromAsset.catalogKey} → ${toAsset.catalogKey}: ${err?.message}`,
      );
      // Re-throw as-is; callers can decide on fallback behaviour
      throw err;
    }
  }

  /**
   * Simple spot-rate helper: returns how many units of `fromCode` are needed
   * to receive 1 unit of `toCode`, or null if no path exists.
   */
  async getSpotRate(
    fromCode: string,
    fromIssuer: string | null | undefined,
    toCode: string,
    toIssuer: string | null | undefined,
    artistId?: string,
  ): Promise<string | null> {
    const { bestRate } = await this.getConversionPaths(
      fromCode,
      fromIssuer,
      toCode,
      toIssuer,
      artistId,
    );
    return bestRate;
  }

  // ── Catalog convenience ────────────────────────────────────────────────────

  /**
   * Check whether an asset (by catalog key) is currently supported and enabled.
   * Delegates entirely to AssetsService so the source-of-truth stays there.
   */
  async isAssetSupported(
    code: string,
    issuer?: string | null,
    artistId?: string,
  ): Promise<boolean> {
    return this.assetsService.isSupported(code, issuer, artistId);
  }

  /**
   * Load the full enabled catalog as an SDK-Asset map.
   * Useful for batch payment ingestion where per-asset resolve calls would be slow.
   */
  async getSdkAssetMap(
    artistId?: string,
  ): Promise<Map<string, Asset>> {
    const catalog = await this.assetsService.buildCatalogMap(artistId);
    const map = new Map<string, Asset>();
    for (const [key, asset] of catalog) {
      map.set(key, this.toSdkAsset(asset));
    }
    return map;
  }
}
