import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService } from './logging.service';
import * as fs from 'fs';
import * as path from 'path';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingService],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
  });

  afterAll(() => {
    // Cleanup log files
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      files.forEach(file => {
        if (file.includes('test')) {
          fs.unlinkSync(path.join(logsDir, file));
        }
      });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log info messages', () => {
    expect(() => {
      service.log('Test info message', 'TestContext');
    }).not.toThrow();
  });

  it('should log error messages', () => {
    expect(() => {
      service.error('Test error message', 'stack trace', 'TestContext');
    }).not.toThrow();
  });

  it('should log warning messages', () => {
    expect(() => {
      service.warn('Test warning message', 'TestContext');
    }).not.toThrow();
  });

  it('should log debug messages', () => {
    expect(() => {
      service.debug('Test debug message', 'TestContext');
    }).not.toThrow();
  });

  it('should log HTTP requests', () => {
    expect(() => {
      service.logRequest('GET', '/api/test', 200, 0.123, 'user123');
    }).not.toThrow();
  });

  it('should log database queries', () => {
    expect(() => {
      service.logDatabaseQuery('SELECT * FROM users', 0.05, 'users');
    }).not.toThrow();
  });

  it('should log Stellar transactions', () => {
    expect(() => {
      service.logStellarTransaction('tx123', 'payment', true);
    }).not.toThrow();
  });

  it('should log Stellar transaction failures', () => {
    expect(() => {
      service.logStellarTransaction('tx456', 'payment', false, 'Timeout error');
    }).not.toThrow();
  });

  it('should log tips', () => {
    expect(() => {
      service.logTip('tip123', 10.5, 'XLM', 'user1', 'artist1');
    }).not.toThrow();
  });
});
