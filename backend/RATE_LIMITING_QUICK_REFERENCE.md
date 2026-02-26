# Rate Limiting Quick Reference

Quick reference for developers working with rate limiting in TipTune backend.

## Installation

```bash
npm install @nestjs/throttler throttler-storage-redis
```

## Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
RATE_LIMIT_WHITELIST=127.0.0.1,::1
```

## Rate Limit Presets

| Preset | Limit | Use Case |
|--------|-------|----------|
| `PUBLIC` | 60/min | Public unauthenticated endpoints |
| `AUTHENTICATED` | 300/min | Authenticated user endpoints |
| `AUTH_ENDPOINTS` | 10/min | Login, signup, password reset |
| `TIP_SUBMISSION` | 30/min | Creating tips/transactions |
| `SEARCH` | 100/min | Search and autocomplete |
| `FILE_UPLOAD` | 5/min | File uploads |
| `STRICT` | 5/min | Very sensitive operations |
| `RELAXED` | 1000/min | Internal or low-risk endpoints |

## Usage Examples

### Apply Preset to Endpoint

```typescript
import { ThrottleOverride } from '../common/decorators/throttle-override.decorator';

@Controller('auth')
export class AuthController {
  @Post('login')
  @ThrottleOverride('AUTH_ENDPOINTS') // 10 requests per minute
  async login() {
    // ...
  }
}
```

### Custom Rate Limit

```typescript
import { CustomThrottle } from '../common/decorators/throttle-override.decorator';

@Controller('api')
export class ApiController {
  @Get('data')
  @CustomThrottle(50, 60000) // 50 requests per minute
  async getData() {
    // ...
  }
}
```

### Skip Rate Limiting

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle() // No rate limiting
  async healthCheck() {
    return { status: 'ok' };
  }
}
```

### Authentication-Aware Rate Limiting

```typescript
import { ThrottleAuthAware } from '../common/decorators/throttle-override.decorator';

@Controller('api')
export class ApiController {
  @Get('data')
  @ThrottleAuthAware() // 60/min for public, 300/min for authenticated
  async getData() {
    // ...
  }
}
```

### Skip Rate Limiting for Entire Controller

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@Controller('admin')
@SkipThrottle() // All endpoints in this controller skip rate limiting
export class AdminController {
  // ...
}
```

## Response Headers

### Success Response (200)
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

### Rate Limited Response (429)
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 45
```

## Testing Rate Limits

### Test with curl

```bash
# Test public endpoint (60/min)
for i in {1..65}; do
  curl -i http://localhost:3001/api/tracks
  echo "Request $i"
done

# Test auth endpoint (10/min)
for i in {1..12}; do
  curl -X POST http://localhost:3001/api/auth/challenge \
    -H "Content-Type: application/json" \
    -d '{"publicKey":"GXXX..."}'
  echo "Request $i"
done
```

### Test with JavaScript

```javascript
// Test rate limiting
async function testRateLimit() {
  for (let i = 0; i < 65; i++) {
    const response = await fetch('http://localhost:3001/api/tracks');
    console.log(`Request ${i + 1}: ${response.status}`);
    console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'));
    
    if (response.status === 429) {
      console.log('Rate limited! Retry after:', response.headers.get('Retry-After'));
      break;
    }
  }
}
```

## Admin Endpoints

```bash
# Get overall metrics
curl http://localhost:3001/admin/rate-limits/metrics

# Get endpoint statistics
curl http://localhost:3001/admin/rate-limits/endpoints

# Get top rate-limited IPs
curl http://localhost:3001/admin/rate-limits/top-ips?limit=10

# Get suspicious IPs
curl http://localhost:3001/admin/rate-limits/suspicious-ips?threshold=0.5

# Get summary
curl http://localhost:3001/admin/rate-limits/summary

# Reset metrics
curl -X POST http://localhost:3001/admin/rate-limits/reset
```

## Redis Commands

