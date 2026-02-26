import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggingService implements LoggerService {
  private logger: winston.Logger;
  private elasticsearchService: any;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'tiptune-backend' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            }),
          ),
        }),
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.json(),
        }),
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.json(),
        }),
      ],
    });

    this.initElasticsearch();
  }

  private async initElasticsearch() {
    try {
      const { ElasticsearchService } = await import('./elasticsearch.service');
      this.elasticsearchService = new ElasticsearchService();
    } catch (error) {
      console.warn('Elasticsearch not available:', error.message);
    }
  }

  private async indexToElasticsearch(logData: any) {
    if (this.elasticsearchService) {
      try {
        await this.elasticsearchService.indexLog(logData);
      } catch (error) {
        // Silently fail if Elasticsearch is unavailable - don't crash the app
      }
    }
  }

  log(message: string, context?: string) {
    const logData = { message, context, level: 'info' };
    this.logger.info(message, { context });
    this.indexToElasticsearch(logData);
  }

  error(message: string, trace?: string, context?: string) {
    const logData = { message, trace, context, level: 'error' };
    this.logger.error(message, { trace, context });
    this.indexToElasticsearch(logData);
  }

  warn(message: string, context?: string) {
    const logData = { message, context, level: 'warn' };
    this.logger.warn(message, { context });
    this.indexToElasticsearch(logData);
  }

  debug(message: string, context?: string) {
    const logData = { message, context, level: 'debug' };
    this.logger.debug(message, { context });
    this.indexToElasticsearch(logData);
  }

  verbose(message: string, context?: string) {
    const logData = { message, context, level: 'verbose' };
    this.logger.verbose(message, { context });
    this.indexToElasticsearch(logData);
  }

  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
    const logData = { method, url, statusCode, duration, userId, type: 'http_request', level: 'info' };
    this.logger.info('HTTP Request', logData);
    this.indexToElasticsearch(logData);
  }

  logDatabaseQuery(query: string, duration: number, table?: string) {
    const logData = { query, duration, table, type: 'db_query', level: 'debug' };
    this.logger.debug('Database Query', logData);
    this.indexToElasticsearch(logData);
  }

  logStellarTransaction(txHash: string, operation: string, success: boolean, error?: string) {
    const logData = { txHash, operation, success, error, type: 'stellar_transaction', level: 'info' };
    this.logger.info('Stellar Transaction', logData);
    this.indexToElasticsearch(logData);
  }

  logTip(tipId: string, amount: number, currency: string, fromUser: string, toArtist: string) {
    const logData = { tipId, amount, currency, fromUser, toArtist, type: 'tip', level: 'info' };
    this.logger.info('Tip Processed', logData);
    this.indexToElasticsearch(logData);
  }
}
