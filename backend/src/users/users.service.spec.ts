import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

describe("UsersService", () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser: User = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    username: "testuser",
    email: "test@example.com",
    walletAddress:
      "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
    profileImage: null,
    bio: null,
    isArtist: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const createUserDto: CreateUserDto = {
      username: "testuser",
      email: "test@example.com",
      walletAddress:
        "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
      isArtist: false,
    };

    it("should create a new user successfully", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(3); // Check username, email, wallet
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        isArtist: false,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it("should throw ConflictException if username already exists", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { username: createUserDto.username },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictException if email already exists", async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(mockUser); // email check

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it("should throw ConflictException if wallet address already exists", async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockUser); // wallet check

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { walletAddress: createUserDto.walletAddress },
      });
    });

    it("should default isArtist to false if not provided", async () => {
      const dtoWithoutArtist = { ...createUserDto };
      delete dtoWithoutArtist.isArtist;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.create(dtoWithoutArtist);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutArtist,
        isArtist: false,
      });
    });
  });

  describe("findAll", () => {
    it("should return an array of users", async () => {
      const users = [mockUser];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("findOne", () => {
    it("should return a user by id", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException for invalid UUID format", async () => {
      await expect(service.findOne("invalid-uuid")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe("findByUsername", () => {
    it("should return a user by username", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername(mockUser.username);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { username: mockUser.username },
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByUsername("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEmail", () => {
    it("should return a user by email", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByEmail("nonexistent@example.com"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByWalletAddress", () => {
    it("should return a user by wallet address", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByWalletAddress(mockUser.walletAddress);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { walletAddress: mockUser.walletAddress },
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByWalletAddress("GINVALID")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findArtists", () => {
    it("should return an array of artists", async () => {
      const artists = [{ ...mockUser, isArtist: true }];
      mockRepository.find.mockResolvedValue(artists);

      const result = await service.findArtists();

      expect(result).toEqual(artists);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isArtist: true },
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("update", () => {
    const updateUserDto: UpdateUserDto = {
      username: "updateduser",
      bio: "Updated bio",
    };

    it("should update a user successfully", async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockRepository.findOne
        .mockResolvedValueOnce(mockUser) // findOne for existing user
        .mockResolvedValueOnce(null); // check username uniqueness
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockUser.id, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException if new username already exists", async () => {
      const existingUser = { ...mockUser, username: "updateduser" };
      mockRepository.findOne
        .mockResolvedValueOnce(mockUser) // findOne for existing user
        .mockResolvedValueOnce(existingUser); // check username uniqueness

      await expect(service.update(mockUser.id, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should not check uniqueness if username is unchanged", async () => {
      const updateDto = { ...updateUserDto, username: mockUser.username };
      const updatedUser = { ...mockUser, ...updateDto };
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateDto);

      expect(result).toEqual(updatedUser);
      // Should not check username uniqueness since it's unchanged
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("remove", () => {
    it("should delete a user successfully", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      await service.remove(mockUser.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it("should throw NotFoundException if user not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });
});
