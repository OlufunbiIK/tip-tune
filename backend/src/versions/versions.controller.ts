import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { VersionPaginationQueryDto } from './dto/pagination.dto';

@ApiTags('Track Versions')
@Controller('tracks/:trackId/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a new version of a track' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  @ApiResponse({ status: 400, description: 'Max versions reached or invalid data' })
  @ApiResponse({ status: 403, description: 'Not the track owner' })
  @ApiResponse({ status: 404, description: 'Track not found' })
  async createVersion(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() createVersionDto: CreateVersionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.versionsService.createVersion(
      trackId,
      createVersionDto,
      user.walletAddress,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all versions of a track (artist only)' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  @ApiResponse({ status: 404, description: 'Track not found' })
  async getVersions(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Query() query: VersionPaginationQueryDto,
  ) {
    return this.versionsService.getVersions(trackId, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the active version of a track' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiResponse({ status: 200, description: 'Active version' })
  @ApiResponse({ status: 404, description: 'Track or active version not found' })
  async getActiveVersion(
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ) {
    return this.versionsService.getActiveVersion(trackId);
  }

  @Put(':versionId/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate a specific version' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({ status: 200, description: 'Version activated successfully' })
  @ApiResponse({ status: 403, description: 'Not the track owner' })
  @ApiResponse({ status: 404, description: 'Track or version not found' })
  async activateVersion(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.versionsService.activateVersion(trackId, versionId, user.walletAddress);
  }

  @Delete(':versionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a version (cannot delete active version)' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({ status: 200, description: 'Version deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete active or only version' })
  @ApiResponse({ status: 403, description: 'Not the track owner' })
  @ApiResponse({ status: 404, description: 'Track or version not found' })
  async deleteVersion(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.versionsService.deleteVersion(trackId, versionId, user.walletAddress);
    return { message: 'Version deleted successfully' };
  }

  @Get(':versionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific version by ID' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiParam({ name: 'versionId', description: 'Version ID' })
  @ApiResponse({ status: 200, description: 'Version details' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getVersion(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.versionsService.getVersionById(trackId, versionId);
  }
}
