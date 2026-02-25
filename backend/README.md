# TipTune Backend

A professional NestJS backend service for audio file upload, storage, and streaming.

## Features

- **Audio File Upload**: Support for MP3, WAV, FLAC formats
- **File Validation**: Type and size validation (max 50MB)
- **Secure Storage**: Local storage with unique filename generation
- **Audio Streaming**: Range request support for audio seeking
- **Track Management**: CRUD operations for track metadata
- **Search & Filter**: Search by title, artist, album; filter by genre
- **API Documentation**: Auto-generated Swagger documentation
- **Database Integration**: PostgreSQL with TypeORM
- **Comprehensive Testing**: Integration tests for all endpoints

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **File Upload**: Multer
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with Supertest

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and storage configuration
```

3. Set up the database:
```bash
# Create database
createdb tiptune

# The application will auto-create tables on first run (in development)

# Run search migration (full-text + fuzzy search)
npm run migration:run
```

4. Run the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### API Documentation

Once running, visit `http://localhost:3001/api/docs` for interactive API documentation.
API routes are versioned under `/api/v1/*` (except health probes and `/api/version`).

## API Endpoints

### File Storage

- `POST /api/v1/files/upload` - Upload audio file
- `GET /api/v1/files/:filename` - Download file
- `GET /api/v1/files/:filename/stream` - Stream audio file
- `GET /api/v1/files/:filename/info` - Get file information
- `DELETE /api/v1/files/:filename` - Delete file

### Search

- `GET /api/v1/search?q=...&type=artist|track&genre=...&sort=...&page=...&limit=...` - Full-text search (artists/tracks, filters, sort, pagination)
- `GET /api/v1/search/suggestions?q=partial` - Autocomplete suggestions

See `src/search/README.md` for details.

### Tracks

- `POST /api/v1/tracks` - Create track with file upload
- `GET /api/v1/tracks` - Get all tracks
- `GET /api/v1/tracks/public` - Get public tracks only
- `GET /api/v1/tracks/search?q=query` - Search tracks
- `GET /api/v1/tracks/artist/:artist` - Get tracks by artist
- `GET /api/v1/tracks/genre/:genre` - Get tracks by genre
- `GET /api/v1/tracks/:id` - Get track by ID
- `PATCH /api/v1/tracks/:id` - Update track
- `PATCH /api/v1/tracks/:id/play` - Increment play count
- `DELETE /api/v1/tracks/:id` - Delete track

## File Upload

### Supported Formats
- MP3 (audio/mpeg)
- WAV (audio/wav)
- FLAC (audio/flac, audio/x-flac)

### Maximum File Size
- 50MB (configurable via MAX_FILE_SIZE env var)

### Upload Example

```bash
curl -X POST http://localhost:3001/api/tracks \
  -F "file=@track.mp3" \
  -F "title=My Track" \
  -F "artist=John Doe" \
  -F "genre=rock" \
  -F "isPublic=true"
```

## Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## Environment Variables

```env
# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=tiptune

# Storage
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

# AWS S3 (optional, for cloud storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
```

## Project Structure

```
src/
├── app.module.ts          # Root module
├── main.ts                # Application entry point
├── storage/               # File storage module
│   ├── storage.controller.ts
│   ├── storage.service.ts
│   ├── storage.module.ts
│   └── dto/
│       └── upload-file.dto.ts
├── tracks/                # Track management module
│   ├── tracks.controller.ts
│   ├── tracks.service.ts
│   ├── tracks.module.ts
│   ├── entities/
│   │   └── track.entity.ts
│   └── dto/
│       └── create-track.dto.ts
└── ...
```

## Development

### Adding New Features

1. Create new module: `nest generate module feature`
2. Add controller: `nest generate controller feature`
3. Add service: `nest generate service feature`
4. Add entities and DTOs as needed

### Database Migrations

```bash
# Run migrations (e.g. search indexes)
npm run migration:run

# Revert last migration
npm run migration:revert
```

The **search** feature requires the migration `AddSearchIndexes` (pg_trgm, tsvector columns, GIN indexes). See `src/search/README.md`.

## License

This project is proprietary and confidential.
