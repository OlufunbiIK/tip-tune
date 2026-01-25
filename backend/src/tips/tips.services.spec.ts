import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TipsService } from "./tips.service";
import { Tip, TipStatus } from "./tips.entity";
import { CreateTipDto } from "./create-tips.dto";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { StellarService } from "../stellar/stellar.service";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("TipsService", () => {
  let service: TipsService;
  let repository: Repository<Tip>;
  let stellarService: StellarService;
  let usersService: UsersService;
  let notificationsService: NotificationsService;

  const mockTipRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockStellarService = {
    getTransactionDetails: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockNotificationsService = {
    notifyArtistOfTip: jest.fn(),
  };

  const mockTip: Tip = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    fromUserId: "550e8400-e29b-41d4-a716-446655440001",
    toArtistId: "550e8400-e29b-41d4-a716-446655440002",
    trackId: "550e8400-e29b-41d4-a716-446655440003",
    amount: 10.5,
    usdValue: 5.25,
    stellarTxHash: "abc123def456",
    status: TipStatus.COMPLETED,
    message: "Great music!",
    createdAt: new Date(),
    fromUser: null,
    toArtist: null,
    track: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipsService,
        {
          provide: getRepositoryToken(Tip),
          useValue: mockTipRepository,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<TipsService>(TipsService);
    repository = module.get<Repository<Tip>>(getRepositoryToken(Tip));
    stellarService = module.get<StellarService>(StellarService);
    usersService = module.get<UsersService>(UsersService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createTipDto: CreateTipDto = {
      artistId: "550e8400-e29b-41d4-a716-446655440002",
      trackId: "550e8400-e29b-41d4-a716-446655440003",
      stellarTxHash: "abc123def456",
      message: "Great music!",
    };
    const userId = "550e8400-e29b-41d4-a716-446655440001";

    it("should create a tip successfully", async () => {
      mockTipRepository.findOne.mockResolvedValue(null);
      mockUsersService.findOne.mockResolvedValue({
        id: createTipDto.artistId,
        isArtist: true,
      });
      mockStellarService.getTransactionDetails.mockResolvedValue({
        successful: true,
        operations: [
          { type: "payment", to: "artist_wallet_addr", amount: "10.5" },
        ],
      });
      mockTipRepository.create.mockReturnValue(mockTip);
      mockTipRepository.save.mockResolvedValue(mockTip);

      const result = await service.create(userId, createTipDto);

      expect(result).toEqual(mockTip);
      expect(mockTipRepository.findOne).toHaveBeenCalledWith({
        where: { stellarTxHash: createTipDto.stellarTxHash },
      });
      expect(mockNotificationsService.notifyArtistOfTip).toHaveBeenCalledWith(
        createTipDto.artistId,
        mockTip,
      );
    });

    it("should throw ConflictException if stellar transaction hash already exists", async () => {
      mockTipRepository.findOne.mockResolvedValue(mockTip);

      await expect(service.create(userId, createTipDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTipRepository.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if user tries to tip themselves", async () => {
      const selfTipDto = {
        ...createTipDto,
        artistId: userId,
      };

      mockTipRepository.findOne.mockResolvedValue(null);

      await expect(service.create(userId, selfTipDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTipRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a tip by id", async () => {
      mockTipRepository.findOne.mockResolvedValue(mockTip);

      const result = await service.findOne(mockTip.id);

      expect(result).toEqual(mockTip);
      expect(mockTipRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTip.id },
        relations: ["fromUser", "toArtist", "track"],
      });
    });

    it("should throw NotFoundException if tip not found", async () => {
      mockTipRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
