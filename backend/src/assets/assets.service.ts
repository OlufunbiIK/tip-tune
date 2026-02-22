import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedAsset } from './entities/supported-asset.entity';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(SupportedAsset)
    private assetsRepository: Repository<SupportedAsset>,
    private stellarService: StellarService,
  ) {}

  async findAllSupported() {
    return this.assetsRepository.find({
      where: { isEnabled: true },
    });
  }

  async findByArtist(artistId: string) {
    return this.assetsRepository.find({
      where: [
        { isGlobal: true, isEnabled: true },
        { artistId, isEnabled: true },
      ],
    });
  }

  async getConversionRate(fromAsset: string, toAsset: string, amount: number) {
    // This would typically involve checking path payments on Stellar
    return this.stellarService.getConversionRate(fromAsset, toAsset, amount);
  }
}
