import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import axios from 'axios';

@Injectable()
export class StellarHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key = 'stellar'): Promise<HealthIndicatorResult> {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    const horizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      (network === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org');

    const normalizedBaseUrl = horizonUrl.replace(/\/$/, '');
    const probeUrl = `${normalizedBaseUrl}/fee_stats`;

    try {
      const response = await axios.get(probeUrl, { timeout: 3000 });
      const isHealthy = response.status >= 200 && response.status < 300;
      const result = this.getStatus(key, isHealthy, {
        status: isHealthy ? 'up' : 'down',
        horizonUrl: normalizedBaseUrl,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Stellar Horizon health check failed', result);
      }

      return result;
    } catch (error: any) {
      const result = this.getStatus(key, false, {
        status: 'down',
        horizonUrl: normalizedBaseUrl,
        message: error?.message ?? 'Unable to reach Stellar Horizon',
      });
      throw new HealthCheckError('Stellar Horizon health check failed', result);
    }
  }
}
