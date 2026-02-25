import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('artists')
@UseGuards(JwtAuthGuard)
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateArtistDto) {
    return this.artistsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all artists' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiResponse({ status: 200, description: 'Paginated list of artists', schema: { example: { data: [{ /* artist fields */ }], meta: { total: 120, page: 2, limit: 20, totalPages: 6, hasNextPage: true, hasPreviousPage: true } } } })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.artistsService.findAll(Number(page), Number(limit));
  }

  @Get('me')
  findMyArtist(@Req() req) {
    return this.artistsService.findByUser(req.user.id);
  }

  @Patch('me')
  update(@Req() req, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(req.user.id, dto);
  }

  @Delete('me')
  remove(@Req() req) {
    return this.artistsService.remove(req.user.id);
  }

  // Admin only
  @Post(':artistId/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted artist (admin only)' })
  @ApiParam({ name: 'artistId', description: 'Artist UUID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Artist restored successfully' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async restore(@Param('artistId') artistId: string) {
    // TODO: Add admin guard
    return this.artistsService.restore(artistId);
  }
}
