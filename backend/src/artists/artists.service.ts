import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Artist } from "./entities/artist.entity";
import { CreateArtistDto } from "./dto/create-artist.dto";
import { UpdateArtistDto } from "./dto/update-artist.dto";

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
  ) {}

  async create(userId: string, dto: CreateArtistDto): Promise<Artist> {
    const existing = await this.artistRepo.findOne({ where: { userId } });

    if (existing) {
      throw new BadRequestException("Artist profile already exists");
    }

    const artist = this.artistRepo.create({
      ...dto,
      userId,
    });

    return this.artistRepo.save(artist);
  }

  findAll(): Promise<Artist[]> {
    return this.artistRepo.find();
  }

  async findOne(id: string): Promise<Artist> {
    const artist = await this.artistRepo.findOne({ where: { id } });
    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }
    return artist;
  }

  async findByUser(userId: string): Promise<Artist> {
    const artist = await this.artistRepo.findOne({ where: { userId } });

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

  async remove(userId: string): Promise<void> {
    const artist = await this.findByUser(userId);
    await this.artistRepo.remove(artist);
  }
}
