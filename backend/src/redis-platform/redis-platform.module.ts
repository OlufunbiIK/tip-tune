import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PLATFORM_CLIENT = 'REDIS_PLATFORM_CLIENT';
export const REDIS_PLATFORM_OPTIONS = 'REDIS_PLATFORM_OPTIONS';

export interface RedisPlatformOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

@Global()
@Module({})
export class RedisPlatformModule {
  private static readonly logger = new Logger(RedisPlatformModule.name);

  static forRoot(options: RedisPlatformOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: REDIS_PLATFORM_OPTIONS,
      useValue: options,
    };

    const clientProvider: Provider = {
      provide: REDIS_PLATFORM_CLIENT,
      useFactory: () => RedisPlatformModule.createClient(options),
    };

    return {
      module: RedisPlatformModule,
      imports: [],
      providers: [optionsProvider, clientProvider],
      exports: [REDIS_PLATFORM_CLIENT, REDIS_PLATFORM_OPTIONS],
    };
  }

  static forRootAsync(): DynamicModule {
    const clientProvider: Provider = {
      provide: REDIS_PLATFORM_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const options: RedisPlatformOptions = {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
          keyPrefix: config.get<string>('REDIS_KEY_PREFIX', 'tip-tune:'),
          connectTimeout: config.get<number>('REDIS_CONNECT_TIMEOUT', 5_000),
          maxRetriesPerRequest: config.get<number>('REDIS_MAX_RETRIES', 3),
          enableReadyCheck: true,
          lazyConnect: false,
        };
        return RedisPlatformModule.createClient(options);
      },
    };

    return {
      module: RedisPlatformModule,
      imports: [ConfigModule],
      providers: [clientProvider],
      exports: [REDIS_PLATFORM_CLIENT],
    };
  }

  private static createClient(options: RedisPlatformOptions): Redis {
    const client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: options.db ?? 0,
      keyPrefix: options.keyPrefix ?? '',
      connectTimeout: options.connectTimeout ?? 5_000,
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
      enableReadyCheck: options.enableReadyCheck ?? true,
      lazyConnect: options.lazyConnect ?? false,
    });

    // Enhanced logging and monitoring
    client.on('connect', () =>
      RedisPlatformModule.logger.log(`Redis platform connected → ${options.host}:${options.port}`),
    );

    client.on('ready', () =>
      RedisPlatformModule.logger.log('Redis platform client ready'),
    );

    client.on('error', (err: Error) =>
      RedisPlatformModule.logger.error(`Redis platform error: ${err.message}`, err.stack),
    );

    client.on('close', () =>
      RedisPlatformModule.logger.warn('Redis platform connection closed'),
    );

    client.on('reconnecting', (delay: number) =>
      RedisPlatformModule.logger.warn(`Redis platform reconnecting in ${delay}ms`),
    );

    // Health check and metrics
    client.on('connect', async () => {
      try {
        const info = await client.info('server');
        RedisPlatformModule.logger.debug('Redis server info:', info);
      } catch (err) {
        RedisPlatformModule.logger.warn('Failed to get Redis info:', err);
      }
    });

    return client;
  }
}
