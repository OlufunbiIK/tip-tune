# Rate Limiting Setup Guide

## Quick Start

Follow these steps to set up rate limiting for the TipTune backend:

### 1. Install Dependencies

```bash
cd backend
npm install @nestjs/throttler throttler-storage-redis
```

### 2. Install and Start Redis

#### Windows (using Chocolatey)
```bash
choco install redis-64
redis-server
```

#### Windows (using WSL)
```bash
wsl
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

#### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Docker
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 3. Configure Environment Variables

Update your `.env` file with Redis configuration:

```env
# Redis Configuration (for rate limiting and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting Configuration
RATE_LIMIT_WHITELIST=127.0.0.1,::1
RATE_LIMIT_PUBLIC=60
RATE_LIMIT_AUTHENTICATED=300
RATE_LIMIT_AUTH_ENDPOINTS=10
RATE_LIMIT_TIP_SUBMISSION=30
RATE_LIMIT_SEARCH=100
RATE_LIMIT_FILE_UPLOAD=5
```

### 4. Verify Redis Connection

Test that Redis is running:

```bash
redis-cli ping
# Should return: PONG
```

### 5. Start the Application

```bash
npm run start:dev
```

### 6. Test Rate Limiting

Test that rate limiting is working:

```bash
# Test public endpoint (60 requests/minute)
for i in {1..65}; do
  curl -i http://localhost:3001/api/tracks
  echo "Request $i"
done

# You should see 429 responses after 60 requests
```

## Verification Checklist

- [ ] Redis is installed and running
- [ ] Dependencies are installed (`@nestjs/throttler`, `throttler-storage-redis`)
- [ ] Environment variables are configured
- [ ] Application starts without errors
- [ ] Rate limit headers appear in responses
- [ ] 429 responses are returned when limits are exceeded

## Files Created/Modified

### New Files
- `backend/src/common/guards/throttler.guard.ts` - Custom throttler guard
- `backend/src/common/guards/throttler.guard.spec.ts` - Unit tests
- `backend/src/common/decorators/throttle-override.decorator.ts` - Decorators
- `backend/test/throttler.e2e-spec.ts` - Integration tests
- `backend/RATE_LIMITING.md` - Documentation

### Modified Files
- `backend/src/app.module.ts` - Added ThrottlerModule and global guard
- `backend/.env.example` - Added Redis and rate limiting config
- `backend/src/auth/auth.controller.ts` - Applied AUTH_ENDPOINTS throttle
- `backend/src/tips/tips.controller.ts` - Applied TIP_SUBMISSION throttle
- `backend/src/search/search.controller.ts` - Applied SEARCH throttle
- `backend/src/storage/storage.controller.ts` - Applied FILE_UPLOAD throttle
- `backend/src/tracks/tracks.controller.ts` - Applied FILE_UPLOAD throttle

## Testing

### Run Unit Tests
```bash
npm test -- throttler.guard.spec.ts
```

### Run Integration Tests
```bash
# Make sure Redis is running first
npm run test:e2e -- throttler.e2e-spec.ts
```

### Manual Testing

Test different endpoints with their specific limits:

```bash
# Auth endpoints (10/min)
for i in {1..12}; do
  curl -X POST http://localhost:3001/api/auth/challenge \
    -H "Content-Type: application/json" \
    -d '{"publicKey":"GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}'
  echo "Request $i"
done

# Search endpoints (100/min)
for i in {1..105}; do
  curl http://localhost:3001/api/search?q=test
  echo "Request $i"
done

# File upload endpoints (5/min)
for i in {1..7}; do
  curl -X POST http://localhost:3001/api/files/upload \
    -F "file=@test-audio.mp3"
  echo "Request $i"
done
```

## Troubleshooting

### Redis Connection Error

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**: 
1. Check if Redis is running: `redis-cli ping`
2. Start Redis: `redis-server` or `sudo service redis-server start`
3. Verify Redis host/port in `.env`

### Module Not Found Error

**Error**: `Cannot find module '@nestjs/throttler'`

**Solution**:
```bash
cd backend
npm install @nestjs/throttler throttler-storage-redis
```

### Rate Limiting Not Working

**Symptoms**: No rate limit headers, no 429 responses

**Solution**:
1. Verify Redis is running and connected
2. Check that `CustomThrottlerGuard` is registered in `app.module.ts`
3. Clear Redis cache: `redis-cli FLUSHDB`
4. Restart the application

### All Requests Return 429

**Symptoms**: Every request is rate limited

**Solution**:
1. Check if your IP is not in the whitelist
2. Clear Redis cache: `redis-cli FLUSHDB`
3. Verify rate limit configuration in `.env`
4. Check Redis for stuck keys: `redis-cli KEYS throttler:*`

## Production Deployment

### Redis Configuration

For production, use a managed Redis service or secure your Redis instance:

1. **Enable Authentication**:
   ```bash
   # In redis.conf
   requirepass your-strong-password
   ```

2. **Update .env**:
   ```env
   REDIS_PASSWORD=your-strong-password
   ```

3. **Enable TLS** (recommended for production):
   ```env
   REDIS_TLS=true
   ```

4. **Use Redis Cluster** for high availability

### Monitoring

Set up monitoring for:
- Redis connection status
- Rate limit hit rate (429 responses)
- Redis memory usage
- Rate limit key count

### Scaling

For multiple server instances:
1. Use a shared Redis instance
2. Consider Redis Cluster for high traffic
3. Monitor Redis performance
4. Adjust rate limits based on capacity

## Support

For issues or questions:
1. Check the [RATE_LIMITING.md](./RATE_LIMITING.md) documentation
2. Review Redis logs: `redis-cli MONITOR`
3. Check application logs for errors
4. Verify environment configuration

## Next Steps

After setup is complete:
1. Review and adjust rate limits based on your needs
2. Add monitoring and alerting
3. Document rate limits in API documentation
4. Test thoroughly in staging environment
5. Deploy to production with monitoring
