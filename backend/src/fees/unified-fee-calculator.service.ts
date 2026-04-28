import { Injectable } from '@nestjs/common';
import { UnifiedFeeConfiguration } from './entities/unified-fee-configuration.entity';

export interface FeeCalculationInput {
  amountXLM: number;
  xlmToUsdRate?: number;
  isVerifiedArtist: boolean;
  config: UnifiedFeeConfiguration;
}

export interface FeeCalculationResult {
  feePercentage: number;
  feeAmountXLM: number;
  feeAmountUSD?: number;
  isWaived: boolean;
}

@Injectable()
export class UnifiedFeeCalculatorService {
  calculate(input: FeeCalculationInput): FeeCalculationResult {
    const { amountXLM, xlmToUsdRate, isVerifiedArtist, config } = input;

    // Check if fee should be waived for verified artists
    if (isVerifiedArtist && config.waivedForVerifiedArtists) {
      return {
        feePercentage: config.feePercentage,
        feeAmountXLM: 0,
        feeAmountUSD: 0,
        isWaived: true,
      };
    }

    // Calculate fee amount
    let feeAmountXLM = (amountXLM * config.feePercentage) / 100;

    // Apply minimum fee constraint
    if (config.minimumFeeXLM && feeAmountXLM < config.minimumFeeXLM) {
      feeAmountXLM = config.minimumFeeXLM;
    }

    // Apply maximum fee constraint
    if (config.maximumFeeXLM && feeAmountXLM > config.maximumFeeXLM) {
      feeAmountXLM = config.maximumFeeXLM;
    }

    // Calculate USD amount if rate is provided
    let feeAmountUSD: number | undefined;
    if (xlmToUsdRate) {
      feeAmountUSD = feeAmountXLM * xlmToUsdRate;
    }

    return {
      feePercentage: config.feePercentage,
      feeAmountXLM,
      feeAmountUSD,
      isWaived: false,
    };
  }

  parsePeriodToDate(period: string): Date {
    const now = new Date();
    const value = parseInt(period, 10);
    
    if (isNaN(value) || value <= 0) {
      throw new Error(`Invalid period: ${period}. Expected positive integer.`);
    }

    return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
  }
}
