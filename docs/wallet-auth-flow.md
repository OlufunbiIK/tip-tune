# Wallet Auth Flow — Integration Guide

This guide is the single reference for implementing wallet-based authentication end-to-end. Read this before touching `auth.controller.ts` or `auth.service.ts`.

---

## Sequence Diagram

```
Frontend                          Backend                        Redis
   |                                 |                              |
   |-- POST /auth/challenge -------->|                              |
   |   { publicKey }                 |-- SETEX challenge:<id> ----->|
   |<-- { challengeId, challenge,    |   (TTL 300 s)                |
   |      expiresAt } --------------|                              |
   |                                 |                              |
   | [user signs challenge.text      |                              |
   |  with Stellar wallet]           |                              |
   |                                 |                              |
   |-- POST /auth/verify ----------->|                              |
   |   { challengeId,                |-- GET challenge:<id> ------->|
   |     publicKey, signature }      |<-- challengeData ------------|
   |                                 |-- DEL challenge:<id> ------->|
   |                                 | [verify Ed25519 sig]         |
   |                                 | [upsert user row]            |
   |                                 |-- SETEX refresh:<tokenId> -->|
   |<-- 200 { accessToken,           |   (TTL 604800 s)             |
   |          refreshToken, user }   |                              |
   |   Set-Cookie: access_token      |                              |
   |   Set-Cookie: refresh_token     |                              |
   |                                 |                              |
   | [access_token expires ~15 min]  |                              |
   |                                 |                              |
   |-- POST /auth/refresh ---------->|                              |
   |   Cookie: refresh_token         |-- GET refresh:<tokenId> ---->|
   |   (or Authorization: Bearer)    |<-- tokenData ---------------|
   |<-- 200 { accessToken } ---------|                              |
   |   Set-Cookie: access_token      |-- SETEX refresh:<tokenId> -->|
   |                                 |   (TTL unchanged)            |
   |                                 |                              |
   |-- POST /auth/logout ----------->|                              |
   |   Cookie: access_token (guard)  |-- DEL refresh:<tokenId> ---->|
   |<-- 200 { message } -------------|                              |
   |   Clear-Cookie: access_token    |                              |
   |   Clear-Cookie: refresh_token   |                              |
```

---

## Step 1 — Request a Challenge

**Rate limit:** 5 req/min per IP (`AUTH_CHALLENGE` throttle bucket).

```
POST /api/auth/challenge
Content-Type: application/json

{ "publicKey": "GABC...XYZ" }
```

Validation: `publicKey` must match `/^G[A-Z0-9]{55}$/`. Any other value returns `400`.

**Response `200`:**

```json
{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "challenge": "Sign this message to authenticate with TipTune:\n\nChallenge ID: 550e8400-e29b-41d4-a716-446655440000\nTimestamp: 1700000000000\nPublic Key: GABC...XYZ",
  "expiresAt": "2024-01-01T12:05:00.000Z"
}
```

Store `challengeId` and the full `challenge` string. The challenge is consumed on first use — requesting a second challenge for the same key before verifying the first is fine; both are stored independently in Redis.

---

## Step 2 — Sign the Challenge

Sign the exact `challenge` string (UTF-8 bytes) with the user's Stellar keypair. The backend verifies using `Keypair.verify(messageBuffer, signatureBuffer)` from `@stellar/stellar-sdk`.

### Freighter

```ts
import { signMessage } from '@stellar/freighter-api';

const { signedMessage } = await signMessage(challenge, { networkPassphrase: Networks.PUBLIC });
// signedMessage is already base64
const signature = signedMessage;
```

### Albedo / xBull

Both return a raw `Uint8Array` or hex string. Convert to base64 before sending:

```ts
// Uint8Array → base64
const signature = btoa(String.fromCharCode(...new Uint8Array(rawSig)));

// hex → base64
const signature = btoa(hexStr.match(/.{2}/g)!.map(b => String.fromCharCode(parseInt(b, 16))).join(''));
```

> **Caveat:** The backend first tries `Buffer.from(signature, 'base64')`, then falls back to `Buffer.from(signature, 'hex')`. Always prefer base64. If verification returns `401 Invalid signature`, the most common cause is sending the raw bytes as a string instead of encoding them.

---

## Step 3 — Verify and Receive Tokens

**Rate limit:** 10 req/min per IP (`AUTH_VERIFY` throttle bucket).

```
POST /api/auth/verify
Content-Type: application/json

{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": "GABC...XYZ",
  "signature": "<base64-encoded-ed25519-signature>"
}
```

