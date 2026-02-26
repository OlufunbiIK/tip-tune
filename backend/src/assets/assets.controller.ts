import { Controller, Get, Param, Query, ParseFloatPipe } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('supported')
  findAll() {
    return this.assetsService.findAllSupported();
  }

  @Get('artist/:artistId')
  findByArtist(@Param('artistId') artistId: string) {
    return this.assetsService.findByArtist(artistId);
  }

  @Get('convert')
  convert(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount', ParseFloatPipe) amount: number,
  ) {
    return this.assetsService.getConversionRate(from, to, amount);
  }
}
