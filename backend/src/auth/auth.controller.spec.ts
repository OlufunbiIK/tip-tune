import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ChallengeResponseDto } from "./dto/challenge.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { User } from "../users/entities/user.entity";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

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

  const mockAuthService = {
    generateChallenge: jest.fn(),
    verifySignature: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateChallenge", () => {
    it("should generate challenge", async () => {
      const publicKey =
        "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      const challengeResponse: ChallengeResponseDto = {
        challengeId: "challenge-123",
        challenge: "Sign this message...",
        expiresAt: new Date().toISOString(),
      };

      mockAuthService.generateChallenge.mockResolvedValue(challengeResponse);

      const result = await controller.generateChallenge(publicKey);

      expect(result).toEqual(challengeResponse);
      expect(authService.generateChallenge).toHaveBeenCalledWith(publicKey);
    });
  });

  describe("verifySignature", () => {
    it("should verify signature and return tokens", async () => {
      const verifyDto = {
        challengeId: "challenge-123",
        publicKey: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        signature: "signature",
      };

      const authResponse: AuthResponseDto = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: mockUser,
      };

      mockAuthService.verifySignature.mockResolvedValue(authResponse);

      const mockResponse = {
        cookie: jest.fn(),
      } as any;

      const result = await controller.verifySignature(verifyDto, mockResponse);

      expect(result).toEqual(authResponse);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(authService.verifySignature).toHaveBeenCalledWith(verifyDto);
    });
  });

  describe("refreshToken", () => {
    it("should refresh access token", async () => {
      const mockRequest = {
        cookies: { refresh_token: "refresh-token" },
        headers: {},
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
      } as any;

      mockAuthService.refreshAccessToken.mockResolvedValue({
        accessToken: "new-access-token",
      });

      const result = await controller.refreshToken(mockRequest, mockResponse);

      expect(result).toEqual({ accessToken: "new-access-token" });
      expect(mockResponse.cookie).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when no refresh token", async () => {
      const mockRequest = {
        cookies: {},
        headers: {},
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
      } as any;

      await expect(
        controller.refreshToken(mockRequest, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("should logout and clear cookies", async () => {
      const mockRequest = {
        cookies: { refresh_token: "refresh-token" },
        headers: {},
      } as any;

      const mockResponse = {
        clearCookie: jest.fn(),
      } as any;

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest, mockResponse);

      expect(result).toEqual({ message: "Logout successful" });
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(authService.logout).toHaveBeenCalledWith("refresh-token");
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user", async () => {
      const mockUserData = {
        userId: "user-123",
        walletAddress:
          "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        isArtist: false,
      };

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockUserData);

      expect(result).toEqual(mockUser);
      expect(authService.getCurrentUser).toHaveBeenCalledWith("user-123");
    });
  });
});
