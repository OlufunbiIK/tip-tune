import { Injectable, Logger } from '@nestjs/common';
import { FeeConfiguration } from './entities/fee-configuration.entity';
import { Tip } from '../tips/entities/tip.entity';

export interface CalculatedFee {
  feeAmountXLM: number;
  feeAmountUSD: number | null;
  feePercentage: number;
  waived: boolean;
}

@Injectable()
export class FeeCalculatorService {
  private readonly logger = new Logger(FeeCalculatorService.name);

  calculateFee(
    tip: Tip,
    config: FeeConfiguration | null,
    options: { isVerifiedArtist: boolean; convertedAmountXLM?: number | null },
  ): CalculatedFee {
    if (!config) {
      this.logger.warn('No fee configuration found, defaulting fee to zero');
      return {
        feeAmountXLM: 0,
        feeAmountUSD: null,
        feePercentage: 0,
        waived: false,
      };
    }

    const feePercentage = parseFloat(config.feePercentage as any);
    const minimumFeeXLM = config.minimumFeeXLM ? parseFloat(config.minimumFeeXLM as any) : null;
    const maximumFeeXLM = config.maximumFeeXLM ? parseFloat(config.maximumFeeXLM as any) : null;

    const waived =
      config.waivedForVerifiedArtists && options.isVerifiedArtist ? true : false;

    if (waived) {
      return {
        feeAmountXLM: 0,
        feeAmountUSD: 0,
        feePercentage,
        waived: true,
      };
    }

    const baseAmountXLM =
      options.convertedAmountXLM != null ? options.convertedAmountXLM : tip.amount;

    let feeAmountXLM = (baseAmountXLM * feePercentage) / 100;

    if (minimumFeeXLM != null && feeAmountXLM < minimumFeeXLM) {
      feeAmountXLM = minimumFeeXLM;
    }

    if (maximumFeeXLM != null && feeAmountXLM > maximumFeeXLM) {
      feeAmountXLM = maximumFeeXLM;
    }

    let feeAmountUSD: number | null = null;

    if (tip.fiatCurrency === 'USD' && tip.fiatAmount != null && tip.amount > 0) {
      const usdPerXlm = tip.fiatAmount / tip.amount;
      feeAmountUSD = feeAmountXLM * usdPerXlm;
    }

    return {
      feeAmountXLM,
      feeAmountUSD,
      feePercentage,
      waived: false,
    };
  }
}

