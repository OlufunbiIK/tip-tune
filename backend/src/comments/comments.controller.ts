import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto, PaginationQueryDto } from './comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return await this.commentsService.create(createCommentDto, req.user.id);
  }

  @Get('track/:trackId')
  async findByTrack(
    @Param('trackId') trackId: string,
    @Query() query: PaginationQueryDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return await this.commentsService.findByTrack(trackId, query, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    return await this.commentsService.findOne(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
  ) {
    return await this.commentsService.update(id, updateCommentDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    await this.commentsService.delete(id, req.user.id);
    return { message: 'Comment deleted successfully' };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async like(@Param('id') id: string, @Request() req) {
    return await this.commentsService.likeComment(id, req.user.id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlike(@Param('id') id: string, @Request() req) {
    return await this.commentsService.unlikeComment(id, req.user.id);
  }
}