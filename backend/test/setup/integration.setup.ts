// Integration test setup file
// This file runs before each integration test suite

import 'jest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Test database configuration
const testDbConfig = {
  type: 'postgres' as const,
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT) || 5433,
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  database: process.env.TEST_DB_NAME || 'tiptune_test',
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: true, // Only for test environment
  logging: false,
  dropSchema: true, // Clean database between tests
};

// Mock Redis for integration tests
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

// Global test utilities for integration tests
global.testDbConfig = testDbConfig;

global.createTestingModule = async (overrides: any = {}) => {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot(testDbConfig),
      ...(overrides.imports || []),
    ],
    ...overrides,
  });

  // Override any providers if specified
  if (overrides.providers) {
    for (const provider of overrides.providers) {
      moduleBuilder.overrideProvider(provider.provide).useValue(provider.useValue);
    }
  }

  return moduleBuilder.compile();
};

global.cleanupTestDatabase = async (dataSource: DataSource) => {
  if (dataSource && dataSource.isInitialized) {
    // Clean all tables
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`DELETE FROM "${entity.tableName}";`);
    }
  }
};

// Test database utilities
global.testUtils = {
  ...global.testUtils || {},
  
  createTestDataSource: async () => {
    const dataSource = new DataSource(testDbConfig as any);
    await dataSource.initialize();
    return dataSource;
  },
  
  withTestDatabase: async (callback: (dataSource: DataSource) => Promise<void>) => {
    const dataSource = await global.testUtils.createTestDataSource();
    try {
      await callback(dataSource);
    } finally {
      await global.cleanupTestDatabase(dataSource);
      await dataSource.destroy();
    }
  },
};

// Setup and teardown hooks
beforeAll(async () => {
  // Verify test database is accessible
  try {
    const dataSource = await global.testUtils.createTestDataSource();
    await dataSource.destroy();
    console.log('✅ Test database is accessible');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    process.exit(1);
  }
});

// Set longer timeout for integration tests
jest.setTimeout(30000);
