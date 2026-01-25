import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from "@nestjs/common";
import { GoalsService } from "./goals.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ArtistsService } from "../artists/artists.service";

@Controller("goals")
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly artistsService: ArtistsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createGoalDto: CreateGoalDto) {
    const userId = req.user.id;
    const artist = await this.artistsService.findByUser(userId);
    if (!artist) {
      throw new NotFoundException("Current user is not an artist");
    }
    return this.goalsService.create(artist.id, createGoalDto);
  }

  @Get("artist/:artistId")
  findAll(@Param("artistId") artistId: string) {
    return this.goalsService.findAllByArtist(artistId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.goalsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @Request() req,
    @Param("id") id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(id, updateGoalDto);
  }
}