```bash
# Connect to Redis
redis-cli

# Check if Redis is running
PING

# View all throttler keys
KEYS throttler:*

# View specific key
GET throttler:auth/challenge:192.168.1.1:1234567890

# Check TTL (time to live)
TTL throttler:auth/challenge:192.168.1.1:1234567890

# Delete all throttler keys (reset all rate limits)
KEYS throttler:* | xargs redis-cli DEL

# Monitor Redis commands in real-time
MONITOR

# Get Redis info
INFO
```

## Common Issues

### Issue: Rate limiting not working
**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Verify environment variables in `.env`
3. Check guard is registered in `app.module.ts`
4. Clear Redis cache: `redis-cli FLUSHDB`

### Issue: All requests return 429
**Solution:**
1. Check if your IP is whitelisted
2. Clear Redis cache: `redis-cli FLUSHDB`
3. Verify rate limit configuration
4. Check for stuck keys: `redis-cli KEYS throttler:*`

### Issue: Headers not appearing
**Solution:**
1. Verify guard is applied globally
2. Check decorator is imported correctly
3. Restart application

### Issue: Redis connection error
**Solution:**
1. Start Redis: `redis-server`
2. Check Redis host/port in `.env`
3. Verify network connectivity
4. Check Redis logs

## Utility Functions

```typescript
import {
  getClientIp,
  isIpWhitelisted,
  parseWhitelist,
  calculateRetryAfter,
  formatResetTime,
  isRequestAuthenticated,
  createRateLimitMessage,
} from './common/utils/rate-limit.utils';

// Extract client IP
const ip = getClientIp(request);

// Check if IP is whitelisted
const isWhitelisted = isIpWhitelisted(ip, ['127.0.0.1', '::1']);

// Parse whitelist from env
const whitelist = parseWhitelist(process.env.RATE_LIMIT_WHITELIST);

// Calculate retry after time
const retryAfter = calculateRetryAfter(60000); // 60 seconds

// Format reset time
const resetTime = formatResetTime(60000);

// Check if request is authenticated
const isAuth = isRequestAuthenticated(request);

// Create error message
const message = createRateLimitMessage(45); // "Rate limit exceeded. Please try again in 45 seconds."
```

## Best Practices

1. **Start Conservative**: Begin with stricter limits and relax based on usage
2. **Monitor Metrics**: Track 429 responses to identify if limits are too strict
3. **Document Limits**: Include rate limit info in API documentation
4. **Test Thoroughly**: Test rate limiting before deploying to production
5. **Use Appropriate Limits**: Different endpoints should have different limits
6. **Whitelist Carefully**: Only whitelist trusted internal IPs
7. **Handle Errors**: Provide clear error messages with retry information
8. **Monitor Redis**: Keep an eye on Redis memory and performance

## File Locations

```
backend/
├── src/
│   ├── common/
│   │   ├── guards/
│   │   │   └── throttler.guard.ts
│   │   ├── decorators/
│   │   │   └── throttle-override.decorator.ts
│   │   ├── utils/
│   │   │   └── rate-limit.utils.ts
│   │   ├── services/
│   │   │   └── rate-limit-metrics.service.ts
│   │   └── controllers/
│   │       └── rate-limit-metrics.controller.ts
│   └── app.module.ts
├── test/
│   └── throttler.e2e-spec.ts
├── RATE_LIMITING.md
├── setup-rate-limiting.md
└── RATE_LIMITING_QUICK_REFERENCE.md (this file)
```

## Support

- **Documentation**: See `RATE_LIMITING.md`
- **Setup Guide**: See `setup-rate-limiting.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`
- **Tests**: See test files for usage examples
- **Redis Logs**: `redis-cli MONITOR`
- **App Logs**: Check console output

## Quick Commands

```bash
# Install dependencies
npm install @nestjs/throttler throttler-storage-redis

# Start Redis
redis-server

# Test Redis
redis-cli ping

# Start app
npm run start:dev

# Run tests
npm test -- throttler
npm run test:e2e -- throttler

# Monitor Redis
redis-cli MONITOR

# Clear rate limits
redis-cli FLUSHDB
```
