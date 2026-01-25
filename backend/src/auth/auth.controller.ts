import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { VerifySignatureDto } from "./dto/verify-signature.dto";
import { ChallengeResponseDto } from "./dto/challenge.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RefreshTokenResponseDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("challenge")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get challenge message for wallet signing" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        publicKey: {
          type: "string",
          description: "Stellar public key (wallet address)",
          example: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        },
      },
      required: ["publicKey"],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Challenge generated successfully",
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid public key format",
  })
  async generateChallenge(
    @Body("publicKey") publicKey: string,
  ): Promise<ChallengeResponseDto> {
    return this.authService.generateChallenge(publicKey);
  }

  @Post("verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify signed challenge and get JWT tokens" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Authentication successful",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid signature or expired challenge",
  })
  async verifySignature(
    @Body() verifyDto: VerifySignatureDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const authResult = await this.authService.verifySignature(verifyDto);

    // Set httpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 15 * 60 * 1000, // 15 minutes for access token
    };

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    };

    response.cookie("access_token", authResult.accessToken, cookieOptions);
    response.cookie(
      "refresh_token",
      authResult.refreshToken,
      refreshCookieOptions,
    );

    return authResult;
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Token refreshed successfully",
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or expired refresh token",
  })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshTokenResponseDto> {
    const refreshToken =
      request.cookies?.["refresh_token"] ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not provided");
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    // Update access token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 15 * 60 * 1000, // 15 minutes
    };

    response.cookie("access_token", result.accessToken, cookieOptions);

    return result;
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Logout and invalidate refresh token" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Logout successful",
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken =
      request.cookies?.["refresh_token"] ||
      request.headers.authorization?.replace("Bearer ", "");

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear cookies
    response.clearCookie("access_token");
    response.clearCookie("refresh_token");

    return { message: "Logout successful" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current user information",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Not authenticated",
  })
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    return this.authService.getCurrentUser(user.userId);
  }
}
