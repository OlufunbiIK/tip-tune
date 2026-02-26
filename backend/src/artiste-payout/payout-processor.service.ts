import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import StellarSdk from 'stellar-sdk';
import { PayoutRequest, PayoutStatus } from './entities/payout-request.entity';
import { PayoutsService } from './payouts.service';

@Injectable()
export class PayoutProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PayoutProcessorService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private readonly server: StellarSdk.Server;
  private readonly networkPassphrase: string;
  private readonly sourceKeypair: StellarSdk.Keypair;
  private readonly usdcAsset: StellarSdk.Asset;

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly payoutsService: PayoutsService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    const isTestnet = this.config.get<string>('STELLAR_NETWORK', 'testnet') === 'testnet';
    const horizonUrl = this.config.get<string>(
      'STELLAR_HORIZON_URL',
      isTestnet ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org',
    );

    this.server = new StellarSdk.Server(horizonUrl);
    this.networkPassphrase = isTestnet
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC;

    const secretKey = this.config.get<string>('STELLAR_PAYOUT_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STELLAR_PAYOUT_SECRET_KEY not set – processor will be inactive');
    } else {
      this.sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    }

    const usdcIssuer = this.config.get<string>('USDC_ISSUER_ADDRESS', '');
    this.usdcAsset = new StellarSdk.Asset('USDC', usdcIssuer);
  }

  onModuleInit() {
    const intervalMs = this.config.get<number>('PAYOUT_PROCESSOR_INTERVAL_MS', 30_000);
    this.intervalHandle = setInterval(() => this.processPending(), intervalMs);
    this.logger.log(`Payout processor started – polling every ${intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  // ---------------------------------------------------------------------------
  // Main processing loop
  // ---------------------------------------------------------------------------

  async processPending(): Promise<void> {
    if (this.isProcessing) return;
    if (!this.sourceKeypair) return;

    this.isProcessing = true;
    try {
      const pending = await this.payoutsService.getPendingPayouts();
      this.logger.log(`Processing ${pending.length} pending payout(s)`);

      for (const payout of pending) {
        await this.processSingle(payout);
      }
    } catch (err) {
      this.logger.error('Error in payout processor loop', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSingle(payout: PayoutRequest): Promise<void> {
    this.logger.log(`Processing payout ${payout.id} – ${payout.amount} ${payout.assetCode}`);

    await this.payoutsService.markProcessing(payout.id);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const txHash = await this.submitStellarTransaction(payout);
      await this.payoutsService.finaliseSuccess(payout.id, txHash, qr);
      await qr.commitTransaction();
      this.logger.log(`Payout ${payout.id} completed – txHash: ${txHash}`);
    } catch (err) {
      await qr.rollbackTransaction();
      const reason = err?.response?.data
        ? JSON.stringify(err.response.data)
        : (err as Error).message;

      const failQr = this.dataSource.createQueryRunner();
      await failQr.connect();
      await failQr.startTransaction();
      try {
        await this.payoutsService.finaliseFailure(payout.id, reason, failQr);
        await failQr.commitTransaction();
      } catch (e2) {
        await failQr.rollbackTransaction();
        this.logger.error(`Failed to record failure for payout ${payout.id}`, e2);
      } finally {
        await failQr.release();
      }

      this.logger.error(`Payout ${payout.id} failed: ${reason}`);
    } finally {
      await qr.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Stellar transaction
  // ---------------------------------------------------------------------------

  private async submitStellarTransaction(payout: PayoutRequest): Promise<string> {
    const sourceAccount = await this.server.loadAccount(
      this.sourceKeypair.publicKey(),
    );

    const asset =
      payout.assetCode === 'XLM'
        ? StellarSdk.Asset.native()
        : this.usdcAsset;

    const amountStr = Number(payout.amount).toFixed(7);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: payout.destinationAddress,
          asset,
          amount: amountStr,
        }),
      )
      .addMemo(StellarSdk.Memo.text(`payout:${payout.id.substring(0, 20)}`))
      .setTimeout(30)
      .build();

    tx.sign(this.sourceKeypair);

    const result = await this.server.submitTransaction(tx);
    return result.hash;
  }
}
