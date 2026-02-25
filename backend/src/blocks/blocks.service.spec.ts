import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BlocksService } from "./blocks.service";
import { UserBlock, BlockReason } from "./entities/user-block.entity";
import { UserMute, MuteType } from "./entities/user-mute.entity";
import { User } from "../users/entities/user.entity";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";

describe("BlocksService", () => {
  let service: BlocksService;
  let blockRepo: Repository<UserBlock>;
  let muteRepo: Repository<UserMute>;
  let userRepo: Repository<User>;

  const mockBlocker: Partial<User> = {
    id: "user-1",
    username: "testuser",
    walletAddress: "GAAA...",
    profileImage: null,
  };

  const mockTargetUser: Partial<User> = {
    id: "user-2",
    username: "targetuser",
    walletAddress: "GBBB...",
    profileImage: null,
  };

  const mockBlock: Partial<UserBlock> = {
    id: "block-1",
    blockerId: "user-1",
    blockedId: "user-2",
    reason: BlockReason.SPAM,
    createdAt: new Date(),
    blocked: mockTargetUser as User,
  };

  const mockMute: Partial<UserMute> = {
    id: "mute-1",
    muterId: "user-1",
    mutedId: "user-2",
    muteType: MuteType.BOTH,
    expiresAt: null,
    createdAt: new Date(),
    muted: mockTargetUser as User,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,
        {
          provide: getRepositoryToken(UserBlock),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserMute),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlocksService>(BlocksService);
    blockRepo = module.get<Repository<UserBlock>>(
      getRepositoryToken(UserBlock),
    );
    muteRepo = module.get<Repository<UserMute>>(getRepositoryToken(UserMute));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("blockUser", () => {
    it("should block a user successfully", async () => {
      const created = { ...mockBlock } as UserBlock;
      jest.spyOn(userRepo, "findOne").mockResolvedValue(mockTargetUser as User);
      jest.spyOn(blockRepo, "findOne").mockResolvedValue(null);
      jest.spyOn(blockRepo, "create").mockReturnValue(created);
      jest.spyOn(blockRepo, "save").mockResolvedValue(created);

      const result = await service.blockUser(
        "user-1",
        "user-2",
        BlockReason.SPAM,
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: "user-2" },
      });
      expect(blockRepo.findOne).toHaveBeenCalledWith({
        where: { blockerId: "user-1", blockedId: "user-2" },
      });
      expect(blockRepo.create).toHaveBeenCalledWith({
        blockerId: "user-1",
        blockedId: "user-2",
        reason: BlockReason.SPAM,
      });
      expect(result).toEqual(created);
    });

    it("should throw BadRequestException when blocking yourself", async () => {
      await expect(service.blockUser("user-1", "user-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when target user does not exist", async () => {
      jest.spyOn(userRepo, "findOne").mockResolvedValue(null);

      await expect(service.blockUser("user-1", "user-2")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException when user is already blocked", async () => {
      jest.spyOn(userRepo, "findOne").mockResolvedValue(mockTargetUser as User);
      jest
        .spyOn(blockRepo, "findOne")
        .mockResolvedValue(mockBlock as UserBlock);

      await expect(service.blockUser("user-1", "user-2")).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("unblockUser", () => {
    it("should unblock a user successfully", async () => {
      jest
        .spyOn(blockRepo, "findOne")
        .mockResolvedValue(mockBlock as UserBlock);
      jest.spyOn(blockRepo, "remove").mockResolvedValue(mockBlock as UserBlock);

      await service.unblockUser("user-1", "user-2");

      expect(blockRepo.findOne).toHaveBeenCalledWith({
        where: { blockerId: "user-1", blockedId: "user-2" },
      });
      expect(blockRepo.remove).toHaveBeenCalledWith(mockBlock);
    });

    it("should throw NotFoundException when block relationship does not exist", async () => {
      jest.spyOn(blockRepo, "findOne").mockResolvedValue(null);

      await expect(service.unblockUser("user-1", "user-2")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("isBlocked", () => {
    it("should return true when user is blocked", async () => {
      jest.spyOn(blockRepo, "count").mockResolvedValue(1);

      const result = await service.isBlocked("user-1", "user-2");

      expect(result).toBe(true);
    });

    it("should return false when user is not blocked", async () => {
      jest.spyOn(blockRepo, "count").mockResolvedValue(0);

      const result = await service.isBlocked("user-1", "user-2");

      expect(result).toBe(false);
    });
  });

  describe("isBlockedByArtist", () => {
    it("should return true when user is blocked by artist", async () => {
      jest.spyOn(blockRepo, "count").mockResolvedValue(1);

      const result = await service.isBlockedByArtist("artist-1", "user-1");

      expect(result).toBe(true);
      expect(blockRepo.count).toHaveBeenCalledWith({
        where: { blockerId: "artist-1", blockedId: "user-1" },
      });
    });
  });

  describe("getBlockedUsers", () => {
    it("should return paginated blocked users", async () => {
      const blocksWithBlocked = [{ ...mockBlock, blocked: mockTargetUser }];
      jest
        .spyOn(blockRepo, "findAndCount")
        .mockResolvedValue([blocksWithBlocked as UserBlock[], 1]);

      const result = await service.getBlockedUsers("user-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "user-2",
        username: "targetuser",
      });
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe("muteUser", () => {
    it("should mute a user successfully", async () => {
      const created = { ...mockMute } as UserMute;
      jest.spyOn(userRepo, "findOne").mockResolvedValue(mockTargetUser as User);
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(null);
      jest.spyOn(muteRepo, "create").mockReturnValue(created);
      jest.spyOn(muteRepo, "save").mockResolvedValue(created);

      const result = await service.muteUser("user-1", "user-2", MuteType.BOTH);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: "user-2" },
      });
      expect(muteRepo.create).toHaveBeenCalledWith({
        muterId: "user-1",
        mutedId: "user-2",
        muteType: MuteType.BOTH,
        expiresAt: undefined,
      });
      expect(result).toEqual(created);
    });

    it("should throw BadRequestException when muting yourself", async () => {
      await expect(service.muteUser("user-1", "user-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should update existing mute", async () => {
      const existingMute = { ...mockMute } as UserMute;
      jest.spyOn(userRepo, "findOne").mockResolvedValue(mockTargetUser as User);
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(existingMute);
      jest.spyOn(muteRepo, "save").mockResolvedValue(existingMute);

      await service.muteUser("user-1", "user-2", MuteType.NOTIFICATIONS);

      expect(existingMute.muteType).toBe(MuteType.NOTIFICATIONS);
      expect(muteRepo.save).toHaveBeenCalledWith(existingMute);
    });
  });

  describe("unmuteUser", () => {
    it("should unmute a user successfully", async () => {
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(mockMute as UserMute);
      jest.spyOn(muteRepo, "remove").mockResolvedValue(mockMute as UserMute);

      await service.unmuteUser("user-1", "user-2");

      expect(muteRepo.findOne).toHaveBeenCalledWith({
        where: { muterId: "user-1", mutedId: "user-2" },
      });
      expect(muteRepo.remove).toHaveBeenCalledWith(mockMute);
    });

    it("should throw NotFoundException when mute relationship does not exist", async () => {
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(null);

      await expect(service.unmuteUser("user-1", "user-2")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("isMuted", () => {
    it("should return true when user is muted", async () => {
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(mockMute as UserMute);

      const result = await service.isMuted("user-1", "user-2");

      expect(result).toBe(true);
    });

    it("should return false when user is not muted", async () => {
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(null);

      const result = await service.isMuted("user-1", "user-2");

      expect(result).toBe(false);
    });

    it("should return false when mute has expired", async () => {
      const expiredMute = {
        ...mockMute,
        expiresAt: new Date(Date.now() - 1000),
      } as UserMute;
      jest.spyOn(muteRepo, "findOne").mockResolvedValue(expiredMute);

      const result = await service.isMuted("user-1", "user-2");

      expect(result).toBe(false);
    });
  });

  describe("getMutedUsers", () => {
    it("should return paginated muted users", async () => {
      const mutesWithMuted = [{ ...mockMute, muted: mockTargetUser }];
      jest
        .spyOn(muteRepo, "findAndCount")
        .mockResolvedValue([mutesWithMuted as UserMute[], 1]);

      const result = await service.getMutedUsers("user-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "user-2",
        username: "targetuser",
        muteType: MuteType.BOTH,
      });
      expect(result.meta.total).toBe(1);
    });
  });

  describe("handleExpiredMutes", () => {
    it("should remove expired mutes", async () => {
      const expiredMutes = [mockMute as UserMute];
      jest.spyOn(muteRepo, "find").mockResolvedValue(expiredMutes);
      jest.spyOn(muteRepo, "remove").mockResolvedValue(mockMute as UserMute);

      await service.handleExpiredMutes();

      expect(muteRepo.remove).toHaveBeenCalledWith(mockMute);
    });

    it("should do nothing when no expired mutes", async () => {
      jest.spyOn(muteRepo, "find").mockResolvedValue([]);
      const removeSpy = jest.spyOn(muteRepo, "remove");

      await service.handleExpiredMutes();

      expect(removeSpy).not.toHaveBeenCalled();
    });
  });
});
