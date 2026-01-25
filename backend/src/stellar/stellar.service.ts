import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as StellarSdk from "@stellar/stellar-sdk";

@Injectable()
export class StellarService {
  private server: StellarSdk.Horizon.Server;
  private readonly logger = new Logger(StellarService.name);

  constructor(private configService: ConfigService) {
    const network = this.configService.get<string>(
      "STELLAR_NETWORK",
      "testnet",
    );
    const horizonUrl =
      network === "mainnet"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org";

    this.server = new StellarSdk.Horizon.Server(horizonUrl);
  }

  async verifyTransaction(
    txHash: string,
    amount: string,
    recipientId: string,
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
        (op) =>
          op.type === "payment" &&
          op.to === recipientId &&
          op.amount === amount, // Note: exact string match.
        // Better to use a BigNumber library or StellarSdk's handling if precision is key,
        // but for now string comparison matches API.
      );

      if (!paymentOp) {
        this.logger.warn(
          `Transaction ${txHash} does not contain a valid payment operation to ${recipientId} for ${amount}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error verifying transaction ${txHash}: ${error.message}`,
      );
      return false;
    }
  }

  async getTransactionDetails(txHash: string) {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return tx;
    } catch (error) {
      this.logger.error(
        `Error fetching transaction ${txHash}: ${error.message}`,
      );
      throw error;
    }
  }
}
