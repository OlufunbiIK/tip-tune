# 🏆 Comprehensive Leaderboard System

## Overview
This PR implements a complete leaderboard system showcasing top artists, generous tippers, and trending tracks with advanced ranking algorithms, caching, and real-time updates.

## Complexity: High
**Labels:** `backend`, `frontend`, `gamification`, `drips-wave`, `stellar-wave`

## Backend Implementation

### Core Services
- **`ranking.service.ts`**: Implements decay algorithms for time-based rankings
  - Exponential decay for momentum scoring
  - Time-weighted scoring with configurable half-life
  - Growth rate calculations for fastest growing artists
  - Composite trending score combining plays, tips, and recency

- **`leaderboards.service.ts`**: Main service handling all leaderboard types
  - Artist leaderboards (most tipped, most played, fastest growing, by genre)
  - Tipper leaderboards (most generous, most active, biggest single tip)
  - Track leaderboards (trending, most tipped, most played)
  - Redis caching with 5-minute TTL
  - Cache invalidation support

- **`leaderboards.scheduler.ts`**: Scheduled cache refreshes
  - All-time leaderboards: hourly
  - Weekly leaderboards: every 15 minutes
  - Monthly leaderboards: every 30 minutes
  - Trending tracks: every 5 minutes

### API Endpoints
All endpoints are public and support filtering:
- `GET /api/leaderboards/artists/most-tipped`
- `GET /api/leaderboards/artists/most-played`
- `GET /api/leaderboards/artists/fastest-growing`
- `GET /api/leaderboards/artists/by-genre/:genre`
- `GET /api/leaderboards/tippers/most-generous`
- `GET /api/leaderboards/tippers/most-active`
- `GET /api/leaderboards/tippers/biggest-single`
- `GET /api/leaderboards/tracks/trending`
- `GET /api/leaderboards/tracks/most-tipped`
- `GET /api/leaderboards/tracks/most-played`

Query parameters:
- `timeframe`: `all-time` | `monthly` | `weekly`
- `limit`: number of results (1-100, default: 50)
- `offset`: pagination offset (default: 0)
- `genre`: filter by genre (for artist leaderboards)

### Infrastructure
- **Redis Module**: Global Redis client with connection pooling
- **Schedule Module**: NestJS scheduler for cron jobs
- **TypeORM Integration**: Optimized queries with proper joins and aggregations

## Frontend Implementation

### Components
- **`LeaderboardTable.tsx`**: Reusable table component
  - Medal badges for top 3 positions
  - Rank change indicators (up/down arrows)
  - User highlighting for current user
  - Responsive design with hover effects
  - Click handlers for navigation

- **`LeaderboardsPage.tsx`**: Main leaderboard page
  - Category tabs (Artists, Tippers, Tracks)
  - Type selection dropdown
  - Timeframe filter buttons
  - Share functionality (Web Share API + clipboard fallback)
  - Loading and error states
  - URL state management with query parameters

### Services
- **`leaderboardService.ts`**: API client for leaderboard endpoints
  - Type-safe enum definitions
  - Query parameter handling
  - Response type definitions

## Technical Features

### Ranking Algorithms
1. **Momentum Score**: `score = base * e^(-decay * age_in_days)`
   - Default decay rate: 0.1-0.15
   - Gives more weight to recent activity

2. **Time Decay Score**: `score = base * 0.5^(age_in_hours / half_life)`
   - Configurable half-life (default: 168 hours = 1 week)
   - Exponential decay for time-sensitive rankings

3. **Growth Score**: `score = (recent - historical) / historical * 100 * (recent / time_window)`
   - Compares recent activity to historical baseline
   - Weighted by recent activity volume

4. **Trending Score**: Composite of plays, tips, and tip amounts
   - Each component uses momentum decay
   - Weighted combination for balanced ranking

### Caching Strategy
- Redis cache with 5-minute TTL
- Cache keys include type, timeframe, limit, offset, and genre
- Scheduled refreshes prevent stale data
- Manual cache invalidation support

### Performance Optimizations
- Efficient SQL queries with proper indexes
- Aggregation at database level
- Pagination support
- Lazy loading for large datasets

## Files Created

### Backend
- `backend/src/leaderboards/ranking.service.ts`
- `backend/src/leaderboards/leaderboards.service.ts`
- `backend/src/leaderboards/leaderboards.controller.ts`
- `backend/src/leaderboards/leaderboards.module.ts`
- `backend/src/leaderboards/leaderboards.scheduler.ts`
- `backend/src/leaderboards/redis.module.ts`
- `backend/src/leaderboards/dto/leaderboard-query.dto.ts`
- `backend/src/leaderboards/dto/leaderboard-response.dto.ts`

### Frontend
- `frontend/src/pages/LeaderboardsPage.tsx`
- `frontend/src/components/LeaderboardTable.tsx`
- `frontend/src/services/leaderboardService.ts`

## Dependencies Added
- `ioredis`: Redis client for Node.js
- `@nestjs/schedule`: NestJS scheduler for cron jobs

## Environment Variables
Add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Testing Checklist
- [x] All leaderboard types implemented
- [x] Ranking algorithms correct
- [x] Caching working
- [x] Frontend displays rankings
- [x] Filters functional
- [x] Real-time rank updates (via scheduled refreshes)
- [ ] Unit and integration tests (to be added in follow-up PR)

## Future Enhancements
- Historical snapshots (store leaderboard state over time)
- Real-time WebSocket updates for rank changes
- User-specific leaderboard position highlighting
- Export leaderboard data (CSV/JSON)
- Leaderboard analytics dashboard
- A/B testing for ranking algorithms

## Breaking Changes
None - this is a new feature addition.

## Migration Notes
1. Ensure Redis is running and accessible
2. Update environment variables
3. Run `npm install` in backend directory
4. Restart backend service to enable scheduled tasks

## Screenshots
(Add screenshots of the leaderboard UI when available)

---

**Ready for Review** ✅
