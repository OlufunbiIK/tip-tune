# TipTune API Documentation

Version: 1.0  
Base URL: https://api.tiptune.app  
Authentication: JWT Bearer Token  
Blockchain: Stellar (XLM + USDC)  

TipTune enables:
- Artist onboarding
- Music streaming metadata
- Real-time tipping
- Fan profiles
- Wallet integration
- Transaction tracking

---

# Authentication

## POST /auth/register

Register new user (fan or artist).

Request:
{
  "email": "user@email.com",
  "password": "password123",
  "role": "fan" // or "artist"
}

Response:
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "role": "fan",
    "email": "user@email.com"
  }
}

---

## POST /auth/login

Request:
{
  "email": "user@email.com",
  "password": "password123"
}

Response:
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}

---

## POST /auth/refresh

Request:
{
  "refreshToken": "refresh_token"
}

Response:
{
  "accessToken": "new_access_token"
}

---

# Users

## GET /users/me

Headers:
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "email": "user@email.com",
  "role": "artist",
  "stellarPublicKey": "G..."
}

---

## PATCH /users/me/wallet

Attach Stellar wallet.

Request:
{
  "stellarPublicKey": "G..."
}

---

# Artists

## POST /artists/profile

Create or update artist profile.

Request:
{
  "stageName": "DJ Nova",
  "bio": "Afrobeats & Electronic fusion",
  "genre": "Afrobeats",
  "avatarUrl": "https://cdn.tiptune.app/avatar.jpg"
}

---

## GET /artists/:id

Response:
{
  "id": "uuid",
  "stageName": "DJ Nova",
  "totalTipsReceived": 1500,
  "followers": 200
}

---

# Tracks

## POST /tracks

Upload track metadata.

Request:
{
  "title": "Midnight Waves",
  "audioUrl": "https://cdn.tiptune.app/audio.mp3",
  "duration": 210
}

Response:
{
  "id": "uuid",
  "title": "Midnight Waves"
}

---

## GET /tracks/:id

Response:
{
  "id": "uuid",
  "title": "Midnight Waves",
  "artist": {
    "id": "uuid",
    "stageName": "DJ Nova"
  },
  "totalTips": 320
}

---

## GET /tracks/trending

Returns trending tracks by tip volume.

---

# Tipping

## POST /tips/send

Send tip to artist.

Request:
{
  "trackId": "uuid",
  "amount": 2.5,
  "asset": "XLM",
  "network": "testnet"
}

Response:
{
  "transactionHash": "stellar_tx_hash",
  "status": "pending"
}

---

## GET /tips/history

Returns tipping history.

Response:
[
  {
    "trackId": "uuid",
    "artistId": "uuid",
    "amount": 2.5,
    "asset": "XLM",
    "status": "completed",
    "transactionHash": "stellar_tx_hash"
  }
]

---

# Real-Time Streaming Events

WebSocket Endpoint:
wss://api.tiptune.app/ws

Events:
- tip.received
- track.played
- artist.followed

Example:
{
  "event": "tip.received",
  "data": {
    "artistId": "uuid",
    "amount": 5,
    "asset": "USDC"
  }
}

---

# Webhooks

## POST /webhooks/stellar

Used to confirm Stellar transactions.

---

# Error Format

{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "Bad Request"
}

---

# Rate Limits

- 100 requests/minute per user
- 20 tips/minute
- 5 track uploads/hour

---

# Supported Assets

- XLM (Native)
- USDC (Stellar Asset)

---

# Environments

Testnet:
https://api-testnet.tiptune.app

Mainnet:
https://api.tiptune.app

---

End of API Documentation