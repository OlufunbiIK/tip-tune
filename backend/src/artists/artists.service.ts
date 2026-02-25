import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { Artist } from "./entities/artist.entity";
import { CreateArtistDto } from "./dto/create-artist.dto";
import { UpdateArtistDto } from "./dto/update-artist.dto";

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>
  ) {}

  async create(userId: string, dto: CreateArtistDto): Promise<Artist> {
    const existing = await this.artistRepo.findOne({ where: { userId, isDeleted: false } });

    if (existing) {
      throw new BadRequestException("Artist profile already exists");
    }

    const artist = this.artistRepo.create({
      ...dto,
      userId,
    });

    return this.artistRepo.save(artist);
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Artist>> {
    const take = Math.max(1, Math.min(limit, 100));
    const skip = (Math.max(1, page) - 1) * take;
    const [artists, total] = await this.artistRepo.findAndCount({
      where: { isDeleted: false },
      skip,
      take,
    });
    return paginate(artists, { page, limit: take, total });
  }

  async findOne(id: string): Promise<Artist> {
    const artist = await this.artistRepo.findOne({ where: { id, isDeleted: false } });
    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }
    return artist;
  }

  async findByUser(userId: string): Promise<Artist> {
    const artist = await this.artistRepo.findOne({ where: { userId, isDeleted: false } });
    if (!artist) {
      throw new NotFoundException("Artist profile not found");
    }
    return artist;
  }

  async update(userId: string, dto: UpdateArtistDto): Promise<Artist> {
    const artist = await this.findByUser(userId);
    Object.assign(artist, dto);
    return this.artistRepo.save(artist);
  }

  // Soft delete
  async remove(userId: string): Promise<void> {
    const artist = await this.findByUser(userId);
    artist.deletedAt = new Date();
    artist.isDeleted = true;
    await this.artistRepo.save(artist);
  }

  // Hard delete (admin only)
  async hardDelete(id: string): Promise<void> {
    const artist = await this.artistRepo.findOne({ where: { id } });
    if (!artist) throw new NotFoundException('Artist not found');
    await this.artistRepo.remove(artist);
  }

  // Restore (admin only)
  async restore(id: string): Promise<Artist> {
    const artist = await this.artistRepo.findOne({ where: { id }, withDeleted: true });
    if (!artist) throw new NotFoundException('Artist not found');
    artist.deletedAt = null;
    artist.isDeleted = false;
    return this.artistRepo.save(artist);
  }
}
