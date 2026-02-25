import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import axios from 'axios';
import { StellarHealthIndicator } from './stellar-health.indicator';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StellarHealthIndicator', () => {
  let indicator: StellarHealthIndicator;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'STELLAR_HORIZON_URL') return 'https://horizon-testnet.stellar.org';
        if (key === 'STELLAR_NETWORK') return 'testnet';
        return defaultValue;
      }),
    };
    indicator = new StellarHealthIndicator(configService as unknown as ConfigService);
    mockedAxios.get.mockReset();
  });

  it('returns up when Horizon is reachable', async () => {
    mockedAxios.get.mockResolvedValue({ status: 200 } as any);

    const result = await indicator.isHealthy('stellar');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://horizon-testnet.stellar.org/fee_stats',
      expect.objectContaining({ timeout: 3000 }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        stellar: expect.objectContaining({ status: 'up' }),
      }),
    );
  });

  it('throws HealthCheckError when Horizon is unreachable', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    await expect(indicator.isHealthy('stellar')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
