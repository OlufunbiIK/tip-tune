import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { ActivitiesService } from "./activities.service";
import { ActivityFeedQueryDto } from "./dto/activity-feed-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";

@ApiTags("Activities")
@Controller("activities")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get("feed")
  @ApiOperation({
    summary: "Get personalized activity feed",
    description:
      "Returns activities from followed artists and user's own activities",
  })
  @ApiResponse({
    status: 200,
    description: "Activity feed retrieved successfully",
  })
  async getFeed(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ActivityFeedQueryDto,
  ) {
    return this.activitiesService.getFeed(user.userId, query);
  }

  @Get("me")
  @ApiOperation({
    summary: "Get user's own activities",
    description: "Returns activities created by the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "User activities retrieved successfully",
  })
  async getUserActivities(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ActivityFeedQueryDto,
  ) {
    return this.activitiesService.getUserActivities(user.userId, query);
  }

  @Patch(":id/seen")
  @ApiOperation({
    summary: "Mark activity as seen",
    description: "Marks a specific activity as seen by the user",
  })
  @ApiResponse({
    status: 200,
    description: "Activity marked as seen",
  })
  @ApiResponse({
    status: 404,
    description: "Activity not found",
  })
  async markAsSeen(
    @CurrentUser() user: CurrentUserData,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.markAsSeen(id, user.userId);
  }

  @Patch("seen/all")
  @ApiOperation({
    summary: "Mark all activities as seen",
    description: "Marks all unseen activities for the user as seen",
  })
  @ApiResponse({
    status: 200,
    description: "All activities marked as seen",
  })
  async markAllAsSeen(@CurrentUser() user: CurrentUserData) {
    return this.activitiesService.markAllAsSeen(user.userId);
  }
}
