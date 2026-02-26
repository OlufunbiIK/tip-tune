import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchResult } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchSuggestionsQueryDto } from './dto/search-suggestions-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ArtistStatus } from '../artists/entities/artist.entity';
import { ThrottleOverride } from '../common/decorators/throttle-override.decorator';

@ApiTags('search')
@Controller('search')
@Public()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('suggestions')
  @ThrottleOverride('SEARCH') // 100 requests per minute
  @ApiOperation({
    summary: 'Autocomplete suggestions',
    description: 'Returns artist and track suggestions for partial query (min 2 characters).',
  })
  @ApiQuery({ name: 'q', description: 'Partial search query', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['artist', 'track'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Max suggestions (default 10, max 20)' })
  @ApiResponse({ status: 200, description: 'Artists and tracks suggestions' })
  getSuggestions(
    @Query() dto: SearchSuggestionsQueryDto,
  ): Promise<{ artists: { type: string; id: string; title: string; subtitle?: string }[]; tracks: { type: string; id: string; title: string; subtitle?: string }[] }> {
    return this.searchService.getSuggestions(dto);
  }

  @Get()
  @ThrottleOverride('SEARCH') // 100 requests per minute
  @ApiOperation({
    summary: 'Search artists and/or tracks',
    description:
      'Full-text search with filters (genre, release date range), sorting (relevance, recent, popular, alphabetical), and pagination. Requires search migration (pg_trgm, tsvector) to be applied for full-text and fuzzy matching.',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, enum: ['artist', 'track'], description: 'Limit to artist or track' })
  @ApiQuery({ name: 'genre', required: false, description: 'Filter by genre' })
  @ApiQuery({ name: 'status', required: false, enum: ArtistStatus, description: 'Artist status filter' })
  @ApiQuery({ name: 'country', required: false, description: 'Artist country filter (ISO alpha-2)' })
  @ApiQuery({ name: 'city', required: false, description: 'Artist city filter (partial, case-insensitive)' })
  @ApiQuery({ name: 'hasLocation', required: false, type: Boolean, description: 'Only artists with public location' })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean, description: 'Only verified artists' })
  @ApiQuery({ name: 'releaseDateFrom', required: false, description: 'Release date from (YYYY-MM-DD)' })
  @ApiQuery({ name: 'releaseDateTo', required: false, description: 'Release date to (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['relevance', 'recent', 'popular', 'alphabetical', 'popular_tips', 'popular_plays'] })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 10, max 100)' })
  @ApiResponse({ status: 200, description: 'Search results (artists and/or tracks, paginated)' })
  search(@Query() dto: SearchQueryDto): Promise<SearchResult> {
    return this.searchService.search(dto);
  }
}
