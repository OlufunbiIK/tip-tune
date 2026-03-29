// Unit test setup file
// This file runs before each unit test suite

import 'jest';

// Mock external dependencies that unit tests shouldn't need
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => {
      const mockConfig = {
        'NODE_ENV': 'test',
        'DB_HOST': 'localhost',
        'DB_PORT': 5432,
        'DB_USERNAME': 'test',
        'DB_PASSWORD': 'test',
        'DB_NAME': 'test_db',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': 6379,
      };
      return mockConfig[key];
    }),
  })),
}));

// Mock TypeORM for unit tests
jest.mock('typeorm', () => ({
  DataSource: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(),
  })),
  Repository: jest.fn().mockImplementation(() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
  })),
  Entity: jest.fn(),
  PrimaryGeneratedColumn: jest.fn(),
  Column: jest.fn(),
  CreateDateColumn: jest.fn(),
  UpdateDateColumn: jest.fn(),
  ManyToOne: jest.fn(),
  OneToMany: jest.fn(),
  JoinColumn: jest.fn(),
}));

// Mock Redis for unit tests
jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  createMockArtist: (overrides = {}) => ({
    id: 'test-artist-id',
    userId: 'test-user-id',
    artistName: 'Test Artist',
    genre: 'Test Genre',
    bio: 'Test Bio',
    walletAddress: 'GTEST123456789',
    isVerified: false,
    status: 'active',
    totalTipsReceived: '0',
    emailNotifications: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  createMockTrack: (overrides = {}) => ({
    id: 'test-track-id',
    title: 'Test Track',
    genre: 'Test Genre',
    description: 'Test Description',
    artistId: 'test-artist-id',
    duration: 180,
    isPublic: true,
    playCount: 0,
    totalTips: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

// Console filtering for cleaner test output
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args);
  }
};

// Set default test timeout
jest.setTimeout(10000);
