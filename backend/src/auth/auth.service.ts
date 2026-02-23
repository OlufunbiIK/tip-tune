import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as StellarSdk from '@stellar/stellar-sdk';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { VerifySignatureDto } from './dto/verify-signature.dto';
import { ChallengeResponseDto } from './dto/challenge.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

interface Challenge {
  challengeId: string;
  challenge: string;
  publicKey: string;
  expiresAt: Date;
}

interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly challenges: Map<string, Challenge> = new Map();
  private readonly refreshTokens: Map<string, RefreshTokenPayload> = new Map();
  private readonly challengeExpirationMinutes = 5;
  private readonly accessTokenExpiration = '15m';
  private readonly refreshTokenExpiration = '7d';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Clean up expired challenges every 10 minutes
    setInterval(() => this.cleanupExpiredChallenges(), 10 * 60 * 1000);
  }

  /**
   * Generate a challenge message for wallet signing
   */
  async generateChallenge(publicKey: string): Promise<ChallengeResponseDto> {
    // Validate Stellar public key format
    if (!this.isValidStellarPublicKey(publicKey)) {
      throw new BadRequestException('Invalid Stellar public key format');
    }

    const challengeId = uuidv4();
    const timestamp = Date.now();
    const challenge = `Sign this message to authenticate with TipTune:\n\nChallenge ID: ${challengeId}\nTimestamp: ${timestamp}\nPublic Key: ${publicKey}`;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.challengeExpirationMinutes);

    const challengeData: Challenge = {
      challengeId,
      challenge,
      publicKey,
      expiresAt,
    };

    this.challenges.set(challengeId, challengeData);

    this.logger.debug(`Generated challenge for public key: ${publicKey.substring(0, 8)}...`);

    return {
      challengeId,
      challenge,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Verify signed challenge and issue JWT tokens
   */
  async verifySignature(
    verifyDto: VerifySignatureDto,
  ): Promise<AuthResponseDto> {
    const { challengeId, publicKey, signature } = verifyDto;

    // Retrieve challenge
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      throw new UnauthorizedException('Challenge has expired');
    }

    // Verify public key matches challenge
    if (challenge.publicKey !== publicKey) {
      throw new UnauthorizedException('Public key does not match challenge');
    }

    // Verify signature using Stellar SDK
    const isValid = await this.verifyStellarSignature(
      challenge.challenge,
      publicKey,
      signature,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Remove used challenge
    this.challenges.delete(challengeId);

    // Get or create user
    let user = await this.userRepository.findOne({
      where: { walletAddress: publicKey },
    });

    if (!user) {
      // Create new user with wallet address
      user = this.userRepository.create({
        walletAddress: publicKey,
        username: `user_${publicKey.substring(0, 8)}`,
        email: `${publicKey.substring(0, 8)}@wallet.local`,
        isArtist: false,
      });
      user = await this.userRepository.save(user);
      this.logger.log(`Created new user: ${user.id}`);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User authenticated: ${user.id} (${publicKey.substring(0, 8)}...)`);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Verify Stellar signature
   * Note: This verifies Ed25519 signatures. Wallet signatures from Freighter
   * may need additional processing depending on the signature format returned.
   */
  private async verifyStellarSignature(
    message: string,
    publicKey: string,
    signature: string,
  ): Promise<boolean> {
    try {
      // Decode base64 signature
      let signatureBuffer: Buffer;
      try {
        signatureBuffer = Buffer.from(signature, 'base64');
      } catch {
        // If base64 decode fails, try hex
        signatureBuffer = Buffer.from(signature, 'hex');
      }

      // Verify signature using Stellar SDK
      const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
      const messageBuffer = Buffer.from(message, 'utf8');

      // Stellar uses Ed25519 signatures
      // The verify method checks if the signature is valid for the message
      return keypair.verify(messageBuffer, signatureBuffer);
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      isArtist: user.isArtist,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiration,
    });

    const refreshTokenId = uuidv4();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenId: refreshTokenId },
      {
        expiresIn: this.refreshTokenExpiration,
      },
    );

    // Store refresh token
    this.refreshTokens.set(refreshTokenId, {
      userId: user.id,
      tokenId: refreshTokenId,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
      
      if (!payload.tokenId || !payload.userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify token exists in our store
      const storedToken = this.refreshTokens.get(payload.tokenId);
      if (!storedToken || storedToken.userId !== payload.userId) {
        throw new UnauthorizedException('Refresh token not found or invalid');
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new access token
      const accessTokenPayload = {
        sub: user.id,
        walletAddress: user.walletAddress,
        isArtist: user.isArtist,
      };

      const accessToken = this.jwtService.sign(accessTokenPayload, {
        expiresIn: this.accessTokenExpiration,
      });

      this.logger.debug(`Refreshed access token for user: ${user.id}`);

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Verify access token for WebSocket connections
   */
  async verifyAccessToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      return this.getCurrentUser(payload.sub);
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
      if (payload.tokenId) {
        this.refreshTokens.delete(payload.tokenId);
        this.logger.debug(`Invalidated refresh token: ${payload.tokenId}`);
      }
    } catch (error) {
      // Token might already be invalid, ignore
      this.logger.debug(`Logout: token already invalid or expired`);
    }
  }

  /**
   * Get current user from JWT payload
   */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Validate Stellar public key format
   */
  private isValidStellarPublicKey(publicKey: string): boolean {
    try {
      StellarSdk.Keypair.fromPublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired challenges
   */
  private cleanupExpiredChallenges(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [challengeId, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(challengeId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired challenges`);
    }
  }
}
