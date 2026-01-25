import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
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
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { FollowsService } from "./follows.service";
import { FollowArtistDto } from "./dto/follow-artist.dto";
import { UpdateNotificationsDto } from "./dto/update-notifications.dto";
import { FollowPaginationQueryDto } from "./dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { UseGuards } from "@nestjs/common";
import { Follow } from "./entities/follow.entity";

@ApiTags("follows")
@Controller("follows")
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(":artistId")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Follow an artist" })
  @ApiParam({ name: "artistId", description: "Artist ID to follow" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Successfully followed artist",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Already following this artist",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Artist not found",
  })
  async follow(
    @Param("artistId", ParseUUIDPipe) artistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto?: FollowArtistDto,
  ): Promise<Follow> {
    return this.followsService.follow(
      artistId,
      user.userId,
      dto?.notificationsEnabled ?? true,
    );
  }

  @Delete(":artistId")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Unfollow an artist" })
  @ApiParam({ name: "artistId", description: "Artist ID to unfollow" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Successfully unfollowed",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Follow relationship not found",
  })
  async unfollow(
    @Param("artistId", ParseUUIDPipe) artistId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.followsService.unfollow(artistId, user.userId);
  }

  @Get("followers/:artistId/count")
  @Public()
  @ApiOperation({ summary: "Get an artist's follower count" })
  @ApiParam({ name: "artistId", description: "Artist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Follower count",
    schema: { type: "object", properties: { count: { type: "number" } } },
  })
  async getFollowerCount(
    @Param("artistId", ParseUUIDPipe) artistId: string,
  ): Promise<{ count: number }> {
    const count = await this.followsService.getFollowerCount(artistId);
    return { count };
  }

  @Get("followers/:artistId")
  @Public()
  @ApiOperation({ summary: "Get an artist's followers list" })
  @ApiParam({ name: "artistId", description: "Artist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paginated list of followers",
  })
  async getFollowers(
    @Param("artistId", ParseUUIDPipe) artistId: string,
    @Query() pagination: FollowPaginationQueryDto,
  ) {
    return this.followsService.getFollowers(artistId, pagination);
  }

  @Get("following/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Get the current user's following list" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paginated list of artists/users the current user follows",
  })
  async getMyFollowing(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: FollowPaginationQueryDto,
  ) {
    return this.followsService.getFollowing(user.userId, pagination);
  }

  @Get("following/:userId")
  @Public()
  @ApiOperation({ summary: "Get a user's following list" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Paginated list of following",
  })
  async getFollowing(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query() pagination: FollowPaginationQueryDto,
  ) {
    return this.followsService.getFollowing(userId, pagination);
  }

  @Get("check/:artistId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Check if the current user follows an artist" })
  @ApiParam({ name: "artistId", description: "Artist ID to check" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Follow status",
    schema: {
      type: "object",
      properties: {
        following: { type: "boolean" },
        notificationsEnabled: { type: "boolean", nullable: true },
      },
    },
  })
  async check(
    @Param("artistId", ParseUUIDPipe) artistId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.followsService.check(artistId, user.userId);
  }

  @Patch(":artistId/notifications")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: "Update notification preferences for an artist follow",
  })
  @ApiParam({ name: "artistId", description: "Artist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notification preferences updated",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Follow relationship not found",
  })
  async updateNotifications(
    @Param("artistId", ParseUUIDPipe) artistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.followsService.updateNotificationPreferences(
      artistId,
      user.userId,
      dto.notificationsEnabled,
    );
  }
}
