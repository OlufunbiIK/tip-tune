import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ArtistBalance } from './artist-balance.entity';
import { PayoutRequest, PayoutStatus } from './payout-request.entity';
import { Tip, TipStatus } from '../tips/entities/tip.entity';

export interface PayoutReconciliationResult {
  artistId: string;
  assetCode: 'XLM' | 'USDC';
  expectedAvailable: number;
  actualAvailable: number;
  expectedPending: number;
  actualPending: number;
  issue?: string;
  repaired: boolean;
}

@Injectable()
export class PayoutReconciliationService {
  private readonly logger = new Logger(PayoutReconciliationService.name);

  constructor(
    @InjectRepository(ArtistBalance)
    private readonly balanceRepo: Repository<ArtistBalance>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(Tip)
    private readonly tipRepo: Repository<Tip>,
    private readonly dataSource: DataSource,
  ) {}

  async reconcileArtist(artistId: string, repair = false): Promise<PayoutReconciliationResult[]> {
    const balance = await this.balanceRepo.findOne({ where: { artistId } });
    if (!balance) return [];

    const [tipTotals, payoutTotals] = await Promise.all([
      this.tipRepo
        .createQueryBuilder('tip')
        .select("SUM(CASE WHEN tip.assetCode = 'XLM' THEN tip.amount ELSE 0 END)", 'totalXLM')
        .addSelect("SUM(CASE WHEN tip.assetCode = 'USDC' THEN tip.amount ELSE 0 END)", 'totalUSDC')
        .where('tip.artistId = :artistId', { artistId })
        .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
        .getRawOne(),
      this.payoutRepo
        .createQueryBuilder('payout')
        .select(
          "SUM(CASE WHEN payout.assetCode = 'XLM' AND payout.status IN ('pending','processing') THEN payout.amount ELSE 0 END)",
          'pendingXLM',
        )
        .addSelect(
          "SUM(CASE WHEN payout.assetCode = 'USDC' AND payout.status IN ('pending','processing') THEN payout.amount ELSE 0 END)",
          'pendingUSDC',
        )
        .addSelect(
          "SUM(CASE WHEN payout.assetCode = 'XLM' AND payout.status = 'completed' THEN payout.amount ELSE 0 END)",
          'completedXLM',
        )
        .addSelect(
          "SUM(CASE WHEN payout.assetCode = 'USDC' AND payout.status = 'completed' THEN payout.amount ELSE 0 END)",
          'completedUSDC',
        )
        .where('payout.artistId = :artistId', { artistId })
        .getRawOne(),
    ]);

    const totalTipXLM = parseFloat(tipTotals.totalXLM || 0);
    const totalTipUSDC = parseFloat(tipTotals.totalUSDC || 0);
    const pendingXLM = parseFloat(payoutTotals.pendingXLM || 0);
    const pendingUSDC = parseFloat(payoutTotals.pendingUSDC || 0);
    const completedXLM = parseFloat(payoutTotals.completedXLM || 0);
    const completedUSDC = parseFloat(payoutTotals.completedUSDC || 0);

    const expectedAvailableXLM = totalTipXLM - completedXLM - pendingXLM;
    const expectedAvailableUSDC = totalTipUSDC - completedUSDC - pendingUSDC;
    const actualAvailableXLM = Number(balance.xlmBalance);
    const actualAvailableUSDC = Number(balance.usdcBalance);
    const actualPendingXLM = Number(balance.pendingXlm);
    const actualPendingUSDC = Number(balance.pendingUsdc);

    const discrepancies: PayoutReconciliationResult[] = [];

    if (Math.abs(expectedAvailableXLM - actualAvailableXLM) > 0.000001 || Math.abs(expectedPendingXLM - actualPendingXLM) > 0.000001) {
      discrepancies.push({
        artistId,
        assetCode: 'XLM',
        expectedAvailable: expectedAvailableXLM,
        actualAvailable: actualAvailableXLM,
        expectedPending: pendingXLM,
        actualPending: actualPendingXLM,
        issue: `XLM balance mismatch`,
        repaired: false,
      });
    }

    if (Math.abs(expectedAvailableUSDC - actualAvailableUSDC) > 0.000001 || Math.abs(expectedPendingUSDC - actualPendingUSDC) > 0.000001) {
      discrepancies.push({
        artistId,
        assetCode: 'USDC',
        expectedAvailable: expectedAvailableUSDC,
        actualAvailable: actualAvailableUSDC,
        expectedPending: pendingUSDC,
        actualPending: actualPendingUSDC,
        issue: `USDC balance mismatch`,
        repaired: false,
      });
    }

    if (repair && discrepancies.length > 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(ArtistBalance, { artistId }, {
          xlmBalance: expectedAvailableXLM,
          usdcBalance: expectedAvailableUSDC,
          pendingXlm: pendingXLM,
          pendingUsdc: pendingUSDC,
        });
      });

      for (const d of discrepancies) {
        d.repaired = true;
      }

      this.logger.warn(`Payout reconciliation repaired ${discrepancies.length} discrepancy(ies) for artist ${artistId}`);
    }

    return discrepancies;
  }

  async reconcileAllArtists(repair = false): Promise<PayoutReconciliationResult[]> {
    const balances = await this.balanceRepo.find();
    const results: PayoutReconciliationResult[] = [];

    for (const b of balances) {
      const res = await this.reconcileArtist(b.artistId, repair);
      results.push(...res);
    }

    return results;
  }
}
