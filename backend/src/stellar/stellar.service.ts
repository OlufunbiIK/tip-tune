import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private server: StellarSdk.Horizon.Server;
  private readonly logger = new Logger(StellarService.name);

  constructor(private configService: ConfigService) {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    const horizonUrl =
      network === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';

    this.server = new StellarSdk.Horizon.Server(horizonUrl);
  }

  async verifyTransaction(
    txHash: string,
    amount: string,
    recipientId: string,
    assetCode: string = 'XLM',
    assetIssuer?: string,
  ): Promise<boolean> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();

      if (!tx.successful) {
        this.logger.warn(`Transaction ${txHash} was not successful`);
        return false;
      }

      // Check if the transaction is recent (optional, but good practice to prevent replay of old txs)
      // For now, we rely on the database uniqueness constraint on txHash.

      // We need to inspect operations to ensure the correct amount was sent to the correct recipient
      const operations = await tx.operations();

      const paymentOp = operations.records.find(
        (op: any) => {
          // Check type and basic fields
          const isPayment = op.type === 'payment' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
          if (!isPayment || op.to !== recipientId) return false;

          // Check amount
          if (op.amount !== amount) return false;

          // Check asset
          if (assetCode === 'XLM' || assetCode === 'native') {
            return op.asset_type === 'native';
          } else {
            return (
              (op.asset_code === assetCode && op.asset_issuer === assetIssuer) ||
              // Handle path payments where 'to' asset matches
              (op.asset_code === undefined && op.asset_type === 'native' && assetCode === 'XLM') // Fallback for some structures
            );
          }
        }
      );

      if (!paymentOp) {
        this.logger.warn(
          `Transaction ${txHash} does not contain a valid payment operation to ${recipientId} for ${amount} ${assetCode}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error verifying transaction ${txHash}: ${error.message}`);
      return false;
    }
  }

  async getConversionRate(
    fromAssetCode: string,
    fromAssetIssuer: string | null,
    toAssetCode: string,
    toAssetIssuer: string | null,
    amount: number
  ) {
    try {
      const fromAsset =
        fromAssetCode === 'XLM'
          ? StellarSdk.Asset.native()
          : new StellarSdk.Asset(fromAssetCode, fromAssetIssuer!);

      const toAsset =
        toAssetCode === 'XLM'
          ? StellarSdk.Asset.native()
          : new StellarSdk.Asset(toAssetCode, toAssetIssuer!);

      // Use strict send path to find how much destination asset we get for source amount
      const paths = await this.server
        .strictSendPaths(fromAsset, amount.toString(), [toAsset])
        .call();

      if (paths.records && paths.records.length > 0) {
        // Return the best path's destination amount
        return {
          rate: parseFloat(paths.records[0].destination_amount) / amount,
          estimatedAmount: paths.records[0].destination_amount,
        };
      }
      return { rate: 0, estimatedAmount: 0 };
    } catch (error) {
      this.logger.error(`Error fetching conversion rate: ${error.message}`);
      return { rate: 0, estimatedAmount: 0 };
    }
  }

  async getTransactionDetails(txHash: string) {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return tx;
    } catch (error) {
      this.logger.error(`Error fetching transaction ${txHash}: ${error.message}`);
      throw error;
    }
  }

  async mintBadge(userId: string, badge: any): Promise<string | null> {
    this.logger.log(`Minting badge ${badge.name} for user ${userId} (MOCKED)`);
    // In a real implementation:
    // 1. Check if user has trustline for asset (badge.nftAssetCode)
    // 2. Build transaction from Issuer account to User account
    // 3. Sign and submit

    // For now, return a mock hash if enabled
    if (process.env.ENABLE_NFT_MINTING === 'true') {
      return 'mock_tx_hash_' + Date.now();
    }
    return null;
  }
}
