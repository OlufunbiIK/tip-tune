// E2E test setup file
// This file runs before each E2E test suite

import 'jest';
import { Test } from '@nestjs/testing';

// Mock Redis for E2E tests
jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushall: jest.fn().mockResolvedValue('OK'),
  })),
}));

// Global test utilities for E2E tests
global.createE2ETestModule = async (overrides: any = {}) => {
  return Test.createTestingModule({
    ...overrides,
  }).compile();
};

// HTTP test utilities
global.httpTestUtils = {
  createTestApp: async (module: any) => {
    const app = module.createNestApplication();
    
    // Set up global pipes
    app.useGlobalPipes(
      new (require('@nestjs/common').ValidationPipe)({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
    return app;
  },
  
  withAuthHeader: (request: any, token: string = 'test-token') => {
    return request.set('Authorization', `Bearer ${token}`);
  },
  
  withUserHeader: (request: any, userId: string = 'test-user-id') => {
    return request.set('x-user-id', userId);
  },
};

// Test data fixtures
global.testFixtures = {
  users: {
    listener: {
      id: 'listener-123',
      username: 'testlistener',
      email: 'listener@test.com',
      role: 'user',
      walletAddress: 'GTESTLISTENER123456789',
    },
    artist: {
      id: 'artist-123',
      username: 'testartist',
      email: 'artist@test.com',
      role: 'artist',
      walletAddress: 'GTESTARTIST123456789',
    },
    admin: {
      id: 'admin-123',
      username: 'testadmin',
      email: 'admin@test.com',
      role: 'admin',
      walletAddress: 'GTESTADMIN123456789',
    },
  },
  
  artists: {
    sample: {
      id: 'artist-456',
      userId: 'artist-123',
      artistName: 'Test Artist',
      genre: 'Test Genre',
      bio: 'Test Bio',
      walletAddress: 'GTESTARTISTWALLET123',
      isVerified: false,
      status: 'active',
      totalTipsReceived: '0',
      emailNotifications: true,
    },
  },
  
  tracks: {
    sample: {
      id: 'track-789',
      title: 'Test Track',
      genre: 'Test Genre',
      description: 'Test Description',
      artistId: 'artist-456',
      duration: 180,
      isPublic: true,
      playCount: 0,
      totalTips: '0',
    },
  },
  
  artistStatus: {
    onTour: {
      statusType: 'on_tour',
      statusMessage: 'On tour in Europe',
      emoji: '🌍',
      showOnProfile: true,
    },
    recording: {
      statusType: 'recording',
      statusMessage: 'In the studio',
      emoji: '🎙️',
      showOnProfile: true,
    },
  },
};

// Set extended timeout for E2E tests
jest.setTimeout(60000);

// Console filtering for cleaner E2E test output
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.VERBOSE_E2E === 'true') {
    originalConsoleLog(...args);
  }
};
