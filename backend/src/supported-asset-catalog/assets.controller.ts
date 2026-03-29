import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AssetsService } from './assets.service';
import {
  CreateSupportedAssetDto,
  ListAssetsQueryDto,
  ResolveAssetQueryDto,
  UpdateSupportedAssetDto,
} from './dto/assets.dto';
import { SupportedAsset } from './entities/supported-asset.entity';

// ---------------------------------------------------------------------------
// Lightweight guard stubs – replace with your real guards
// ---------------------------------------------------------------------------
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ── Public catalog ─────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List supported assets',
    description:
      'Returns global assets plus, when artistId is supplied, assets scoped to that artist. ' +
      'Pass enabledOnly=true to hide disabled assets.',
  })
  @ApiResponse({ status: 200, type: [SupportedAsset] })
  listAssets(@Query() query: ListAssetsQueryDto): Promise<SupportedAsset[]> {
    return this.assetsService.findAll(query);
  }

  @Get('resolve')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Resolve an asset by code + optional issuer',
    description:
      'Returns the matching supported asset or a descriptive error if the asset is ' +
      'unsupported, disabled, or ambiguous (multiple issuers, no issuer param).',
  })
  @ApiResponse({ status: 200, type: SupportedAsset })
  @ApiResponse({ status: 400, description: 'Issuer required or ambiguous' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 422, description: 'Asset disabled' })
  resolveAsset(
    @Query() query: ResolveAssetQueryDto,
    @Query('artistId') artistId?: string,
  ): Promise<SupportedAsset> {
    return this.assetsService.resolve(query.code, query.issuer, artistId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a supported asset by id' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SupportedAsset })
  @ApiResponse({ status: 404, description: 'Not found' })
  getAsset(@Param('id', ParseUUIDPipe) id: string): Promise<SupportedAsset> {
    return this.assetsService.findOne(id);
  }

  // ── Admin mutations ────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Create a supported asset' })
  @ApiResponse({ status: 201, type: SupportedAsset })
  @ApiResponse({ status: 400, description: 'Validation / duplicate' })
  createAsset(@Body() dto: CreateSupportedAssetDto): Promise<SupportedAsset> {
    return this.assetsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '[Admin] Update display metadata of an asset' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SupportedAsset })
  updateAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportedAssetDto,
  ): Promise<SupportedAsset> {
    return this.assetsService.update(id, dto);
  }

  @Patch(':id/enable')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Enable a supported asset' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SupportedAsset })
  enableAsset(@Param('id', ParseUUIDPipe) id: string): Promise<SupportedAsset> {
    return this.assetsService.enable(id);
  }

  @Patch(':id/disable')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Disable a supported asset (soft-disable)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SupportedAsset })
  disableAsset(@Param('id', ParseUUIDPipe) id: string): Promise<SupportedAsset> {
    return this.assetsService.disable(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Permanently remove a supported asset' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  removeAsset(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.assetsService.remove(id);
  }
}
