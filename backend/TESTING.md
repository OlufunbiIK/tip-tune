# Testing Guide for TipTune Backend

This guide explains how to run and write tests for the TipTune backend application with the new multi-layered testing approach.

## 🎯 Overview

The testing system is organized into three distinct layers to provide honest test discovery and appropriate coverage:

1. **Unit Tests** - Fast, isolated tests for individual functions and classes
2. **Integration Tests** - Tests that verify module interactions with real database connections
3. **E2E Tests** - Full application tests that exercise HTTP endpoints and workflows

## 🚀 Quick Start

### Run All Tests
```bash
# Run all test layers
npm run test:all

# Run all tests with coverage
npm run test:all:cov
```

### Run Specific Test Layers
```bash
# Unit tests only (default)
npm run test

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Previously skipped modules (now runnable)
npm run test:modules
```

### Watch Mode
```bash
# Unit tests in watch mode
npm run test:watch

# Integration tests in watch mode
npm run test:integration:watch

# E2E tests in watch mode
npm run test:e2e:watch

# Specific modules in watch mode
npm run test:modules:watch
```

## 📁 Test Structure

```
backend/
├── src/
│   ├── *.spec.ts              # Unit tests
│   ├── *.integration-spec.ts   # Integration tests
│   └── *.e2e-spec.ts          # E2E tests (rare in src/)
├── test/
│   ├── jest-unit.json          # Unit test configuration
│   ├── jest-integration.json   # Integration test configuration
│   ├── jest-e2e-updated.json   # E2E test configuration
│   ├── setup/
│   │   ├── unit.setup.ts       # Unit test setup
│   │   ├── integration.setup.ts # Integration test setup
│   │   └── e2e.setup.ts        # E2E test setup
│   ├── core-flows.e2e-spec.ts  # Legacy E2E tests (contract tests)
│   └── fixtures/
│       └── test-data.ts        # Test data fixtures
└── coverage/
    ├── unit/                   # Unit test coverage
    ├── integration/            # Integration test coverage
    └── e2e/                    # E2E test coverage
```

## 🧪 Test Layers Explained

### Unit Tests (`*.spec.ts`)

**Purpose**: Test individual functions and classes in isolation
**Speed**: Fast (milliseconds)
**Database**: Mocked
**External Dependencies**: Mocked

**When to Write**:
- Business logic validation
- Utility functions
- Service methods without external dependencies
- Data transformation logic

**Example**:
```typescript
// src/auth/auth.service.spec.ts
describe('AuthService', () => {
  it('should generate a challenge for valid public key', async () => {
    const result = await authService.generateChallenge(validPublicKey);
    expect(result).toHaveProperty('challengeId');
    expect(result).toHaveProperty('challenge');
  });
});
```

### Integration Tests (`*.integration-spec.ts`)

**Purpose**: Test module interactions with real database
**Speed**: Medium (seconds)
**Database**: Real test database
**External Dependencies**: Some mocked (Redis, external APIs)

**When to Write**:
- Repository operations
- Database entity relationships
- Module interactions
- Transaction boundaries

**Example**:
```typescript
// src/tracks/tracks.service.integration-spec.ts
describe('TracksService Integration', () => {
  let dataSource: DataSource;
  
  beforeAll(async () => {
    dataSource = await global.testUtils.createTestDataSource();
  });

  it('should create and retrieve track with real database', async () => {
    const track = await tracksService.create(trackDto);
    const found = await tracksService.findOne(track.id);
    expect(found.id).toBe(track.id);
  });
});
```

### E2E Tests (`*.e2e-spec.ts`)

**Purpose**: Test complete workflows through HTTP endpoints
**Speed**: Slow (seconds to minutes)
**Database**: Real test database
**External Dependencies**: Mocked external services

**When to Write**:
- HTTP endpoint contracts
- Complete user workflows
- API integration tests
- Cross-module functionality

**Example**:
```typescript
// test/auth.e2e-spec.ts
describe('Auth Flow (E2E)', () => {
  it('should complete full authentication flow', async () => {
    // 1. Generate challenge
    const challengeResponse = await request(app.getHttpServer())
      .post('/auth/challenge')
      .send({ publicKey })
      .expect(200);

    // 2. Verify signature
    const authResponse = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ challengeId, publicKey, signature })
      .expect(200);

    // 3. Access protected endpoint
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${authResponse.body.accessToken}`)
      .expect(200);
  });
});
```

## 🎯 Previously Skipped Modules

The following modules were previously excluded from testing but are now fully testable:

### Newly Runnable Modules
- `analytics` - Analytics and reporting
- `artiste-payout` - Artist payout processing
- `auth` - Authentication system
- `comments` - Comment system
- `embed` - Embed functionality
- `events-live-show` - Live show events
- `follows` - User following system
- `genres` - Genre management
- `platinum-fee` - Platinum fee processing
- `playlists` - Playlist management
- `search` - Search functionality
- `social-sharing` - Social sharing features
- `subscription-tiers` - Subscription management
- `tips` - Tipping system
- `track-listening-right-management` - Track rights
- `track-play-count` - Play count tracking
- `waveform` - Waveform processing

### Running Previously Skipped Tests
```bash
# Run all previously skipped modules
npm run test:modules

# Run specific module tests
npm run test -- --testPathPattern="src/auth"

# Run with coverage
npm run test:modules:cov

