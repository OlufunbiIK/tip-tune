import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { GenresService } from "./genres.service";
import { CreateGenreDto } from "./dto/create-genre.dto";
import { UpdateGenreDto } from "./dto/update-genre.dto";
import { QueryGenreDto } from "./dto/query-genre.dto";
import { AssignGenresDto } from "./dto/assign-genres.dto";
import { Genre } from "./entities/genre.entity";

@ApiTags("Genres")
@Controller("genres")
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new genre" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Genre created successfully",
    type: Genre,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Genre with this name or slug already exists",
  })
  async create(@Body() createGenreDto: CreateGenreDto): Promise<Genre> {
    return this.genresService.create(createGenreDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all genres with optional filtering" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of genres",
  })
  async findAll(@Query() queryDto: QueryGenreDto) {
    return this.genresService.findAll(queryDto);
  }

  @Get("discovery")
  @ApiOperation({ summary: "Get genre discovery page with hierarchy" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Genre discovery data with root genres and all genres",
  })
  async getDiscovery() {
    return this.genresService.getDiscovery();
  }

  @Get("popular")
  @ApiOperation({ summary: "Get popular genres ranked by track count" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of genres to return (default: 10)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of popular genres",
    type: [Genre],
  })
  async getPopular(@Query("limit") limit?: number) {
    const limitNum = limit ? parseInt(limit.toString(), 10) : 10;
    return this.genresService.getPopular(limitNum);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a genre by ID" })
  @ApiParam({ name: "id", description: "Genre ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Genre found",
    type: Genre,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Genre not found",
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Genre> {
    return this.genresService.findOne(id);
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Get a genre by slug" })
  @ApiParam({ name: "slug", description: "Genre slug" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Genre found",
    type: Genre,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Genre not found",
  })
  async findBySlug(@Param("slug") slug: string): Promise<Genre> {
    return this.genresService.findBySlug(slug);
  }

  @Get(":id/children")
  @ApiOperation({ summary: "Get all children (sub-genres) of a genre" })
  @ApiParam({ name: "id", description: "Genre ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of child genres",
    type: [Genre],
  })
  async getChildren(@Param("id", ParseUUIDPipe) id: string): Promise<Genre[]> {
    return this.genresService.getChildren(id);
  }

  @Get(":id/parent-chain")
  @ApiOperation({ summary: "Get parent chain (all ancestors) of a genre" })
  @ApiParam({ name: "id", description: "Genre ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of parent genres in order (root to immediate parent)",
    type: [Genre],
  })
  async getParentChain(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Genre[]> {
    return this.genresService.getParentChain(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a genre" })
  @ApiParam({ name: "id", description: "Genre ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Genre updated successfully",
    type: Genre,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Genre not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Genre with this name already exists",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ): Promise<Genre> {
    return this.genresService.update(id, updateGenreDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a genre" })
  @ApiParam({ name: "id", description: "Genre ID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Genre deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Genre not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Cannot delete genre with children or assigned tracks",
  })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.genresService.remove(id);
  }

  @Post("tracks/:trackId/assign")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Assign multiple genres to a track" })
  @ApiParam({ name: "trackId", description: "Track ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Genres assigned successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Track or genre not found",
  })
  async assignGenresToTrack(
    @Param("trackId", ParseUUIDPipe) trackId: string,
    @Body() assignGenresDto: AssignGenresDto,
  ) {
    return this.genresService.assignGenresToTrack(
      trackId,
      assignGenresDto.genreIds,
    );
  }

  @Get("tracks/:trackId")
  @ApiOperation({ summary: "Get all genres for a track" })
  @ApiParam({ name: "trackId", description: "Track ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of genres for the track",
    type: [Genre],
  })
  async getTrackGenres(
    @Param("trackId", ParseUUIDPipe) trackId: string,
  ): Promise<Genre[]> {
    return this.genresService.getTrackGenres(trackId);
  }

  @Delete("tracks/:trackId/genres/:genreId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a genre assignment from a track" })
  @ApiParam({ name: "trackId", description: "Track ID" })
  @ApiParam({ name: "genreId", description: "Genre ID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Genre assignment removed successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Genre assignment not found",
  })
  async removeGenreFromTrack(
    @Param("trackId", ParseUUIDPipe) trackId: string,
    @Param("genreId", ParseUUIDPipe) genreId: string,
  ): Promise<void> {
    return this.genresService.removeGenreFromTrack(trackId, genreId);
  }
}
