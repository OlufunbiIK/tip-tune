import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

export interface JwtPayload {
  sub: string;
  walletAddress: string;
  isArtist: boolean;
}

@Injectable()
export class WalletStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Try to extract from cookies first
        (request: Request) => {
          return request?.cookies?.["access_token"];
        },
        // Fallback to Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ||
        "your-secret-key-change-in-production",
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.walletAddress) {
      throw new UnauthorizedException("Invalid token payload");
    }

    return {
      userId: payload.sub,
      walletAddress: payload.walletAddress,
      isArtist: payload.isArtist || false,
    };
  }
}
