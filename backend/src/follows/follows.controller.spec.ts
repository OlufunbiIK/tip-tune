import { Test, TestingModule } from "@nestjs/testing";
import { FollowsController } from "./follows.controller";
import { FollowsService } from "./follows.service";
import { Follow, FollowingType } from "./entities/follow.entity";
import { CurrentUserData } from "../auth/decorators/current-user.decorator";

describe("FollowsController", () => {
  let controller: FollowsController;
  let followsService: FollowsService;

  const mockUser: CurrentUserData = {
    userId: "user-1",
    walletAddress: "GAAA...",
    isArtist: false,
  };

  const mockFollow: Partial<Follow> = {
    id: "follow-1",
    followerId: "user-1",
    followingId: "artist-1",
    followingType: FollowingType.ARTIST,
    notificationsEnabled: true,
    createdAt: new Date(),
  };

  const mockPaginated = {
    data: [mockFollow],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowsController],
      providers: [
        {
          provide: FollowsService,
          useValue: {
            follow: jest.fn().mockResolvedValue(mockFollow),
            unfollow: jest.fn().mockResolvedValue(undefined),
            getFollowers: jest.fn().mockResolvedValue(mockPaginated),
            getFollowerCount: jest.fn().mockResolvedValue(42),
            getFollowing: jest.fn().mockResolvedValue(mockPaginated),
            check: jest.fn().mockResolvedValue({
              following: true,
              notificationsEnabled: true,
            }),
            updateNotificationPreferences: jest
              .fn()
              .mockResolvedValue(mockFollow),
          },
        },
      ],
    }).compile();

    controller = module.get<FollowsController>(FollowsController);
    followsService = module.get<FollowsService>(FollowsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("follow", () => {
    it("should call FollowsService.follow with artistId, userId, and dto", async () => {
      const result = await controller.follow("artist-1", mockUser, {
        notificationsEnabled: false,
      });
      expect(followsService.follow).toHaveBeenCalledWith(
        "artist-1",
        "user-1",
        false,
      );
      expect(result).toEqual(mockFollow);
    });

    it("should default notificationsEnabled to true when dto is empty", async () => {
      await controller.follow("artist-1", mockUser, undefined);
      expect(followsService.follow).toHaveBeenCalledWith(
        "artist-1",
        "user-1",
        true,
      );
    });
  });

  describe("unfollow", () => {
    it("should call FollowsService.unfollow and return void", async () => {
      await controller.unfollow("artist-1", mockUser);
      expect(followsService.unfollow).toHaveBeenCalledWith(
        "artist-1",
        "user-1",
      );
    });
  });

  describe("getFollowers", () => {
    it("should return paginated followers for an artist", async () => {
      const pagination = { page: 2, limit: 20 };
      const result = await controller.getFollowers("artist-1", pagination);
      expect(followsService.getFollowers).toHaveBeenCalledWith(
        "artist-1",
        pagination,
      );
      expect(result).toEqual(mockPaginated);
    });
  });

  describe("getFollowerCount", () => {
    it("should return { count } for an artist", async () => {
      const result = await controller.getFollowerCount("artist-1");
      expect(followsService.getFollowerCount).toHaveBeenCalledWith("artist-1");
      expect(result).toEqual({ count: 42 });
    });
  });

  describe("getMyFollowing", () => {
    it("should return current user following list", async () => {
      const pagination = { page: 1, limit: 10 };
      const result = await controller.getMyFollowing(mockUser, pagination);
      expect(followsService.getFollowing).toHaveBeenCalledWith(
        "user-1",
        pagination,
      );
      expect(result).toEqual(mockPaginated);
    });
  });

  describe("getFollowing", () => {
    it("should return following list for a user", async () => {
      const pagination = { page: 1, limit: 10 };
      const result = await controller.getFollowing("user-2", pagination);
      expect(followsService.getFollowing).toHaveBeenCalledWith(
        "user-2",
        pagination,
      );
      expect(result).toEqual(mockPaginated);
    });
  });

  describe("check", () => {
    it("should return follow status for current user and artist", async () => {
      const result = await controller.check("artist-1", mockUser);
      expect(followsService.check).toHaveBeenCalledWith("artist-1", "user-1");
      expect(result).toEqual({ following: true, notificationsEnabled: true });
    });
  });

  describe("updateNotifications", () => {
    it("should call updateNotificationPreferences with artistId, userId, and dto", async () => {
      const dto = { notificationsEnabled: false };
      const result = await controller.updateNotifications(
        "artist-1",
        mockUser,
        dto,
      );
      expect(followsService.updateNotificationPreferences).toHaveBeenCalledWith(
        "artist-1",
        "user-1",
        false,
      );
      expect(result).toEqual(mockFollow);
    });
  });
});