**Response `200`:**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "walletAddress": "GABC...XYZ",
    "username": "user_GABC...X",
    "isArtist": false
  }
}
```

**Cookies set automatically (no frontend action needed):**

| Cookie | `httpOnly` | `secure` | `sameSite` | `maxAge` |
|---|---|---|---|---|
| `access_token` | ✅ | prod only | `strict` | 15 min |
| `refresh_token` | ✅ | prod only | `strict` | 7 days |

The JSON body also contains both tokens. Use the body tokens only if you need them for non-browser clients (e.g., mobile, server-to-server). Browser clients should rely on cookies exclusively.

> **New user:** If no user row exists for `publicKey`, one is created automatically with `username = "user_<first8chars>"` and a placeholder email. No extra signup step is required.

---

## Step 4 — Calling Protected Endpoints

The JWT strategy checks cookies first, then the `Authorization` header:

```
# Cookie (browser — automatic)
GET /api/tips
Cookie: access_token=eyJ...

# Header (non-browser clients)
GET /api/tips
Authorization: Bearer eyJ...
```

JWT payload shape (available via `@CurrentUser()` in controllers):

```ts
{
  userId: string;       // payload.sub
  walletAddress: string;
  isArtist: boolean;
}
```

---

## Step 5 — Refresh the Access Token

Call this before the access token expires (15 min). The refresh token is valid for 7 days and is stored in Redis under `auth:refresh:<tokenId>`.

**Rate limit:** 20 req/min per IP (`AUTH_REFRESH` throttle bucket).

```
POST /api/auth/refresh
Cookie: refresh_token=eyJ...
# OR
Authorization: Bearer <refresh_token>
```

**Response `200`:**

```json
{ "accessToken": "eyJ..." }
```

A new `access_token` cookie is set. The refresh token itself is **not rotated** — the same `tokenId` remains valid until logout or 7-day expiry.

**Errors:**

| Status | Cause |
|---|---|
| `401 Refresh token not provided` | Neither cookie nor header present |
| `401 Refresh token not found or invalid` | Token deleted (logout) or Redis miss |
| `401 Invalid or expired refresh token` | JWT signature invalid or past `exp` |

---

## Step 6 — Logout

Requires a valid `access_token` (guard enforced).

```
POST /api/auth/logout
Cookie: access_token=eyJ...; refresh_token=eyJ...
```

**Response `200`:**

```json
{ "message": "Logout successful" }
```

Both cookies are cleared. The `refresh_token`'s Redis key (`auth:refresh:<tokenId>`) is deleted, invalidating any in-flight refresh attempts.

---

## Error Reference

| Endpoint | Status | Message | Fix |
|---|---|---|---|
| `/challenge` | `400` | `Invalid Stellar public key format` | Key must be 56 chars, start with `G` |
| `/verify` | `401` | `Invalid or expired challenge` | Challenge TTL elapsed or already used |
| `/verify` | `401` | `Challenge has expired` | >5 min since `/challenge` call |
| `/verify` | `401` | `Public key does not match challenge` | `publicKey` in body ≠ key used in `/challenge` |
| `/verify` | `401` | `Invalid signature` | Wrong encoding or signed wrong string |
| `/refresh` | `401` | `Refresh token not found or invalid` | Already logged out or Redis evicted key |

---

## Cookie Behavior Notes

- `sameSite: strict` means cookies are **not sent on cross-site navigations** (e.g., OAuth redirects from a third-party page). If your frontend is on a different origin than the API, switch to `sameSite: lax` or use the `Authorization` header instead.
- `secure` is only set when `NODE_ENV === 'production'`. In local development, cookies work over HTTP.
- The frontend never needs to read cookie values — they are `httpOnly`. Do not attempt `document.cookie` access.

---

## Environment Variables

```env
JWT_SECRET=<min-32-char-random-string>   # required
NODE_ENV=production                       # enables secure cookies + HTTPS
REDIS_HOST=localhost                      # default
REDIS_PORT=6379                           # default
REDIS_PASSWORD=                           # optional
REDIS_DB=0                                # default
```

---

## Related Files

| File | Purpose |
|---|---|
| `backend/src/auth/auth.service.ts` | Challenge generation, signature verification, token issuance |
| `backend/src/auth/auth.controller.ts` | HTTP layer, cookie setting |
| `backend/src/auth/services/auth-redis.service.ts` | Redis storage for challenges and refresh tokens |
| `backend/src/auth/strategies/wallet.strategy.ts` | JWT extraction order (cookie → header) |
| `backend/src/auth/guards/jwt-auth.guard.ts` | Route protection, `@Public()` bypass |
| `backend/src/auth/README.md` | Endpoint reference and backend usage examples |
