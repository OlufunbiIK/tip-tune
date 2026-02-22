import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentsService } from './comments.service';
import { Comment } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepository: Repository<Comment>;
  let commentLikeRepository: Repository<CommentLike>;

  const mockCommentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };

  const mockCommentLikeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(CommentLike),
          useValue: mockCommentLikeRepository,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentRepository = module.get<Repository<Comment>>(getRepositoryToken(Comment));
    commentLikeRepository = module.get<Repository<CommentLike>>(getRepositoryToken(CommentLike));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a top-level comment', async () => {
      const createDto = {
        trackId: 'track-uuid',
        content: 'Great track!',
      };
      const userId = 'user-uuid';
      const savedComment = {
        id: 'comment-uuid',
        ...createDto,
        userId,
        parentCommentId: null,
      };

      mockCommentRepository.create.mockReturnValue(savedComment);
      mockCommentRepository.save.mockResolvedValue(savedComment);

      const result = await service.create(createDto, userId);

      expect(mockCommentRepository.create).toHaveBeenCalledWith({
        trackId: createDto.trackId,
        userId,
        content: createDto.content,
        parentCommentId: null,
      });
      expect(result).toEqual(savedComment);
    });

    it('should create a reply comment', async () => {
      const parentComment = {
        id: 'parent-uuid',
        parentCommentId: null,
      };
      const createDto = {
        trackId: 'track-uuid',
        content: 'I agree!',
        parentCommentId: 'parent-uuid',
      };
      const userId = 'user-uuid';

      mockCommentRepository.findOne.mockResolvedValue(parentComment);
      mockCommentRepository.create.mockReturnValue(createDto);
      mockCommentRepository.save.mockResolvedValue(createDto);

      await service.create(createDto, userId);

      expect(mockCommentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'parent-uuid' },
        relations: ['parentComment'],
      });
    });

    it('should throw error when replying to a reply', async () => {
      const parentComment = {
        id: 'parent-uuid',
        parentCommentId: 'grandparent-uuid',
      };
      const createDto = {
        trackId: 'track-uuid',
        content: 'Reply to reply',
        parentCommentId: 'parent-uuid',
      };

      mockCommentRepository.findOne.mockResolvedValue(parentComment);

      await expect(service.create(createDto, 'user-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw error when parent comment not found', async () => {
      const createDto = {
        trackId: 'track-uuid',
        content: 'Reply',
        parentCommentId: 'non-existent',
      };

      mockCommentRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTrack', () => {
    it('should return paginated comments for a track', async () => {
      const trackId = 'track-uuid';
      const comments = [
        { id: 'comment-1', content: 'Comment 1', replies: [] },
        { id: 'comment-2', content: 'Comment 2', replies: [] },
      ];
      const query = { page: 1, limit: 20 };

      mockCommentRepository.findAndCount.mockResolvedValue([comments, 2]);
      mockCommentLikeRepository.find.mockResolvedValue([]);

      const result = await service.findByTrack(trackId, query);

      expect(result.comments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('update', () => {
    it('should update a comment', async () => {
      const commentId = 'comment-uuid';
      const userId = 'user-uuid';
      const updateDto = { content: 'Updated content' };
      const comment = {
        id: commentId,
        userId,
        content: 'Original content',
        isEdited: false,
      };

      mockCommentRepository.findOne.mockResolvedValue(comment);
      mockCommentRepository.save.mockResolvedValue({
        ...comment,
        ...updateDto,
        isEdited: true,
      });

      const result = await service.update(commentId, updateDto, userId);

      expect(result.content).toBe(updateDto.content);
      expect(result.isEdited).toBe(true);
    });

    it('should throw error when updating others comment', async () => {
      const commentId = 'comment-uuid';
      const comment = {
        id: commentId,
        userId: 'owner-uuid',
      };

      mockCommentRepository.findOne.mockResolvedValue(comment);

      await expect(service.update(commentId, { content: 'New' }, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a comment', async () => {
      const commentId = 'comment-uuid';
      const userId = 'user-uuid';
      const comment = {
        id: commentId,
        userId,
      };

      mockCommentRepository.findOne.mockResolvedValue(comment);
      mockCommentRepository.remove.mockResolvedValue(comment);

      await service.delete(commentId, userId);

      expect(mockCommentRepository.remove).toHaveBeenCalledWith(comment);
    });

    it('should throw error when deleting others comment', async () => {
      const commentId = 'comment-uuid';
      const comment = {
        id: commentId,
        userId: 'owner-uuid',
      };

      mockCommentRepository.findOne.mockResolvedValue(comment);

      await expect(service.delete(commentId, 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('likeComment', () => {
    it('should like a comment', async () => {
      const commentId = 'comment-uuid';
      const userId = 'user-uuid';
      const comment = {
        id: commentId,
        likesCount: 0,
      };

      mockCommentRepository.findOne.mockResolvedValue(comment);
      mockCommentLikeRepository.findOne.mockResolvedValue(null);
      mockCommentLikeRepository.create.mockReturnValue({ commentId, userId });
      mockCommentLikeRepository.save.mockResolvedValue({ commentId, userId });
      mockCommentRepository.save.mockResolvedValue({ ...comment, likesCount: 1 });

      // Mock findOne for final result
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...comment,
        likesCount: 1,
      } as any);

      const result = await service.likeComment(commentId, userId);

      expect(result.likesCount).toBe(1);
    });

    it('should throw error when liking already liked comment', async () => {
      const commentId = 'comment-uuid';
      const userId = 'user-uuid';
      const comment = { id: commentId, likesCount: 1 };
      const existingLike = { id: 'like-uuid', commentId, userId };

      mockCommentRepository.findOne.mockResolvedValue(comment);
      mockCommentLikeRepository.findOne.mockResolvedValue(existingLike);

      await expect(service.likeComment(commentId, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('unlikeComment', () => {
    it('should unlike a comment', async () => {
      const commentId = 'comment-uuid';
      const userId = 'user-uuid';
      const comment = {
        id: commentId,
        likesCount: 1,
      };
      const like = { id: 'like-uuid', commentId, userId };

      mockCommentRepository.findOne.mockResolvedValue(comment);
      mockCommentLikeRepository.findOne.mockResolvedValue(like);
      mockCommentLikeRepository.remove.mockResolvedValue(like);
      mockCommentRepository.save.mockResolvedValue({ ...comment, likesCount: 0 });

      // Mock findOne for final result
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...comment,
        likesCount: 0,
      } as any);

      const result = await service.unlikeComment(commentId, userId);

      expect(result.likesCount).toBe(0);
    });

    it('should throw error when unliking non-liked comment', async () => {
      const commentId = 'comment-uuid';
      const userId = 'user-uuid';
      const comment = { id: commentId, likesCount: 0 };

      mockCommentRepository.findOne.mockResolvedValue(comment);
      mockCommentLikeRepository.findOne.mockResolvedValue(null);

      await expect(service.unlikeComment(commentId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});