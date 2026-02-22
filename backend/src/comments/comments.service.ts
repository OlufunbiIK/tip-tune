import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { CreateCommentDto, UpdateCommentDto, PaginationQueryDto } from './comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private commentLikeRepository: Repository<CommentLike>,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string): Promise<Comment> {
    const { trackId, content, parentCommentId } = createCommentDto;

    // If it's a reply, validate parent comment exists and check nesting level
    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentCommentId },
        relations: ['parentComment'],
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      // Check if parent is already a reply (enforce 2-level limit)
      if (parentComment.parentCommentId) {
        throw new BadRequestException('Cannot reply to a reply. Maximum nesting level is 2.');
      }
    }

    const comment = this.commentRepository.create({
      trackId,
      userId,
      content,
      parentCommentId: parentCommentId || null,
    });

    return await this.commentRepository.save(comment);
  }

  async findByTrack(
    trackId: string,
    query: PaginationQueryDto,
    userId?: string,
  ): Promise<{ comments: Comment[]; total: number; page: number; limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get top-level comments only (no parent)
    const [comments, total] = await this.commentRepository.findAndCount({
      where: {
        trackId,
        parentCommentId: IsNull(),
      },
      relations: ['user', 'replies', 'replies.user', 'likes'],
      order: {
        createdAt: 'DESC',
        replies: {
          createdAt: 'ASC',
        },
      },
      skip,
      take: limit,
    });

    // Add userLiked flag if userId is provided
    const commentsWithLikeStatus = await this.addUserLikedStatus(comments, userId);

    return {
      comments: commentsWithLikeStatus,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId?: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user', 'replies', 'replies.user', 'likes'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const [commentWithStatus] = await this.addUserLikedStatus([comment], userId);
    return commentWithStatus;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = updateCommentDto.content;
    comment.isEdited = true;

    return await this.commentRepository.save(comment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
  }

  async likeComment(commentId: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if already liked
    const existingLike = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    if (existingLike) {
      throw new BadRequestException('Comment already liked');
    }

    // Create like
    const like = this.commentLikeRepository.create({ commentId, userId });
    await this.commentLikeRepository.save(like);

    // Increment likes count
    comment.likesCount += 1;
    await this.commentRepository.save(comment);

    return await this.findOne(commentId, userId);
  }

  async unlikeComment(commentId: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const like = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    if (!like) {
      throw new BadRequestException('Comment not liked');
    }

    await this.commentLikeRepository.remove(like);

    // Decrement likes count
    comment.likesCount = Math.max(0, comment.likesCount - 1);
    await this.commentRepository.save(comment);

    return await this.findOne(commentId, userId);
  }

  private async addUserLikedStatus(comments: Comment[], userId?: string): Promise<Comment[]> {
    if (!userId) {
      return comments.map((comment) => ({
        ...comment,
        userLiked: false,
        replies: comment.replies?.map((reply) => ({ ...reply, userLiked: false })),
      })) as Comment[];
    }

    const commentIds = comments.map((c) => c.id);
    const replyIds = comments.flatMap((c) => c.replies?.map((r) => r.id) || []);
    const allIds = [...commentIds, ...replyIds];

    const likes = await this.commentLikeRepository.find({
      where: allIds.map((id) => ({ commentId: id, userId })),
    });

    const likedCommentIds = new Set(likes.map((like) => like.commentId));

    return comments.map((comment) => ({
      ...comment,
      userLiked: likedCommentIds.has(comment.id),
      replies: comment.replies?.map((reply) => ({
        ...reply,
        userLiked: likedCommentIds.has(reply.id),
      })),
    })) as Comment[];
  }
}