# Watch mode for development
npm run test:modules:watch
```

## 🛠️ Writing New Tests

### Unit Test Template
```typescript
import { Test } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('yourMethod', () => {
    it('should return expected result', async () => {
      const result = await service.yourMethod(input);
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### Integration Test Template
```typescript
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YourService } from './your.service';
import { YourEntity } from './your.entity';

describe('YourService Integration', () => {
  let service: YourService;
  let dataSource: DataSource;

  beforeAll(async () => {
    await global.testUtils.withTestDatabase(async (ds) => {
      dataSource = ds;
      
      const module = await global.createTestingModule({
        imports: [TypeOrmModule.forFeature([YourEntity])],
        providers: [YourService],
      });

      service = module.get<YourService>(YourService);
    });
  });

  it('should interact with real database', async () => {
    const entity = await service.create(createDto);
    expect(entity.id).toBeDefined();
  });
});
```

### E2E Test Template
```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('YourController (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await global.createE2ETestModule({
      controllers: [YourController],
      providers: [YourService],
    });

    app = await global.httpTestUtils.createTestApp(module);
  });

  it('should handle HTTP request', async () => {
    return request(app.getHttpServer())
      .post('/your-endpoint')
      .send(requestDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
      });
  });
});
```

## 📊 Coverage Reports

Coverage reports are generated separately for each test layer:

```bash
# Unit test coverage
npm run test:cov

# Integration test coverage  
npm run test:integration:cov

# E2E test coverage
npm run test:e2e:cov

# Combined coverage
npm run test:all:cov
```

Coverage reports are located in:
- `coverage/unit/` - Unit test coverage
- `coverage/integration/` - Integration test coverage  
- `coverage/e2e/` - E2E test coverage

## 🔧 Configuration Files

### Jest Unit Config (`test/jest-unit.json`)
- Focuses on `src/**/*.spec.ts` files
- Excludes integration and E2E tests
- Mocks all external dependencies
- Fast execution with minimal setup

### Jest Integration Config (`test/jest-integration.json`)
- Focuses on `src/**/*.integration-spec.ts` files
- Uses real test database
- Mocks external services (Redis, APIs)
- Medium execution time

### Jest E2E Config (`test/jest-e2e-updated.json`)
- Focuses on `test/**/*.e2e-spec.ts` files
- Full application testing
- HTTP endpoint testing
- Slowest but most comprehensive

## 🧪 Test Data and Fixtures

### Global Test Utilities
Available in all test files:

```typescript
// Test data creation
const user = global.testUtils.createMockUser();
const artist = global.testUtils.createMockArtist();
const track = global.testUtils.createMockTrack();

// Database utilities (integration tests)
await global.testUtils.withTestDatabase(async (dataSource) => {
  // Your test code here
});

// HTTP utilities (E2E tests)
const app = await global.httpTestUtils.createTestApp(module);
const request = global.httpTestUtils.withAuthHeader(req, token);
```

### Test Fixtures
Located in `test/fixtures/test-data.ts`:

```typescript
export const testFixtures = {
  users: { listener, artist, admin },
  artists: { sample },
  tracks: { sample },
  artistStatus: { onTour, recording },
};
```

## 🚦 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Unit Tests
  run: npm run test:cov

- name: Run Integration Tests  
  run: npm run test:integration:cov

- name: Run E2E Tests
  run: npm run test:e2e:cov

- name: Run Previously Skipped Modules
  run: npm run test:modules:cov
```

### Environment Variables
```bash
# Test database configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=password
TEST_DB_NAME=tiptune_test

# Test verbosity
VERBOSE_TESTS=true
VERBOSE_E2E=true
```

## 🔍 Debugging Tests

### Unit Test Debugging
```bash
# Debug specific test
npm run test:debug -- auth.service.spec.ts

# Run with verbose output
VERBOSE_TESTS=true npm run test

# Run specific test file
npm run test -- --testPathPattern="auth.service.spec.ts"
```

### Integration Test Debugging
```bash
# Debug with database logs
VERBOSE_TESTS=true npm run test:integration

# Run specific integration test
npm run test:integration -- --testPathPattern="tracks.integration-spec.ts"
```

### E2E Test Debugging
```bash
# Debug with HTTP logs
VERBOSE_E2E=true npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --testPathPattern="auth.e2e-spec.ts"
```

## 📝 Best Practices

### Unit Tests
- Keep them fast and focused
- Mock all external dependencies
- Test one thing at a time
- Use descriptive test names

### Integration Tests
- Use real database but mock external services
- Test repository operations and relationships
- Clean up database after each test
- Use transactions when possible

### E2E Tests
- Test complete user workflows
- Focus on API contracts
- Use realistic test data
- Test error scenarios

### General Guidelines
- Arrange-Act-Assert pattern
- Use meaningful test descriptions
- Keep test data isolated
- Use setup files for common configuration

## 🐛 Troubleshooting

### Common Issues

**Test Database Connection Failed**
```bash
# Check test database is running
docker ps | grep postgres

# Verify environment variables
echo $TEST_DB_HOST $TEST_DB_PORT
```

**Module Not Found Errors**
```bash
# Check tsconfig paths
cat tsconfig.json | grep paths

# Verify module imports
find src -name "*.ts" | grep -i auth
```

**Timeout Errors**
```bash
# Increase timeout for specific tests
jest.setTimeout(60000); // 60 seconds

# Run tests with longer timeout
npm run test:e2e -- --testTimeout=60000
```

### Performance Tips
- Use unit tests for fast feedback
- Run integration tests in parallel when possible
- Use database transactions for cleanup
- Mock expensive external operations

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing Guide](https://docs.nestjs.com/testing)
- [TypeORM Testing](https://typeorm.io/testing)
- [Supertest for HTTP Testing](https://github.com/visionmedia/supertest)

---

**This testing structure provides honest test discovery, clear separation of concerns, and comprehensive coverage for all application layers.**
