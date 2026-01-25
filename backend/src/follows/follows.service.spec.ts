import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FollowsService } from "./follows.service";
import { Follow, FollowingType } from "./entities/follow.entity";
import { Artist } from "../artists/entities/artist.entity";
import { User } from "../users/entities/user.entity";
import { ArtistsService } from "../artists/artists.service";
import { NotFoundException, ConflictException } from "@nestjs/common";

describe("FollowsService", () => {
  let service: FollowsService;
  let followRepo: Repository<Follow>;
  let artistRepo: Repository<Artist>;
  let userRepo: Repository<User>;
  let artistsService: ArtistsService;

  const mockUser: Partial<User> = {
    id: "user-1",
    username: "follower1",
    walletAddress: "GAAA...",
    profileImage: null,
  };

  const mockArtist: Partial<Artist> = {
    id: "artist-1",
    artistName: "Test Artist",
    genre: "Rock",
    profileImage: null,
    coverImage: null,
  };

  const mockFollow: Partial<Follow> = {
    id: "follow-1",
    followerId: "user-1",
    followingId: "artist-1",
    followingType: FollowingType.ARTIST,
    notificationsEnabled: true,
    createdAt: new Date(),
    follower: mockUser as User,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: {
            findBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findBy: jest.fn(),
          },
        },
        {
          provide: ArtistsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
    followRepo = module.get<Repository<Follow>>(getRepositoryToken(Follow));
    artistRepo = module.get<Repository<Artist>>(getRepositoryToken(Artist));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    artistsService = module.get<ArtistsService>(ArtistsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("follow", () => {
    it("should follow an artist successfully", async () => {
      const created = { ...mockFollow } as Follow;
      jest
        .spyOn(artistsService, "findOne")
        .mockResolvedValue(mockArtist as Artist);
      jest.spyOn(followRepo, "findOne").mockResolvedValue(null);
      jest.spyOn(followRepo, "create").mockReturnValue(created as Follow);
      jest.spyOn(followRepo, "save").mockResolvedValue(created);

      const result = await service.follow("artist-1", "user-1", true);

      expect(artistsService.findOne).toHaveBeenCalledWith("artist-1");
      expect(followRepo.findOne).toHaveBeenCalledWith({
        where: {
          followerId: "user-1",
          followingId: "artist-1",
          followingType: FollowingType.ARTIST,
        },
      });
      expect(followRepo.create).toHaveBeenCalledWith({
        followerId: "user-1",
        followingId: "artist-1",
        followingType: FollowingType.ARTIST,
        notificationsEnabled: true,
      });
      expect(result).toEqual(created);
    });

    it("should throw ConflictException when already following", async () => {
      jest
        .spyOn(artistsService, "findOne")
        .mockResolvedValue(mockArtist as Artist);
      jest.spyOn(followRepo, "findOne").mockResolvedValue(mockFollow as Follow);

      await expect(service.follow("artist-1", "user-1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw NotFoundException when artist does not exist", async () => {
      jest
        .spyOn(artistsService, "findOne")
        .mockRejectedValue(new NotFoundException());

      await expect(service.follow("artist-1", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("unfollow", () => {
    it("should unfollow an artist successfully", async () => {
      jest.spyOn(followRepo, "findOne").mockResolvedValue(mockFollow as Follow);
      jest.spyOn(followRepo, "remove").mockResolvedValue(mockFollow as Follow);

      await service.unfollow("artist-1", "user-1");

      expect(followRepo.findOne).toHaveBeenCalledWith({
        where: {
          followerId: "user-1",
          followingId: "artist-1",
          followingType: FollowingType.ARTIST,
        },
      });
      expect(followRepo.remove).toHaveBeenCalledWith(mockFollow);
    });

    it("should throw NotFoundException when follow relationship does not exist", async () => {
      jest.spyOn(followRepo, "findOne").mockResolvedValue(null);

      await expect(service.unfollow("artist-1", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getFollowers", () => {
    it("should return paginated followers for an artist", async () => {
      const followsWithFollower = [{ ...mockFollow, follower: mockUser }];
      jest
        .spyOn(artistsService, "findOne")
        .mockResolvedValue(mockArtist as Artist);
      jest
        .spyOn(followRepo, "findAndCount")
        .mockResolvedValue([followsWithFollower as Follow[], 1]);

      const result = await service.getFollowers("artist-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "user-1",
        username: "follower1",
        walletAddress: "GAAA...",
      });
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe("getFollowerCount", () => {
    it("should return follower count for an artist", async () => {
      jest
        .spyOn(artistsService, "findOne")
        .mockResolvedValue(mockArtist as Artist);
      jest.spyOn(followRepo, "count").mockResolvedValue(42);

      const result = await service.getFollowerCount("artist-1");

      expect(result).toBe(42);
    });
  });

  describe("getFollowing", () => {
    it("should return paginated following list", async () => {
      const follows = [{ ...mockFollow } as Follow];
      jest.spyOn(followRepo, "findAndCount").mockResolvedValue([follows, 1]);
      jest
        .spyOn(artistRepo, "findBy")
        .mockResolvedValue([mockArtist as Artist]);
      jest.spyOn(userRepo, "findBy").mockResolvedValue([]);

      const result = await service.getFollowing("user-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].followingType).toBe(FollowingType.ARTIST);
      expect(result.data[0].followingId).toBe("artist-1");
      expect(result.meta.total).toBe(1);
    });
  });

  describe("check", () => {
    it("should return { following: true, notificationsEnabled } when user follows", async () => {
      jest
        .spyOn(artistsService, "findOne")
        .mockResolvedValue(mockArtist as Artist);
      jest.spyOn(followRepo, "findOne").mockResolvedValue(mockFollow as Follow);

      const result = await service.check("artist-1", "user-1");

      expect(result).toEqual({ following: true, notificationsEnabled: true });
    });

    it("should return { following: false } when user does not follow", async () => {
      jest
        .spyOn(artistsService, "findOne")
        .mockResolvedValue(mockArtist as Artist);
      jest.spyOn(followRepo, "findOne").mockResolvedValue(null);

      const result = await service.check("artist-1", "user-1");

      expect(result).toEqual({ following: false });
    });
  });

  describe("updateNotificationPreferences", () => {
    it("should update notificationsEnabled successfully", async () => {
      const follow = { ...mockFollow, notificationsEnabled: false } as Follow;
      jest.spyOn(followRepo, "findOne").mockResolvedValue(follow);
      jest
        .spyOn(followRepo, "save")
        .mockImplementation((f) => Promise.resolve(f as Follow));

      const result = await service.updateNotificationPreferences(
        "artist-1",
        "user-1",
        false,
      );

      expect(follow.notificationsEnabled).toBe(false);
      expect(followRepo.save).toHaveBeenCalledWith(follow);
    });

    it("should throw NotFoundException when follow does not exist", async () => {
      jest.spyOn(followRepo, "findOne").mockResolvedValue(null);

      await expect(
        service.updateNotificationPreferences("artist-1", "user-1", false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
