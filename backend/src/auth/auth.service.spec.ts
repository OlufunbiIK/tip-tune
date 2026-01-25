import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { VerifySignatureDto } from "./dto/verify-signature.dto";

describe("AuthService", () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let usersService: UsersService;

  const mockUser: User = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    walletAddress: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    profileImage: null,
    bio: null,
    isArtist: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUsersService = {
    findByWalletAddress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "JWT_SECRET") return "test-secret";
              return null;
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateChallenge", () => {
    it("should generate a challenge for valid public key", async () => {
      const publicKey =
        "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      const result = await service.generateChallenge(publicKey);

      expect(result).toHaveProperty("challengeId");
      expect(result).toHaveProperty("challenge");
      expect(result).toHaveProperty("expiresAt");
      expect(result.challenge).toContain(publicKey);
    });

    it("should throw BadRequestException for invalid public key", async () => {
      const invalidPublicKey = "invalid-key";

      await expect(service.generateChallenge(invalidPublicKey)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("verifySignature", () => {
    it("should throw UnauthorizedException for non-existent challenge", async () => {
      const verifyDto: VerifySignatureDto = {
        challengeId: "non-existent",
        publicKey: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        signature: "signature",
      };

      await expect(service.verifySignature(verifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for expired challenge", async () => {
      const publicKey =
        "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      const challenge = await service.generateChallenge(publicKey);

      // Manually expire the challenge
      const challengeData = (service as any).challenges.get(
        challenge.challengeId,
      );
      challengeData.expiresAt = new Date(Date.now() - 1000);

      const verifyDto: VerifySignatureDto = {
        challengeId: challenge.challengeId,
        publicKey,
        signature: "signature",
      };

      await expect(service.verifySignature(verifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for mismatched public key", async () => {
      const publicKey =
        "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      const challenge = await service.generateChallenge(publicKey);

      const verifyDto: VerifySignatureDto = {
        challengeId: challenge.challengeId,
        publicKey: "GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
        signature: "signature",
      };

      await expect(service.verifySignature(verifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should throw UnauthorizedException for invalid token", async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshAccessToken("invalid-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for token without tokenId", async () => {
      mockJwtService.verify.mockReturnValue({ userId: "user-123" });

      await expect(service.refreshAccessToken("token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("getCurrentUser", () => {
    it("should return user for valid userId", async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser("user-123");

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });

    it("should throw UnauthorizedException for non-existent user", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getCurrentUser("non-existent")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
