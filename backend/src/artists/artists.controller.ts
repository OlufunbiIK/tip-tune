import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ArtistsService } from "./artists.service";
import { CreateArtistDto } from "./dto/create-artist.dto";
import { UpdateArtistDto } from "./dto/update-artist.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("artists")
@UseGuards(JwtAuthGuard)
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateArtistDto) {
    return this.artistsService.create(req.user.id, dto);
  }

  @Get()
  findAll() {
    return this.artistsService.findAll();
  }

  @Get("me")
  findMyArtist(@Req() req) {
    return this.artistsService.findByUser(req.user.id);
  }

  @Patch("me")
  update(@Req() req, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(req.user.id, dto);
  }

  @Delete("me")
  remove(@Req() req) {
    return this.artistsService.remove(req.user.id);
  }
}
