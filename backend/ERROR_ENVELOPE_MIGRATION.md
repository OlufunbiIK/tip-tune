# Error Envelope Migration Guide

## Overview

This guide explains the new consistent error handling system implemented across the Tip-Tune backend. All API endpoints now return errors in a standardized format using a global exception filter.

## Error Response Format

All errors now follow this consistent envelope:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Track with ID abc-123 not found",
  "errorId": "err_a1b2c3d4e5f6",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/tracks/abc-123"
}
```

### Fields

- **statusCode** (number): HTTP status code
- **error** (string): HTTP status name
- **message** (string | string[]): Human-readable error message
- **errorId** (string): Unique identifier for error tracking (in production)
- **timestamp** (string): ISO 8601 timestamp of when error occurred
- **path** (string): API endpoint path where error occurred

### Development-Only Fields

In development mode (`NODE_ENV=development`), additional fields are included:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": {
    "errors": ["Field 'title' is required"]
  },
  "stack": "BadRequestException: Validation failed\n    at ..."
}
```

- **details** (any): Additional context or validation errors
- **stack** (string): Stack trace for debugging

## Custom Exception Classes

Use these custom exceptions for consistent error handling:

### Base Exception

```typescript
import { ApiException } from '@/common/exceptions/api-exception';

throw new ApiException('Error message', HttpStatus.BAD_REQUEST);
```

### Specific Exceptions

#### ResourceNotFoundException (404)
```typescript
import { ResourceNotFoundException } from '@/common/exceptions';

// Instead of: throw new NotFoundException('Track not found');
throw new ResourceNotFoundException('Track', trackId);
// Returns: "Track with ID {trackId} not found"
```

#### ValidationException (400)
```typescript
import { ValidationException } from '@/common/exceptions';

// For general validation errors
throw new ValidationException('Invalid input data', {
  title: ['Title is required'],
  artistId: ['Invalid artist ID format']
});
```

#### AuthenticationException (401)
```typescript
import { AuthenticationException } from '@/common/exceptions';

// Instead of: throw new UnauthorizedException('Invalid token');
throw new AuthenticationException('Invalid or expired token');
```

#### AuthorizationException (403)
```typescript
import { AuthorizationException } from '@/common/exceptions';

// Instead of: throw new ForbiddenException();
throw new AuthorizationException('You do not have permission to delete this track');
```

#### ConflictException (409)
```typescript
import { ConflictException } from '@/common/exceptions';

// Instead of: throw new ConflictException('Email already exists');
throw new ConflictException('User', 'email');
// Returns: "User with this email already exists"
```

#### FileUploadException (400/413)
```typescript
import { FileUploadException } from '@/common/exceptions';

throw new FileUploadException('File too large', 'audio.mp3', HttpStatus.PAYLOAD_TOO_LARGE);
```

#### DatabaseException (500)
```typescript
import { DatabaseException } from '@/common/exceptions';

throw new DatabaseException('INSERT', 'Failed to save record', originalError);
```

#### ExternalServiceException (502)
```typescript
import { ExternalServiceException } from '@/common/exceptions';

throw new ExternalServiceException('Storage Service', 'S3 bucket unreachable', error);
```

#### RateLimitException (429)
```typescript
import { RateLimitException } from '@/common/exceptions';

throw new RateLimitException('Too many requests', 60); // retryAfter in seconds
```

#### ResourceGoneException (410)
```typescript
import { ResourceGoneException } from '@/common/exceptions';

throw new ResourceGoneException('Track', trackId);
// For soft-deleted resources
```

## Migration Steps

### Step 1: Update Imports

Replace standard NestJS exceptions with custom ones:

```typescript
// Before
import { NotFoundException, BadRequestException } from '@nestjs/common';

// After
import { 
  ResourceNotFoundException, 
  ValidationException 
} from '@/common/exceptions';
```

### Step 2: Replace Exception Throws

```typescript
// Before
if (!track) {
  throw new NotFoundException(`Track with ID ${id} not found`);
}

// After
if (!track) {
  throw new ResourceNotFoundException('Track', id);
}
```

### Step 3: Handle Validation Errors

The global validation pipe automatically returns errors in the correct format:

```typescript
// DTO validation errors are automatically formatted
@Body() createTrackDto: CreateTrackDto // Invalid data
// Returns: { statusCode: 400, error: 'Bad Request', message: [...], details: {...} }
```

## Response Headers

All error responses include these headers:

- `X-Error-ID`: Unique error identifier for tracking
- `X-Timestamp`: When the error occurred
- `Content-Type`: application/json

## Testing

Contract tests are provided in `test/error-envelope.contract.e2e-spec.ts`. Run them with:

```bash
npm run test:e2e -- error-envelope
```

## Examples by Module

### Tracks Module

```typescript
// tracks.service.ts
import { ResourceNotFoundException } from '@/common/exceptions';

async findOne(id: string): Promise<Track> {
  const track = await this.tracksRepository.findOne({ where: { id } });
  
  if (!track) {
    throw new ResourceNotFoundException('Track', id);
  }
  
  return track;
}
```

### Auth Module

```typescript
// auth.service.ts
import { AuthenticationException } from '@/common/exceptions';

async verifySignature(verifyDto: VerifySignatureDto) {
  const isValid = await this.validateSignature(verifyDto);
  
  if (!isValid) {
    throw new AuthenticationException('Invalid signature');
  }
}
```

### Users Module

```typescript
// users.service.ts
import { ConflictException } from '@/common/exceptions';

async create(createUserDto: CreateUserDto) {
  const existing = await this.findByUsername(createUserDto.username);
  
  if (existing) {
    throw new ConflictException('User', 'username');
  }
  
  return this.usersRepository.save(createUserDto);
}
```

## Best Practices

1. **Always use specific exceptions**: Prefer `ResourceNotFoundException` over generic `ApiException`
2. **Include context**: Pass relevant IDs and field names to help with debugging
3. **Don't expose internals**: The filter automatically hides stack traces in production
4. **Log appropriately**: Use Logger service before throwing exceptions
5. **Preserve error causes**: Pass original errors as the `cause` option for debugging

```typescript
try {
  await database.query(sql);
} catch (error) {
  logger.error('Database operation failed', error);
  throw new DatabaseException('QUERY', 'Failed to fetch records', error);
}
```

## Backward Compatibility

The global exception filter handles both old and new exception styles:

- Old: `throw new NotFoundException('Message')` ✓ Still works
- New: `throw new ResourceNotFoundException('Track', id)` ✓ Recommended

Both will be caught and formatted consistently by the global filter.

## Swagger Documentation

The `ApiErrorEnvelope` DTO is automatically included in Swagger documentation for all endpoints that return errors. Each endpoint's `@ApiResponse` decorators should document potential errors:

```typescript
@ApiResponse({ 
  status: 404, 
  description: 'Resource not found',
  type: ApiErrorEnvelope 
})
```

## Monitoring

Use the `errorId` from responses to track errors in logs:

```bash
# Search logs by error ID
grep "err_a1b2c3d4e5f6" logs/*.log
```

## Rollback

If you need to temporarily disable the global filter:

```typescript
// In main.ts, comment out:
// app.useGlobalFilters(globalExceptionFilter);
```

However, this is not recommended as it will expose inconsistent error formats.
