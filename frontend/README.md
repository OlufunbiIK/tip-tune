# TipTune Frontend

React frontend application for TipTune - Real-time music tips powered by Stellar.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **Stellar SDK** - Stellar blockchain integration
- **Lucide React** - Icon library

## Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running on `http://localhost:3001`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components
│   │   └── common/      # Common UI components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── stellar/         # Stellar integration utilities
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Root component
│   └── main.tsx         # Application entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # TailwindCSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Features

- ✅ React with TypeScript
- ✅ Vite for fast development
- ✅ TailwindCSS configured with TipTune color palette
- ✅ React Router for navigation
- ✅ Axios API client with interceptors
- ✅ Stellar SDK integration utilities
- ✅ Type definitions for all entities
- ✅ Environment variable configuration

## Color Palette

- **Navy (Background)**: `#0B1C2D`
- **Blue (Primary)**: `#4DA3FF`
- **Ice Blue (Secondary)**: `#6EDCFF`
- **Mint (Highlight)**: `#9BF0E1`
- **Gold (Tip Accent)**: `#FFD166`

## API Integration

The frontend is configured to proxy API requests to the backend:
- API base URL: `http://localhost:3001/api`
- All `/api/*` requests are proxied to the backend

## Stellar Integration

Stellar utilities are available in `src/utils/stellar.ts`:
- Server configuration (testnet/mainnet)
- Address validation
- Amount formatting
- Network passphrase helpers

## Development Guidelines

- Use TypeScript for all new files
- Follow the existing folder structure
- Use TailwindCSS utility classes for styling
- Create reusable components in `components/`
- Use the API client from `utils/api.ts` for all HTTP requests
- Add type definitions in `types/` directory

## License

MIT
