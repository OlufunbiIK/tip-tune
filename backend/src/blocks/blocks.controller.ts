import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateMuteDto } from './dto/create-mute.dto';
import { BlockPaginationQueryDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('blocks')
@Controller('blocks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post(':targetId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({ name: 'targetId', description: 'User ID to block' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User blocked successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'User is already blocked' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot block yourself' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async blockUser(
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto?: CreateBlockDto,
  ) {
    return this.blocksService.blockUser(user.userId, targetId, dto?.reason);
  }

  @Delete(':targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'targetId', description: 'User ID to unblock' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User unblocked successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Block relationship not found' })
  async unblockUser(
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.blocksService.unblockUser(user.userId, targetId);
  }

  @Get('my-blocks')
  @ApiOperation({ summary: 'Get list of blocked users' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of blocked users' })
  async getMyBlocks(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: BlockPaginationQueryDto,
  ) {
    return this.blocksService.getBlockedUsers(user.userId, pagination);
  }

  @Get('check/:targetId')
  @ApiOperation({ summary: 'Check if a user is blocked' })
  @ApiParam({ name: 'targetId', description: 'User ID to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block status',
    schema: {
      type: 'object',
      properties: {
        blocked: { type: 'boolean' },
      },
    },
  })
  async checkBlock(
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const blocked = await this.blocksService.isBlocked(user.userId, targetId);
    return { blocked };
  }
}

@ApiTags('mutes')
@Controller('mutes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class MutesController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post(':targetId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mute a user' })
  @ApiParam({ name: 'targetId', description: 'User ID to mute' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User muted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot mute yourself' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async muteUser(
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto?: CreateMuteDto,
  ) {
    const expiresAt = dto?.expiresAt ? new Date(dto.expiresAt) : undefined;
    return this.blocksService.muteUser(user.userId, targetId, dto?.muteType, expiresAt);
  }

  @Delete(':targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unmute a user' })
  @ApiParam({ name: 'targetId', description: 'User ID to unmute' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User unmuted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Mute relationship not found' })
  async unmuteUser(
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.blocksService.unmuteUser(user.userId, targetId);
  }

  @Get('my-mutes')
  @ApiOperation({ summary: 'Get list of muted users' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of muted users' })
  async getMyMutes(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: BlockPaginationQueryDto,
  ) {
    return this.blocksService.getMutedUsers(user.userId, pagination);
  }

  @Get('check/:targetId')
  @ApiOperation({ summary: 'Check if a user is muted' })
  @ApiParam({ name: 'targetId', description: 'User ID to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mute status',
    schema: {
      type: 'object',
      properties: {
        muted: { type: 'boolean' },
      },
    },
  })
  async checkMute(
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const muted = await this.blocksService.isMuted(user.userId, targetId);
    return { muted };
  }
}
