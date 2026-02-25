import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import {
  SearchQueryDto,
  SearchType,
  SortOption,
} from './dto/search-query.dto';
import { SearchSuggestionsQueryDto } from './dto/search-suggestions-query.dto';

const SIMILARITY_THRESHOLD = 0.1;
const FUZZY_WEIGHT = 0.5;



export interface SearchResult {
  artists?: PaginatedResult<Artist>;
  tracks?: PaginatedResult<Track>;
}

export interface SearchSuggestion {
  type: 'artist' | 'track';
  id: string;
  title: string;
  subtitle?: string;
}

/** Sanitize user input for tsquery: keep alphanumeric and spaces, collapse whitespace. */
function sanitizeQuery(q: string): string {
  return q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build tsquery-safe string; use prefix matching for last token. */
function toTsQueryString(q: string): string {
  const s = sanitizeQuery(q);
  if (!s) return '';
  const tokens = s.split(/\s+/).filter(Boolean);
  return tokens.map((t, i) => (i === tokens.length - 1 ? `${t}:*` : t)).join(' & ');
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
  ) {}

  async search(dto: SearchQueryDto): Promise<SearchResult> {
    const types: SearchType[] = dto.type ? [dto.type] : ['artist', 'track'];
    const result: SearchResult = {};

    if (types.includes('artist')) {
      result.artists = await this.searchArtists(dto);
    }
    if (types.includes('track')) {
      result.tracks = await this.searchTracks(dto);
    }

    return result;
  }

  private async searchArtists(dto: SearchQueryDto): Promise<PaginatedResult<Artist>> {
    const {
      page = 1,
      limit = 10,
      sort = 'relevance',
      genre,
      status,
      country,
      city,
      hasLocation,
      isVerified,
    } = dto;
    const skip = (page - 1) * limit;
    const q = dto.q ? sanitizeQuery(dto.q) : '';
    const tsQuery = dto.q ? toTsQueryString(dto.q) : '';
    const hasQuery = q.length > 0;

    const qb = this.artistRepo
      .createQueryBuilder('artist')
      .select(['artist']);

    if (hasQuery) {
      if (tsQuery) {
        qb.setParameter('tsQuery', tsQuery);
        qb.setParameter('q', q);
        qb.andWhere(
          `(artist.search_vector @@ to_tsquery('english', :tsQuery) OR similarity(artist."artistName", :q) > :simThreshold OR (artist.genre IS NOT NULL AND similarity(artist.genre, :q) > :simThreshold))`,
          { simThreshold: SIMILARITY_THRESHOLD },
        );
      } else {
        qb.andWhere(
          `(artist."artistName" ILIKE :like OR artist.genre ILIKE :like OR artist.bio ILIKE :like)`,
          { like: `%${q.replace(/%/g, '\\%')}%` },
        );
      }
    }

    if (genre) {
      qb.andWhere('artist.genre ILIKE :genre', { genre: `%${genre}%` });
    }
    if (status) {
      qb.andWhere('artist.status = :status', { status });
    }
    if (country) {
      qb.andWhere('UPPER(artist.country) = UPPER(:country)', { country });
    }
    if (city) {
      qb.andWhere('artist.city ILIKE :city', { city: `%${city}%` });
    }
    if (hasLocation === true) {
      qb.andWhere('artist.hasLocation = :hasLocation', { hasLocation: true });
    }
    if (isVerified === true) {
      qb.andWhere('artist.isVerified = :isVerified', { isVerified: true });
    }

    switch (sort as SortOption) {
      case 'recent':
        qb.orderBy('artist.createdAt', 'DESC');
        break;
      case 'popular':
      case 'popular_tips':
        qb.orderBy('artist.totalTipsReceived', 'DESC');
        break;
      case 'alphabetical':
        qb.orderBy('artist.artistName', 'ASC');
        break;
      case 'relevance':
      default:
        if (hasQuery && tsQuery) {
          qb.orderBy(
            `(ts_rank_cd(artist.search_vector, to_tsquery('english', :tsQuery)) + :fuzzyWeight * greatest(similarity(artist."artistName", :q), coalesce(similarity(artist.genre, :q), 0), 0))`,
            'DESC',
          );
          qb.setParameter('fuzzyWeight', FUZZY_WEIGHT);
        } else {
          qb.orderBy('artist.createdAt', 'DESC');
        }
        break;
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private async searchTracks(dto: SearchQueryDto): Promise<PaginatedResult<Track>> {
    const {
      page = 1,
      limit = 10,
      sort = 'relevance',
      genre,
      releaseDateFrom,
      releaseDateTo,
    } = dto;
    const skip = (page - 1) * limit;
    const q = dto.q ? sanitizeQuery(dto.q) : '';
    const tsQuery = dto.q ? toTsQueryString(dto.q) : '';
    const hasQuery = q.length > 0;

    const qb = this.trackRepo
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.artist', 'artist')
      .select(['track', 'artist']);

    if (hasQuery) {
      if (tsQuery) {
        qb.setParameter('tsQuery', tsQuery);
        qb.setParameter('q', q);
        qb.andWhere(
          `(track.search_vector @@ to_tsquery('english', :tsQuery) OR similarity(track.title, :q) > :simThreshold OR (track.genre IS NOT NULL AND similarity(track.genre, :q) > :simThreshold) OR (track.description IS NOT NULL AND similarity(track.description, :q) > :simThreshold))`,
          { simThreshold: SIMILARITY_THRESHOLD },
        );
      } else {
        qb.andWhere(
          `(track.title ILIKE :like OR track.genre ILIKE :like OR track.description ILIKE :like)`,
          { like: `%${q.replace(/%/g, '\\%')}%` },
        );
      }
    }

    if (genre) {
      qb.andWhere('track.genre ILIKE :genre', { genre: `%${genre}%` });
    }
    if (releaseDateFrom) {
      qb.andWhere('track.releaseDate >= :releaseDateFrom', {
        releaseDateFrom,
      });
    }
    if (releaseDateTo) {
      qb.andWhere('track.releaseDate <= :releaseDateTo', {
        releaseDateTo,
      });
    }

    qb.andWhere('track.isPublic = :isPublic', { isPublic: true });

    switch (sort as SortOption) {
      case 'recent':
        qb.orderBy('track.createdAt', 'DESC');
        break;
      case 'popular':
      case 'popular_tips':
        qb.orderBy('track.tipCount', 'DESC').addOrderBy('track.totalTips', 'DESC');
        break;
      case 'popular_plays':
        qb.orderBy('track.plays', 'DESC');
        break;
      case 'alphabetical':
        qb.orderBy('track.title', 'ASC');
        break;
      case 'relevance':
      default:
        if (hasQuery && tsQuery) {
          qb.orderBy(
            `(ts_rank_cd(track.search_vector, to_tsquery('english', :tsQuery)) + :fuzzyWeight * greatest(similarity(track.title, :q), coalesce(similarity(track.genre, :q), 0), coalesce(similarity(track.description, :q), 0), 0))`,
            'DESC',
          );
          qb.setParameter('fuzzyWeight', FUZZY_WEIGHT);
        } else {
          qb.orderBy('track.createdAt', 'DESC');
        }
        break;
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSuggestions(
    dto: SearchSuggestionsQueryDto,
  ): Promise<{ artists: SearchSuggestion[]; tracks: SearchSuggestion[] }> {
    const { q, type, limit = 10 } = dto;
    const sanitized = sanitizeQuery(q);
    if (!sanitized || sanitized.length < 2) {
      return { artists: [], tracks: [] };
    }

    const like = `%${sanitized.replace(/%/g, '\\%')}%`;
    const result: { artists: SearchSuggestion[]; tracks: SearchSuggestion[] } = {
      artists: [],
      tracks: [],
    };

    const take = type ? limit : Math.ceil(limit / 2);

    if (!type || type === 'artist') {
      const artists = await this.artistRepo
        .createQueryBuilder('artist')
        .select(['artist.id', 'artist.artistName', 'artist.genre'])
        .where(
          `(artist."artistName" ILIKE :like OR artist.genre ILIKE :like)`,
          { like },
        )
        .orderBy('artist.artistName', 'ASC')
        .take(take)
        .getMany();

      result.artists = artists.map((a) => ({
        type: 'artist',
        id: a.id,
        title: a.artistName,
        subtitle: a.genre ?? undefined,
      }));
    }

    if (!type || type === 'track') {
      const tracks = await this.trackRepo
        .createQueryBuilder('track')
        .leftJoinAndSelect('track.artist', 'artist')
        .select(['track.id', 'track.title', 'track.genre', 'artist.id', 'artist.artistName'])
        .where(
          `(track.title ILIKE :like OR track.genre ILIKE :like)`,
          { like },
        )
        .andWhere('track.isPublic = :isPublic', { isPublic: true })
        .orderBy('track.title', 'ASC')
        .take(take)
        .getMany();

      result.tracks = tracks.map((t) => ({
        type: 'track',
        id: t.id,
        title: t.title,
        subtitle: [t.genre, t.artist?.artistName].filter(Boolean).join(' · ') || undefined,
      }));
    }

    return result;
  }
}
