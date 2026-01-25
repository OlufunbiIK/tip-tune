import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Genre } from "./entities/genre.entity";
import { TrackGenre } from "./entities/track-genre.entity";
import { CreateGenreDto } from "./dto/create-genre.dto";
import { UpdateGenreDto } from "./dto/update-genre.dto";
import { QueryGenreDto } from "./dto/query-genre.dto";
import { Track } from "../tracks/entities/track.entity";

@Injectable()
export class GenresService {
  private readonly logger = new Logger(GenresService.name);

  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(TrackGenre)
    private readonly trackGenreRepository: Repository<TrackGenre>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) {}

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Create a new genre
   */
  async create(createGenreDto: CreateGenreDto): Promise<Genre> {
    const { name, description, parentGenreId } = createGenreDto;

    // Check if genre with same name exists
    const existingGenre = await this.genreRepository.findOne({
      where: { name },
    });

    if (existingGenre) {
      throw new ConflictException(`Genre with name "${name}" already exists`);
    }

    // Validate parent if provided
    if (parentGenreId) {
      const parent = await this.genreRepository.findOne({
        where: { id: parentGenreId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent genre with ID ${parentGenreId} not found`,
        );
      }

      // Prevent circular reference (check if parent is a child of this genre)
      // This is a simple check - in production, you might want a more robust cycle detection
    }

    const slug = this.generateSlug(name);

    // Check if slug already exists
    const existingSlug = await this.genreRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Genre with slug "${slug}" already exists`);
    }

    const genre = this.genreRepository.create({
      name,
      slug,
      description,
      parentGenreId: parentGenreId || null,
      trackCount: 0,
    });

    return this.genreRepository.save(genre);
  }

  /**
   * Find all genres with optional filtering
   */
  async findAll(queryDto: QueryGenreDto): Promise<{
    data: Genre[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search, parentId, rootOnly } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.genreRepository.createQueryBuilder("genre");

    if (search) {
      queryBuilder.where("genre.name ILIKE :search", { search: `%${search}%` });
    } else {
      queryBuilder.where("1=1"); // Always true condition to allow andWhere
    }

    if (parentId) {
      queryBuilder.andWhere("genre.parentGenreId = :parentId", { parentId });
    } else if (rootOnly) {
      queryBuilder.andWhere("genre.parentGenreId IS NULL");
    }

    queryBuilder.orderBy("genre.name", "ASC").skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get genre discovery page - all genres with hierarchy
   */
  async getDiscovery(): Promise<{
    rootGenres: Genre[];
    allGenres: Genre[];
  }> {
    const rootGenres = await this.genreRepository.find({
      where: { parentGenreId: null },
      relations: ["children"],
      order: { name: "ASC" },
    });

    const allGenres = await this.genreRepository.find({
      relations: ["parent", "children"],
      order: { trackCount: "DESC", name: "ASC" },
    });

    return {
      rootGenres,
      allGenres,
    };
  }

  /**
   * Get popular genres ranked by track count
   */
  async getPopular(limit: number = 10): Promise<Genre[]> {
    return this.genreRepository.find({
      order: { trackCount: "DESC", name: "ASC" },
      take: limit,
      relations: ["parent"],
    });
  }

  /**
   * Find one genre by ID
   */
  async findOne(id: string): Promise<Genre> {
    const genre = await this.genreRepository.findOne({
      where: { id },
      relations: ["parent", "children", "trackGenres"],
    });

    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }

    return genre;
  }

  /**
   * Find genre by slug
   */
  async findBySlug(slug: string): Promise<Genre> {
    const genre = await this.genreRepository.findOne({
      where: { slug },
      relations: ["parent", "children", "trackGenres"],
    });

    if (!genre) {
      throw new NotFoundException(`Genre with slug "${slug}" not found`);
    }

    return genre;
  }

  /**
   * Get all children of a genre
   */
  async getChildren(genreId: string): Promise<Genre[]> {
    const genre = await this.findOne(genreId);
    return this.genreRepository.find({
      where: { parentGenreId: genreId },
      order: { name: "ASC" },
    });
  }

  /**
   * Get parent chain (all ancestors)
   */
  async getParentChain(genreId: string): Promise<Genre[]> {
    const chain: Genre[] = [];
    let currentGenre = await this.findOne(genreId);

    while (currentGenre.parentGenreId) {
      const parent = await this.genreRepository.findOne({
        where: { id: currentGenre.parentGenreId },
        relations: ["parent"],
      });

      if (!parent) {
        break;
      }

      chain.unshift(parent);
      currentGenre = parent;
    }

    return chain;
  }

  /**
   * Update genre
   */
  async update(id: string, updateGenreDto: UpdateGenreDto): Promise<Genre> {
    const genre = await this.findOne(id);

    // Check name uniqueness if name is being updated
    if (updateGenreDto.name && updateGenreDto.name !== genre.name) {
      const existing = await this.genreRepository.findOne({
        where: { name: updateGenreDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Genre with name "${updateGenreDto.name}" already exists`,
        );
      }

      genre.name = updateGenreDto.name;
      genre.slug = this.generateSlug(updateGenreDto.name);
    }

    // Validate parent if being updated
    if (updateGenreDto.parentGenreId !== undefined) {
      if (updateGenreDto.parentGenreId === id) {
        throw new BadRequestException("Genre cannot be its own parent");
      }

      if (updateGenreDto.parentGenreId) {
        const parent = await this.genreRepository.findOne({
          where: { id: updateGenreDto.parentGenreId },
        });

        if (!parent) {
          throw new NotFoundException(
            `Parent genre with ID ${updateGenreDto.parentGenreId} not found`,
          );
        }

        // Prevent circular reference - check if new parent is a descendant
        const descendants = await this.getAllDescendants(id);
        if (descendants.some((d) => d.id === updateGenreDto.parentGenreId)) {
          throw new BadRequestException(
            "Cannot set parent to a descendant genre",
          );
        }
      }

      genre.parentGenreId = updateGenreDto.parentGenreId || null;
    }

    if (updateGenreDto.description !== undefined) {
      genre.description = updateGenreDto.description;
    }

    return this.genreRepository.save(genre);
  }

  /**
   * Get all descendants of a genre (recursive)
   */
  private async getAllDescendants(genreId: string): Promise<Genre[]> {
    const descendants: Genre[] = [];
    const children = await this.genreRepository.find({
      where: { parentGenreId: genreId },
    });

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await this.getAllDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Delete genre
   */
  async remove(id: string): Promise<void> {
    const genre = await this.findOne(id);

    // Check if genre has children
    const children = await this.getChildren(id);
    if (children.length > 0) {
      throw new BadRequestException(
        `Cannot delete genre with ${children.length} sub-genre(s). Please delete or reassign sub-genres first.`,
      );
    }

    // Check if genre is assigned to tracks
    const trackCount = await this.trackGenreRepository.count({
      where: { genreId: id },
    });

    if (trackCount > 0) {
      throw new BadRequestException(
        `Cannot delete genre assigned to ${trackCount} track(s). Please remove genre assignments first.`,
      );
    }

    await this.genreRepository.remove(genre);
  }

  /**
   * Assign genres to a track
   */
  async assignGenresToTrack(
    trackId: string,
    genreIds: string[],
  ): Promise<TrackGenre[]> {
    // Verify track exists
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException(`Track with ID ${trackId} not found`);
    }

    // Verify all genres exist
    const genres = await this.genreRepository.find({
      where: { id: In(genreIds) },
    });

    if (genres.length !== genreIds.length) {
      const foundIds = genres.map((g) => g.id);
      const missingIds = genreIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Genres not found: ${missingIds.join(", ")}`);
    }

    // Remove existing assignments
    await this.trackGenreRepository.delete({ trackId });

    // Create new assignments
    const trackGenres = genreIds.map((genreId) =>
      this.trackGenreRepository.create({
        trackId,
        genreId,
      }),
    );

    const saved = await this.trackGenreRepository.save(trackGenres);

    // Update track counts for all affected genres
    await this.updateTrackCounts(genreIds);

    return saved;
  }

  /**
   * Remove genre assignment from track
   */
  async removeGenreFromTrack(trackId: string, genreId: string): Promise<void> {
    const trackGenre = await this.trackGenreRepository.findOne({
      where: { trackId, genreId },
    });

    if (!trackGenre) {
      throw new NotFoundException("Genre assignment not found");
    }

    await this.trackGenreRepository.remove(trackGenre);

    // Update track count
    await this.updateTrackCount(genreId);
  }

  /**
   * Get genres for a track
   */
  async getTrackGenres(trackId: string): Promise<Genre[]> {
    const trackGenres = await this.trackGenreRepository.find({
      where: { trackId },
      relations: ["genre", "genre.parent"],
    });

    return trackGenres.map((tg) => tg.genre);
  }

  /**
   * Update track count for a genre
   */
  private async updateTrackCount(genreId: string): Promise<void> {
    const count = await this.trackGenreRepository.count({
      where: { genreId },
    });

    await this.genreRepository.update(genreId, { trackCount: count });
  }

  /**
   * Update track counts for multiple genres
   */
  private async updateTrackCounts(genreIds: string[]): Promise<void> {
    for (const genreId of genreIds) {
      await this.updateTrackCount(genreId);
    }
  }

  /**
   * Recalculate all genre track counts (useful for maintenance)
   */
  async recalculateAllTrackCounts(): Promise<void> {
    const genres = await this.genreRepository.find();

    for (const genre of genres) {
      await this.updateTrackCount(genre.id);
    }

    this.logger.log("Recalculated track counts for all genres");
  }
}
