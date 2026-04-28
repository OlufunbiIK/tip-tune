# Authentication System

This module implements wallet-based authentication using Stellar blockchain signatures.

> **Frontend/backend integration guide** (sequence diagram, request/response shapes, cookie behaviour, signature-format caveats, error reference): [`docs/wallet-auth-flow.md`](../../../../docs/wallet-auth-flow.md)

## Overview

The authentication system uses a challenge-response mechanism where users sign a message with their Stellar wallet to prove ownership of their public key.

## Authentication Flow

1. **Get Challenge** (`POST /api/auth/challenge`)
   - Client sends their Stellar public key
   - Server generates a unique challenge message
   - Challenge expires after 5 minutes

2. **Verify Signature** (`POST /api/auth/verify`)
   - Client signs the challenge message with their wallet
   - Client sends the signed message back to server
   - Server verifies the signature using Stellar SDK
   - If valid, server issues JWT access and refresh tokens
   - Tokens are stored in httpOnly cookies

3. **Access Protected Routes**
   - Client includes access token in cookie or Authorization header
   - JWT guard validates the token
   - User information is available via `@CurrentUser()` decorator

4. **Refresh Token** (`POST /api/auth/refresh`)
   - Client sends refresh token
   - Server issues new access token
   - Refresh token remains valid for 7 days

5. **Logout** (`POST /api/auth/logout`)
   - Invalidates refresh token
   - Clears authentication cookies

## Endpoints

### POST /api/auth/challenge
Generate a challenge message for wallet signing.

**Request:**
```json
{
  "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**Response:**
```json
{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "challenge": "Sign this message to authenticate with TipTune:\n\nChallenge ID: ...",
  "expiresAt": "2024-01-01T12:05:00.000Z"
}
```

### POST /api/auth/verify
Verify signed challenge and get JWT tokens.

**Request:**
```json
{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "signature": "base64encodedsignature..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "username": "user_GXXXXXXX",
    "isArtist": false
  }
}
```

**Cookies Set:**
- `access_token` (httpOnly, 15 minutes)
- `refresh_token` (httpOnly, 7 days)

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request:**
- Cookie: `refresh_token` OR
- Header: `Authorization: Bearer <refresh_token>`

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/logout
Invalidate refresh token and clear cookies.

**Request:**
- Requires authentication (access token)

**Response:**
```json
{
  "message": "Logout successful"
}
```

### GET /api/auth/me
Get current authenticated user information.

**Request:**
- Requires authentication (access token in cookie or Authorization header)

**Response:**
```json
{
  "id": "user-123",
  "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "username": "user_GXXXXXXX",
  "email": "GXXXXXXX@wallet.local",
  "isArtist": false,
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

## Usage in Controllers

### Protect Routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get()
  getProtectedData(@CurrentUser() user: CurrentUserData) {
    return { message: `Hello ${user.walletAddress}` };
  }
}
```

### Public Routes

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Controller('public')
export class PublicController {
  @Get()
  @Public()
  getPublicData() {
    return { message: 'This is public' };
  }
}
```

## Security Features

1. **Challenge Expiration**: Challenges expire after 5 minutes
2. **One-time Use**: Each challenge can only be used once
3. **Signature Verification**: Uses Stellar SDK to verify Ed25519 signatures
4. **HttpOnly Cookies**: Tokens stored in httpOnly cookies to prevent XSS attacks
5. **Secure Cookies**: In production, cookies are marked as secure (HTTPS only)
6. **SameSite Protection**: Cookies use 'strict' sameSite policy
7. **Token Expiration**: Access tokens expire in 15 minutes, refresh tokens in 7 days
8. **Token Refresh**: Refresh tokens can be used to get new access tokens

## Environment Variables

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
NODE_ENV=production  # Set to production for secure cookies
```

## Testing

Run unit tests:
```bash
npm test auth.service.spec
npm test auth.controller.spec
```

Run e2e tests:
```bash
npm run test:e2e
```

## Notes

- **Signature format**: The backend expects a base64-encoded Ed25519 signature. Freighter's `signMessage` returns base64 directly. Albedo and xBull return raw bytes — encode to base64 before sending. The verifier also accepts hex as a fallback. See [`docs/wallet-auth-flow.md`](../../../../docs/wallet-auth-flow.md#step-2--sign-the-challenge) for per-wallet examples.
- **Cookie behaviour**: Cookies are `httpOnly`, `sameSite: strict`, and `secure` in production only. They are not readable by JavaScript. Cross-origin setups may require switching to `sameSite: lax` or using the `Authorization` header.
- **Refresh token storage**: Refresh tokens are stored in Redis (`auth:refresh:<tokenId>`, TTL 7 days). Challenges are stored under `auth:challenge:<id>` (TTL 5 min). Both are managed by `AuthRedisService`.
- User accounts are automatically created on first authentication if they don't exist.
- Username and email are auto-generated from the wallet address for new users.
