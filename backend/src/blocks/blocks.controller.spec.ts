import { Test, TestingModule } from "@nestjs/testing";
import { BlocksController, MutesController } from "./blocks.controller";
import { BlocksService } from "./blocks.service";
import { BlockReason } from "./entities/user-block.entity";
import { MuteType } from "./entities/user-mute.entity";
import { CurrentUserData } from "../auth/decorators/current-user.decorator";

describe("BlocksController", () => {
  let controller: BlocksController;
  let blocksService: BlocksService;

  const mockUser: CurrentUserData = {
    userId: "user-1",
    walletAddress: "GAAA...",
    isArtist: false,
  };

  const mockBlockedUser = {
    id: "user-2",
    username: "blockeduser",
    profileImage: null,
    walletAddress: "GBBB...",
    blockedAt: new Date(),
    reason: BlockReason.SPAM,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlocksController],
      providers: [
        {
          provide: BlocksService,
          useValue: {
            blockUser: jest.fn(),
            unblockUser: jest.fn(),
            getBlockedUsers: jest.fn(),
            isBlocked: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BlocksController>(BlocksController);
    blocksService = module.get<BlocksService>(BlocksService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("blockUser", () => {
    it("should block a user", async () => {
      const mockBlock = {
        id: "block-1",
        blockerId: "user-1",
        blockedId: "user-2",
      };
      jest
        .spyOn(blocksService, "blockUser")
        .mockResolvedValue(mockBlock as any);

      const result = await controller.blockUser("user-2", mockUser, {
        reason: BlockReason.SPAM,
      });

      expect(blocksService.blockUser).toHaveBeenCalledWith(
        "user-1",
        "user-2",
        BlockReason.SPAM,
      );
      expect(result).toEqual(mockBlock);
    });
  });

  describe("unblockUser", () => {
    it("should unblock a user", async () => {
      jest.spyOn(blocksService, "unblockUser").mockResolvedValue(undefined);

      await controller.unblockUser("user-2", mockUser);

      expect(blocksService.unblockUser).toHaveBeenCalledWith(
        "user-1",
        "user-2",
      );
    });
  });

  describe("getMyBlocks", () => {
    it("should return paginated blocked users", async () => {
      const mockResponse = {
        data: [mockBlockedUser],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      jest
        .spyOn(blocksService, "getBlockedUsers")
        .mockResolvedValue(mockResponse);

      const result = await controller.getMyBlocks(mockUser, {
        page: 1,
        limit: 10,
      });

      expect(blocksService.getBlockedUsers).toHaveBeenCalledWith("user-1", {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("checkBlock", () => {
    it("should return blocked status", async () => {
      jest.spyOn(blocksService, "isBlocked").mockResolvedValue(true);

      const result = await controller.checkBlock("user-2", mockUser);

      expect(blocksService.isBlocked).toHaveBeenCalledWith("user-1", "user-2");
      expect(result).toEqual({ blocked: true });
    });
  });
});

describe("MutesController", () => {
  let controller: MutesController;
  let blocksService: BlocksService;

  const mockUser: CurrentUserData = {
    userId: "user-1",
    walletAddress: "GAAA...",
    isArtist: false,
  };

  const mockMutedUser = {
    id: "user-2",
    username: "muteduser",
    profileImage: null,
    walletAddress: "GBBB...",
    mutedAt: new Date(),
    muteType: MuteType.BOTH,
    expiresAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MutesController],
      providers: [
        {
          provide: BlocksService,
          useValue: {
            muteUser: jest.fn(),
            unmuteUser: jest.fn(),
            getMutedUsers: jest.fn(),
            isMuted: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MutesController>(MutesController);
    blocksService = module.get<BlocksService>(BlocksService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("muteUser", () => {
    it("should mute a user", async () => {
      const mockMute = { id: "mute-1", muterId: "user-1", mutedId: "user-2" };
      jest.spyOn(blocksService, "muteUser").mockResolvedValue(mockMute as any);

      const result = await controller.muteUser("user-2", mockUser, {
        muteType: MuteType.NOTIFICATIONS,
      });

      expect(blocksService.muteUser).toHaveBeenCalledWith(
        "user-1",
        "user-2",
        MuteType.NOTIFICATIONS,
        undefined,
      );
      expect(result).toEqual(mockMute);
    });

    it("should mute a user with expiration", async () => {
      const mockMute = { id: "mute-1", muterId: "user-1", mutedId: "user-2" };
      const expiresAt = "2026-03-01T00:00:00Z";
      jest.spyOn(blocksService, "muteUser").mockResolvedValue(mockMute as any);

      await controller.muteUser("user-2", mockUser, {
        muteType: MuteType.BOTH,
        expiresAt,
      });

      expect(blocksService.muteUser).toHaveBeenCalledWith(
        "user-1",
        "user-2",
        MuteType.BOTH,
        new Date(expiresAt),
      );
    });
  });

  describe("unmuteUser", () => {
    it("should unmute a user", async () => {
      jest.spyOn(blocksService, "unmuteUser").mockResolvedValue(undefined);

      await controller.unmuteUser("user-2", mockUser);

      expect(blocksService.unmuteUser).toHaveBeenCalledWith("user-1", "user-2");
    });
  });

  describe("getMyMutes", () => {
    it("should return paginated muted users", async () => {
      const mockResponse = {
        data: [mockMutedUser],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      jest
        .spyOn(blocksService, "getMutedUsers")
        .mockResolvedValue(mockResponse);

      const result = await controller.getMyMutes(mockUser, {
        page: 1,
        limit: 10,
      });

      expect(blocksService.getMutedUsers).toHaveBeenCalledWith("user-1", {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("checkMute", () => {
    it("should return muted status", async () => {
      jest.spyOn(blocksService, "isMuted").mockResolvedValue(true);

      const result = await controller.checkMute("user-2", mockUser);

      expect(blocksService.isMuted).toHaveBeenCalledWith("user-1", "user-2");
      expect(result).toEqual({ muted: true });
    });
  });
});
