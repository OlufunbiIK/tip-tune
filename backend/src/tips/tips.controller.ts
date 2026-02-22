import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { TipsService } from './tips.service';
import { CreateTipDto } from './create-tips.dto';
import { PaginationQueryDto } from './pagination.dto';
import { Tip, TipStatus } from './entities/tip.entity';

@ApiTags('Tips')
@Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tip record' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'User ID of the tipper',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tip successfully created',
    type: Tip,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tip with this Stellar transaction hash already exists',
  })
  async create(
    @Body() createTipDto: CreateTipDto,
    @Headers('x-user-id') userId: string,
  ): Promise<Tip> {
    if (!userId) {
      throw new BadRequestException('User ID header (x-user-id) is required');
    }
    // Simple validation, in real app use AuthGuard
    return this.tipsService.create(userId, createTipDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tip by ID' })
  @ApiParam({ name: 'id', description: 'Tip ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tip found',
    type: Tip,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tip not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Tip> {
    return this.tipsService.findOne(id);
  }

  @Get('user/:userId/history')
  @ApiOperation({ summary: "Get user's tip history (tips sent by user)" })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TipStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User tip history retrieved successfully',
  })
  async getUserTipHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.tipsService.getUserTipHistory(userId, paginationQuery);
  }

  @Get('artist/:artistId/received')
  @ApiOperation({ summary: "Get artist's received tips" })
  @ApiParam({ name: 'artistId', description: 'Artist ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TipStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Artist received tips retrieved successfully',
  })
  async getArtistReceivedTips(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.tipsService.getArtistReceivedTips(artistId, paginationQuery);
  }

  @Get('artist/:artistId/stats')
  @ApiOperation({ summary: "Get artist's tip statistics" })
  @ApiParam({ name: 'artistId', description: 'Artist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Artist tip stats retrieved successfully',
  })
  async getArtistTipStats(@Param('artistId', ParseUUIDPipe) artistId: string) {
    return this.tipsService.getArtistTipStats(artistId);
  }
}
