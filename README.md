# TipTune

**Real-time music tips powered by Stellar**

TipTune is a revolutionary platform that connects music lovers directly with artists through instant, frictionless micro-tipping. Stream your favorite tracks and show appreciation with lightning-fast Stellar payments.

## Color Palette

- **Navy (Background)**: `#0B1C2D`
- **Blue (Primary)**: `#4DA3FF`
- **Ice Blue (Secondary)**: `#6EDCFF`
- **Mint (Highlight)**: `#9BF0E1`
- **Gold (Tip Accent)**: `#FFD166`

[![Stellar](https://img.shields.io/badge/Built%20on-Stellar-black?style=flat&logo=stellar)](https://stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Features

- **Stream Music** - Listen to tracks from independent artists
- **Instant Tips** - Send XLM or USDC tips with one tap
- **Live Notifications** - Artists see tips in real-time during performances
- **Micro-transactions** - Tips as low as $0.10 thanks to Stellar's low fees
- **Global Reach** - Borderless payments to artists anywhere
- **Artist Dashboard** - Track earnings, top supporters, and engagement
- **Artist Profiles** - Showcase music, bio, and tip history
- **Secure Wallet Integration** - Connect with Freighter, Albedo, or other Stellar wallets

---

## Why TipTune?

Traditional music streaming pays artists fractions of a cent per stream. TipTune flips the model:

- **Direct support**: 100% of tips go directly to artists (minus minimal network fees)
- **Instant settlement**: Artists receive funds in seconds, not months
- **Fan connection**: Build stronger relationships through direct appreciation
- **Transparent**: All transactions visible on the Stellar blockchain

---

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Blockchain**: Stellar Network
- **Smart Contracts**: Soroban (Stellar's smart contract platform)
- **Wallet Integration**: Freighter, Albedo, xBull
- **Backend**: Node.js, NestJS
- **Database**: PostgreSQL (with `pg_trgm` full-text + fuzzy search)
- **Audio Streaming**: Web Audio API / HowlerJS
- **Real-time**: WebSockets for live notifications

---

## 🔍 Search Ranking Algorithm

TipTune's autocomplete rankings are driven by a **composite mathematical scoring function** — not alphabetical order or raw counts. The algorithm is inspired by industry-proven ranking systems:

```
Score(item) = PrefixBoost
            + log(1 + plays)  × 1.0   ← log-normalized, zero-safe
            + log(1 + tips)   × 3.0   ← tips weighted 3× (financial intent)
            + e^(-0.02 × days) × 2.0  ← exponential recency decay (t½ ≈ 34.6 days)
```

| Signal | Technique | Industry Reference |
| :----- | :-------- | :----------------- |
| Engagement | `Math.log1p(n)` — log normalization | Reddit "Hot" algorithm |
| Recency | `e^(-λt)`, λ=0.02, t½≈34.6 days | Hacker News gravity model |
| Prefix match | +100 flat boost (categorical gate) | Standard autocomplete UX research |
| Tie-breaking | `localeCompare` — stable, locale-aware | Linux kernel style: pick a rule, enforce it |

**Full documentation:** [`docs/search-ranking-algorithm.md`](docs/search-ranking-algorithm.md)
**Unit tests (15/15 passing):** [`frontend/src/utils/searchRanking.test.ts`](frontend/src/utils/searchRanking.test.ts)

---

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Stellar wallet (Freighter recommended for development)

### Setup

```bash
# Clone the repository
git clone https://github.com/OlufunbiIK/tip-tune/
cd tiptune

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file with:
# - Stellar network settings (testnet/mainnet)
# - Database credentials
# - API keys

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see TipTune in action!

---

## Quick Start

### For Listeners

1. **Connect Wallet** - Click "Connect Wallet" and approve connection
2. **Browse Artists** - Explore the artist directory
3. **Listen & Tip** - Play a track and tap the tip button
4. **Select Amount** - Choose or enter custom tip amount
5. **Send** - Confirm transaction in your wallet

### For Artists

1. **Sign Up** - Create artist profile with Stellar wallet
2. **Upload Music** - Add tracks with metadata and artwork
3. **Share Profile** - Share your TipTune link with fans
4. **Receive Tips** - Get notified instantly when fans tip
5. **Track Analytics** - View earnings and engagement stats

---

## Project Structure

```
# TipTune Project Structure

tiptune/
├── frontend/                           # React + TypeScript + Vite
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── assets/
│   ├── src/
│   │   ├── components/                 # Reusable React components
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── LoadingSkeleton.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── player/
│   │   │   │   ├── MusicPlayer.tsx
│   │   │   │   ├── PlayButton.tsx
│   │   │   │   ├── VolumeControl.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   └── TrackInfo.tsx
│   │   │   ├── artist/
│   │   │   │   ├── ArtistCard.tsx
│   │   │   │   ├── ArtistProfile.tsx
│   │   │   │   ├── ArtistHeader.tsx
│   │   │   │   └── ArtistSearch.tsx
│   │   │   ├── tip/
│   │   │   │   ├── TipButton.tsx
│   │   │   │   ├── TipModal.tsx
│   │   │   │   ├── TipHistory.tsx
│   │   │   │   └── TipPresets.tsx
│   │   │   ├── wallet/
│   │   │   │   ├── WalletConnect.tsx
│   │   │   │   ├── WalletInfo.tsx
│   │   │   │   └── WalletBalance.tsx
│   │   │   └── notifications/
│   │   │       ├── NotificationCenter.tsx
│   │   │       ├── NotificationItem.tsx
│   │   │       └── NotificationBell.tsx
│   │   ├── pages/                      # Page components (routes)
│   │   │   ├── HomePage.tsx
│   │   │   ├── ArtistPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TipHistoryPage.tsx
│   │   │   ├── ExplorePage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useWallet.ts
│   │   │   ├── useAudio.ts
│   │   │   ├── useTip.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useApi.ts
│   │   ├── contexts/                   # React Context providers
│   │   │   ├── WalletContext.tsx
│   │   │   ├── PlayerContext.tsx
│   │   │   ├── AuthContext.tsx
│   │   │   └── NotificationContext.tsx
│   │   ├── services/                   # API service layer
│   │   │   ├── api.ts
│   │   │   ├── artistService.ts
│   │   │   ├── trackService.ts
│   │   │   ├── tipService.ts
│   │   │   └── userService.ts
│   │   ├── utils/                      # Utility functions
│   │   │   ├── stellar/
│   │   │   │   ├── wallet.ts
│   │   │   │   ├── payments.ts
│   │   │   │   ├── transactions.ts
│   │   │   │   └── addresses.ts
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── types/                      # TypeScript type definitions
│   │   │   ├── artist.types.ts
│   │   │   ├── track.types.ts
│   │   │   ├── tip.types.ts
│   │   │   ├── user.types.ts
│   │   │   ├── wallet.types.ts
│   │   │   └── api.types.ts
│   │   ├── styles/                     # Global styles
│   │   │   └── global.css
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                            # NestJS + TypeORM + PostgreSQL
│   ├── src/
│   │   ├── main.ts                     # Application entry point
│   │   ├── app.module.ts               # Root module
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   │
│   │   ├── config/                     # Configuration
│   │   │   ├── database.config.ts
│   │   │   ├── stellar.config.ts
│   │   │   └── app.config.ts
│   │   │
│   │   ├── common/                     # Shared resources
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── public.decorator.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── transform.interceptor.ts
│   │   │   │   └── logging.interceptor.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   └── interfaces/
│   │   │       └── response.interface.ts
│   │   │
│   │   ├── database/                   # Database module
│   │   │   ├── database.module.ts
│   │   │   └── migrations/
│   │   │       ├── 1234567890-CreateUsers.ts
│   │   │       ├── 1234567891-CreateArtists.ts
│   │   │       ├── 1234567892-CreateTracks.ts
│   │   │       └── 1234567893-CreateTips.ts
│   │   │
│   │   ├── auth/                       # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── wallet.strategy.ts
│   │   │   └── dto/
│   │   │       ├── challenge.dto.ts
│   │   │       ├── verify-signature.dto.ts
│   │   │       └── login.dto.ts
│   │   │
│   │   ├── users/                      # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── artists/                    # Artists module
│   │   │   ├── artists.module.ts
│   │   │   ├── artists.controller.ts
│   │   │   ├── artists.service.ts
│   │   │   ├── entities/
│   │   │   │   └── artist.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-artist.dto.ts
│   │   │       └── update-artist.dto.ts
│   │   │
│   │   ├── tracks/                     # Tracks module
│   │   │   ├── tracks.module.ts
│   │   │   ├── tracks.controller.ts
│   │   │   ├── tracks.service.ts
│   │   │   ├── entities/
│   │   │   │   └── track.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-track.dto.ts
│   │   │       └── update-track.dto.ts
│   │   │
│   │   ├── tips/                       # Tips module
│   │   │   ├── tips.module.ts
│   │   │   ├── tips.controller.ts
│   │   │   ├── tips.service.ts
│   │   │   ├── entities/
│   │   │   │   └── tip.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-tip.dto.ts
│   │   │       └── query-tips.dto.ts
│   │   │
│   │   ├── stellar/                    # Stellar blockchain module
│   │   │   ├── stellar.module.ts
│   │   │   ├── stellar.service.ts
│   │   │   ├── transaction-verifier.service.ts
│   │   │   └── types/
│   │   │       └── stellar.types.ts
│   │   │
│   │   ├── storage/                    # File storage module
│   │   │   ├── storage.module.ts
│   │   │   ├── storage.service.ts
│   │   │   └── types/
│   │   │       └── storage.types.ts
│   │   │
│   │   ├── notifications/              # Notifications module (WebSocket)
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.gateway.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── dto/
│   │   │       └── notification.dto.ts
│   │   │
│   │   └── email/                      # Email module
│   │       ├── email.module.ts
│   │       ├── email.service.ts
│   │       └── templates/
│   │           └── tip-notification.html
│   │
│   ├── test/                           # E2E tests
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── ormconfig.ts                    # TypeORM configuration
│
├── contracts/                          # Soroban smart contracts (optional)
│   ├── tip-escrow/
│   │   ├── src/
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   └── README.md
│
├── docs/                               # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── STELLAR_INTEGRATION.md
│   └── DATABASE_SCHEMA.md
│
├── .github/                            # GitHub configuration
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── drips_wave_issue.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .gitignore
├── .env.example
├── package.json                        # Root package.json (monorepo scripts)
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── docker-compose.yml                  # Docker setup for PostgreSQL
```

## Key Features of This Structure

### Backend (NestJS + TypeORM + PostgreSQL)

✅ **Module-based architecture** - Each feature is a separate module
✅ **Entities folder** - TypeORM entities for database models
✅ **DTOs folder** - Data Transfer Objects for validation
✅ **Services** - Business logic separated from controllers
✅ **Guards & Interceptors** - Authentication and request processing
✅ **Migrations** - Database version control with TypeORM

### Frontend (React + TypeScript + Vite)

✅ **Component-based** - Organized by feature
✅ **Contexts** - Global state management
✅ **Services** - API calls separated from components
✅ **Hooks** - Reusable logic
✅ **Types** - TypeScript definitions

---

## Contributing

We welcome contributions! TipTune is participating in the **Stellar Drips Wave Program** - check out our open issues to earn rewards while building something awesome.

### Getting Started

1. Check out our [CONTRIBUTING.md](CONTRIBUTING.md) guide
2. Browse [open issues](https://github.com/OlufunbiIK/tiptune/issues) tagged with `good-first-issue`
3. Read the [Code of Conduct](CODE_OF_CONDUCT.md)
4. Join our [Discord community] <https://discord.gg/tkbwMmJE>

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with clear commit messages
4. Write/update tests
5. Push to your fork
6. Open a Pull Request

---

## 🎵 Roadmap

### Phase 1: MVP (Current)

- [x] Basic music player
- [x] Wallet connection
- [x] Simple tipping functionality
- [x] Artist profiles
- [ ] Real-time notifications

### Phase 2: Enhanced Features

- [ ] Playlist creation
- [ ] Social features (comments, likes)
- [ ] Artist analytics dashboard
- [ ] Multiple currency support (USDC, custom tokens)
- [ ] Mobile app (React Native)

### Phase 3: Advanced

- [ ] NFT integration (collectible releases)
- [ ] Live streaming with tips
- [ ] Subscription tiers
- [ ] Artist collaboration tools
- [ ] Governance token for platform decisions

---

## Use Cases

- **Independent Artists**: Earn directly from superfans
- **Podcasters**: Monetize episodes with listener tips
- **Live Performers**: Receive virtual tips during streams
- **Music Educators**: Get paid for lessons and tutorials
- **Remix Artists**: Share work and receive appreciation

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built on [Stellar](https://stellar.org) blockchain
- Supported by [Stellar Development Foundation](https://stellar.org/foundation)
- Part of the [Drips Wave Program](https://www.drips.network/wave)
- Icons by [Lucide](https://lucide.dev)

---

## Contact & Community

- **Discord**: [[Join our community] https://discord.gg/tkbwMmJE
- **Email**: <hello@tiptune.io>

---

## 💡 Support the Project.

If you find TipTune valuable, consider:

- Starring this repository
- Reporting bugs and suggesting features
- Contributing code or documentation
- Using TipTune to support your favorite artists

**Built with ❤️ by the TipTune community**
