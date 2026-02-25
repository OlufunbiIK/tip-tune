import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActivitiesService } from "./activities.service";
import { Activity, ActivityType, EntityType } from "./entities/activity.entity";
import { UsersService } from "../users/users.service";
import { BlocksService } from "../blocks/blocks.service";
import { NotFoundException } from "@nestjs/common";

describe("ActivitiesService", () => {
  let service: ActivitiesService;
  let activityRepository: Repository<Activity>;
  let usersService: UsersService;

  const mockActivity: Activity = {
    id: "activity-id",
    userId: "user-id",
    user: null,
    activityType: ActivityType.NEW_TRACK,
    entityType: EntityType.TRACK,
    entityId: "track-id",
    metadata: { trackTitle: "Test Track" },
    isSeen: false,
    createdAt: new Date(),
  };

  const mockUser = {
    id: "user-id",
    username: "testuser",
    email: "test@example.com",
    walletAddress: "GD5DJQDQKPJ2R5XGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5Q",
    isArtist: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: BlocksService,
          useValue: {
            getMutedUserIds: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    activityRepository = module.get<Repository<Activity>>(
      getRepositoryToken(Activity),
    );
    usersService = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new activity", async () => {
      const createDto = {
        userId: "user-id",
        activityType: ActivityType.NEW_TRACK,
        entityType: EntityType.TRACK,
        entityId: "track-id",
        metadata: { trackTitle: "Test Track" },
      };

      jest.spyOn(activityRepository, "create").mockReturnValue(mockActivity);
      jest.spyOn(activityRepository, "save").mockResolvedValue(mockActivity);

      const result = await service.create(createDto);

      expect(result).toEqual(mockActivity);
      expect(activityRepository.create).toHaveBeenCalledWith(createDto);
      expect(activityRepository.save).toHaveBeenCalledWith(mockActivity);
    });
  });

  describe("getFeed", () => {
    it("should return personalized feed with pagination", async () => {
      const query = { page: 1, limit: 20 };
      const mockActivities = [mockActivity];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockActivities, 1]),
      };

      jest
        .spyOn(activityRepository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(activityRepository, "count").mockResolvedValue(0);

      const result = await service.getFeed("user-id", query);

      expect(result.data).toEqual(mockActivities);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.unseenCount).toBe(0);
    });

    it("should filter by activity type", async () => {
      const query = {
        page: 1,
        limit: 20,
        activityType: ActivityType.NEW_TRACK,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(activityRepository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(activityRepository, "count").mockResolvedValue(0);

      await service.getFeed("user-id", query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "activity.activityType = :activityType",
        { activityType: ActivityType.NEW_TRACK },
      );
    });

    it("should filter unseen only", async () => {
      const query = { page: 1, limit: 20, unseenOnly: true };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(activityRepository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(activityRepository, "count").mockResolvedValue(0);

      await service.getFeed("user-id", query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "activity.isSeen = :isSeen",
        { isSeen: false },
      );
    });
  });

  describe("getUserActivities", () => {
    it("should return user activities with pagination", async () => {
      const query = { page: 1, limit: 20 };
      const mockActivities = [mockActivity];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockActivities, 1]),
      };

      jest
        .spyOn(activityRepository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(activityRepository, "count").mockResolvedValue(0);

      const result = await service.getUserActivities("user-id", query);

      expect(result.data).toEqual(mockActivities);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unseenCount).toBe(0);
    });
  });

  describe("markAsSeen", () => {
    it("should mark activity as seen", async () => {
      const activityToUpdate = { ...mockActivity, isSeen: false };
      const updatedActivity = { ...mockActivity, isSeen: true };

      jest
        .spyOn(activityRepository, "findOne")
        .mockResolvedValue(activityToUpdate);
      jest.spyOn(activityRepository, "save").mockResolvedValue(updatedActivity);

      const result = await service.markAsSeen("activity-id", "user-id");

      expect(result.isSeen).toBe(true);
      expect(activityRepository.findOne).toHaveBeenCalledWith({
        where: { id: "activity-id", userId: "user-id" },
      });
      expect(activityRepository.save).toHaveBeenCalledWith(updatedActivity);
    });

    it("should throw NotFoundException if activity not found", async () => {
      jest.spyOn(activityRepository, "findOne").mockResolvedValue(null);

      await expect(service.markAsSeen("invalid-id", "user-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("markAllAsSeen", () => {
    it("should mark all activities as seen", async () => {
      const updateResult = { affected: 5 };

      jest
        .spyOn(activityRepository, "update")
        .mockResolvedValue(updateResult as any);

      const result = await service.markAllAsSeen("user-id");

      expect(result.count).toBe(5);
      expect(activityRepository.update).toHaveBeenCalledWith(
        { userId: "user-id", isSeen: false },
        { isSeen: true },
      );
    });
  });

  describe("trackNewTrack", () => {
    it("should track new track activity", async () => {
      const metadata = { trackTitle: "New Song", genre: "rock" };
      const createdActivity = {
        ...mockActivity,
        activityType: ActivityType.NEW_TRACK,
        metadata: { ...metadata, timestamp: expect.any(String) },
      };

      jest.spyOn(service, "create").mockResolvedValue(createdActivity);

      const result = await service.trackNewTrack(
        "artist-id",
        "track-id",
        metadata,
      );

      expect(result.activityType).toBe(ActivityType.NEW_TRACK);
      expect(result.entityType).toBe(EntityType.TRACK);
      expect(result.entityId).toBe("track-id");
      expect(result.metadata).toHaveProperty("timestamp");
    });
  });

  describe("trackTipSent", () => {
    it("should track tip sent activity", async () => {
      const metadata = { amount: 10.5, toArtistId: "artist-id" };
      const createdActivity = {
        ...mockActivity,
        activityType: ActivityType.TIP_SENT,
        entityType: EntityType.TIP,
        metadata: { ...metadata, timestamp: expect.any(String) },
      };

      jest.spyOn(service, "create").mockResolvedValue(createdActivity);

      const result = await service.trackTipSent("user-id", "tip-id", metadata);

      expect(result.activityType).toBe(ActivityType.TIP_SENT);
      expect(result.entityType).toBe(EntityType.TIP);
      expect(result.entityId).toBe("tip-id");
    });
  });

  describe("trackTipReceived", () => {
    it("should track tip received activity", async () => {
      const metadata = { amount: 10.5, fromUserId: "user-id" };
      const createdActivity = {
        ...mockActivity,
        activityType: ActivityType.TIP_RECEIVED,
        entityType: EntityType.TIP,
        metadata: { ...metadata, timestamp: expect.any(String) },
      };

      jest.spyOn(service, "create").mockResolvedValue(createdActivity);

      const result = await service.trackTipReceived(
        "artist-id",
        "tip-id",
        metadata,
      );

      expect(result.activityType).toBe(ActivityType.TIP_RECEIVED);
      expect(result.entityType).toBe(EntityType.TIP);
      expect(result.entityId).toBe("tip-id");
    });
  });

  describe("trackArtistFollowed", () => {
    it("should track artist followed activity", async () => {
      const metadata = { artistName: "Test Artist" };
      const createdActivity = {
        ...mockActivity,
        activityType: ActivityType.ARTIST_FOLLOWED,
        entityType: EntityType.ARTIST,
        metadata: { ...metadata, timestamp: expect.any(String) },
      };

      jest.spyOn(service, "create").mockResolvedValue(createdActivity);

      const result = await service.trackArtistFollowed(
        "user-id",
        "artist-id",
        metadata,
      );

      expect(result.activityType).toBe(ActivityType.ARTIST_FOLLOWED);
      expect(result.entityType).toBe(EntityType.ARTIST);
      expect(result.entityId).toBe("artist-id");
    });
  });

  describe("trackNewFollower", () => {
    it("should track new follower activity", async () => {
      const metadata = { followerName: "Test Follower" };
      const createdActivity = {
        ...mockActivity,
        activityType: ActivityType.NEW_FOLLOWER,
        entityType: EntityType.ARTIST,
        metadata: { ...metadata, timestamp: expect.any(String) },
      };

      jest.spyOn(service, "create").mockResolvedValue(createdActivity);

      const result = await service.trackNewFollower(
        "artist-id",
        "follower-id",
        metadata,
      );

      expect(result.activityType).toBe(ActivityType.NEW_FOLLOWER);
      expect(result.entityType).toBe(EntityType.ARTIST);
      expect(result.entityId).toBe("follower-id");
    });
  });
});
