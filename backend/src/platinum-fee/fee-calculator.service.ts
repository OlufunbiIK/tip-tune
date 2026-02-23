import { Injectable } from '@nestjs/common';
import { FeeConfiguration } from '../entities/fee-configuration.entity';

export interface FeeCalculationInput {
  amountXLM: number;
  xlmToUsdRate: number;
  isVerifiedArtist: boolean;
  config: FeeConfiguration;
}

export interface FeeCalculationResult {
  feePercentage: number;
  feeAmountXLM: number;
  feeAmountUSD: number;
  isWaived: boolean;
  netAmountXLM: number;
}

@Injectable()
export class FeeCalculatorService {
  /**
   * Calculate the platform fee for a given tip amount.
   * Applies min/max caps and verified artist waiver logic.
   */
  calculate(input: FeeCalculationInput): FeeCalculationResult {
    const { amountXLM, xlmToUsdRate, isVerifiedArtist, config } = input;

    // Waiver logic for verified artists
    if (config.waivedForVerifiedArtists && isVerifiedArtist) {
      return {
        feePercentage: 0,
        feeAmountXLM: 0,
        feeAmountUSD: 0,
        isWaived: true,
        netAmountXLM: amountXLM,
      };
    }

    // Calculate raw fee
    let rawFeeXLM = (amountXLM * Number(config.feePercentage)) / 100;

    // Apply minimum fee floor
    if (rawFeeXLM < Number(config.minimumFeeXLM) && rawFeeXLM > 0) {
      rawFeeXLM = Number(config.minimumFeeXLM);
    }

    // Apply maximum fee cap
    if (rawFeeXLM > Number(config.maximumFeeXLM)) {
      rawFeeXLM = Number(config.maximumFeeXLM);
    }

    // Ensure fee never exceeds tip amount
    if (rawFeeXLM > amountXLM) {
      rawFeeXLM = amountXLM;
    }

    // Round to 7 decimal places (Stellar precision)
    const feeAmountXLM = this.roundToStellarPrecision(rawFeeXLM);
    const feeAmountUSD = this.roundToUsdPrecision(feeAmountXLM * xlmToUsdRate);

    // Effective percentage after caps
    const effectivePercentage =
      amountXLM > 0
        ? this.roundToStellarPrecision((feeAmountXLM / amountXLM) * 100)
        : 0;

    return {
      feePercentage: effectivePercentage,
      feeAmountXLM,
      feeAmountUSD,
      isWaived: false,
      netAmountXLM: this.roundToStellarPrecision(amountXLM - feeAmountXLM),
    };
  }

  private roundToStellarPrecision(value: number): number {
    return Math.round(value * 1e7) / 1e7;
  }

  private roundToUsdPrecision(value: number): number {
    return Math.round(value * 1e4) / 1e4;
  }

  /**
   * Parse period string like "30d", "7d", "1y" to a Date
   */
  parsePeriodToDate(period: string): Date {
    const now = new Date();
    const match = period.match(/^(\d+)(d|w|m|y)$/);
    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'w':
        now.setDate(now.getDate() - value * 7);
        break;
      case 'm':
        now.setMonth(now.getMonth() - value);
        break;
      case 'y':
        now.setFullYear(now.getFullYear() - value);
        break;
    }

    return now;
  }
}
