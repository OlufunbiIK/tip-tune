# Rate Limiting Implementation

This document describes the rate limiting implementation for the TipTune API using NestJS Throttler with Redis backend.

## Overview

Rate limiting is implemented globally across all API endpoints to prevent abuse, brute-force attacks, and excessive scraping. The implementation uses:

- **@nestjs/throttler**: NestJS module for rate limiting
- **throttler-storage-redis**: Redis-backed storage for distributed rate limiting
- **Custom Guard**: Enhanced throttler guard with additional features

## Rate Limit Rules

| Endpoint Type | Limit | Time Window | Description |
|--------------|-------|-------------|-------------|
| Public (unauthenticated) | 60 requests | 1 minute | Default for all public endpoints |
| Authenticated | 300 requests | 1 minute | For authenticated users |
| Auth endpoints (challenge, verify) | 10 requests | 1 minute | Login/authentication endpoints |
| Tip submission | 30 requests | 1 minute | Creating new tips |
| Search | 100 requests | 1 minute | Search and autocomplete |
| File upload | 5 requests | 1 minute | Audio file uploads |

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Redis Configuration
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

### Installation

Install required packages:

```bash
npm install @nestjs/throttler throttler-storage-redis
```

## Features

### 1. Rate Limit Headers

All responses include the following headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

### 2. Retry-After Header

When rate limit is exceeded (HTTP 429), the response includes:

- `Retry-After`: Number of seconds to wait before retrying

### 3. IP Whitelisting

Internal service IPs and localhost are automatically whitelisted and bypass rate limiting:

- `127.0.0.1` (IPv4 localhost)
- `::1` (IPv6 localhost)
- Custom IPs via `RATE_LIMIT_WHITELIST` environment variable

### 4. Custom Error Messages

Rate limit exceeded responses include helpful error messages:

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again in 45 seconds."
}
```

### 5. Redis-Backed Storage

Rate limit counters are stored in Redis, enabling:

- Distributed rate limiting across multiple server instances
- Automatic expiration of rate limit data
- High performance and scalability

## Usage

### Applying Rate Limits to Controllers

#### Using Presets

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ThrottleOverride } from '../common/decorators/throttle-override.decorator';

@Controller('auth')
export class AuthController {
  @Post('challenge')
  @ThrottleOverride('AUTH_ENDPOINTS') // 10 requests per minute
  async generateChallenge() {
    // ...
  }

  @Post('verify')
  @ThrottleOverride('AUTH_ENDPOINTS') // 10 requests per minute
  async verifySignature() {
    // ...
  }
}
```

#### Available Presets

- `PUBLIC`: 60 requests/minute
- `AUTHENTICATED`: 300 requests/minute
- `AUTH_ENDPOINTS`: 10 requests/minute
- `TIP_SUBMISSION`: 30 requests/minute
- `SEARCH`: 100 requests/minute
- `FILE_UPLOAD`: 5 requests/minute
- `STRICT`: 5 requests/minute
- `RELAXED`: 1000 requests/minute

#### Custom Rate Limits

```typescript
import { CustomThrottle } from '../common/decorators/throttle-override.decorator';

@Controller('custom')
export class CustomController {
  @Get('endpoint')
  @CustomThrottle(50, 60000) // 50 requests per minute
  async customEndpoint() {
    // ...
  }
}
```

#### Skipping Rate Limiting

```typescript
import { SkipThrottle } from '../common/decorators/throttle-override.decorator';

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

For endpoints that should have different limits based on authentication status:

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

## Testing

### Unit Tests

Run unit tests for the throttler guard:

```bash
npm test -- throttler.guard.spec.ts
```

### Integration Tests

Run end-to-end tests:

```bash
npm run test:e2e -- throttler.e2e-spec.ts
```

Make sure Redis is running before running integration tests.

## Monitoring

### Redis Keys

Rate limit data is stored in Redis with keys in the format:

```
throttler:{endpoint}:{ip}:{timestamp}
```

### Checking Rate Limit Status

You can monitor rate limit usage in Redis:

```bash
redis-cli
> KEYS throttler:*
> GET throttler:auth/challenge:192.168.1.1:1234567890
```

### Metrics

The implementation automatically tracks:

- Number of rate-limited requests (HTTP 429 responses)
- Rate limit header values
- IP addresses hitting rate limits

## Security Considerations

1. **IP Spoofing**: The guard checks `X-Forwarded-For` and `X-Real-IP` headers. Ensure your reverse proxy (nginx, etc.) is properly configured to set these headers.

2. **Distributed Attacks**: Redis-backed storage ensures rate limits work across multiple server instances.

3. **Whitelist Management**: Keep the whitelist minimal and only include trusted internal IPs.

4. **Redis Security**: Secure your Redis instance with:
   - Password authentication
   - Network isolation
   - TLS encryption (for production)

## Troubleshooting

### Rate Limits Not Working

1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Verify environment variables are set correctly

3. Check that the guard is registered globally in `app.module.ts`

### Too Many 429 Errors

1. Review rate limit configurations
2. Check if legitimate traffic is being blocked
3. Consider increasing limits for specific endpoints
4. Add IPs to whitelist if needed

### Redis Connection Issues

1. Verify Redis is running: `redis-cli ping`
2. Check Redis host and port in `.env`
3. Verify network connectivity
4. Check Redis logs for errors

## Best Practices

1. **Start Conservative**: Begin with stricter limits and relax them based on usage patterns

2. **Monitor Usage**: Track 429 responses to identify if limits are too strict

3. **Document Limits**: Include rate limit information in API documentation

4. **Provide Feedback**: Return clear error messages with retry information

5. **Use Appropriate Limits**: Different endpoints should have different limits based on their resource intensity

6. **Test Thoroughly**: Test rate limiting in staging before deploying to production

## Future Enhancements

Potential improvements to consider:

1. **Dynamic Rate Limits**: Adjust limits based on server load
2. **User-Based Limits**: Different limits for different user tiers
3. **Burst Allowance**: Allow short bursts above the limit
4. **Rate Limit Dashboard**: Web UI for monitoring and managing rate limits
5. **Automatic IP Blocking**: Temporarily block IPs that consistently exceed limits
6. **Geographic Rate Limits**: Different limits based on geographic location

## References

- [NestJS Throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [Redis Documentation](https://redis.io/documentation)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
