import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  Query,
  Param,
} from "@nestjs/common";
import { ArtistsService } from "./artists.service";
import { CreateArtistDto } from "./dto/create-artist.dto";
import { UpdateArtistDto } from "./dto/update-artist.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";

@Controller("artists")
@UseGuards(JwtAuthGuard)
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Post()
  create(@CurrentUser("userId") userId: string, @Body() dto: CreateArtistDto) {
    return this.artistsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all artists" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page (default: 20, max: 100)",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of artists",
    schema: {
      example: {
        data: [
          {
            /* artist fields */
          },
        ],
        meta: {
          total: 120,
          page: 2,
          limit: 20,
          totalPages: 6,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    },
  })
  findAll(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.artistsService.findAll(Number(page), Number(limit));
  }

  @Get("me")
  findMyArtist(@CurrentUser("userId") userId: string) {
    return this.artistsService.findByUser(userId);
  }

  @Patch("me")
  update(@CurrentUser("userId") userId: string, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(userId, dto);
  }

  @Delete("me")
  remove(@CurrentUser("userId") userId: string) {
    return this.artistsService.remove(userId);
  }

  // Admin only
  @Post(":artistId/restore")
  @ApiOperation({ summary: "Restore a soft-deleted artist (admin only)" })
  @ApiParam({ name: "artistId", description: "Artist UUID", type: "string" })
  @ApiResponse({ status: 200, description: "Artist restored successfully" })
  @ApiResponse({ status: 404, description: "Artist not found" })
  async restore(@Param("artistId") artistId: string) {
    // TODO: Add admin guard
    return this.artistsService.restore(artistId);
  }
}
