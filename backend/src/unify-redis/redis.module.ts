import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_OPTIONS, RedisModuleOptions } from './redis.constants';

@Global()
@Module({})
export class RedisModule {
  private static readonly logger = new Logger(RedisModule.name);

  /**
   * Register the module synchronously. Preferred in AppModule where
   * ConfigService is already available via forRootAsync below, but handy
   * for tests that want a pre-built options object.
   */
  static forRoot(options: RedisModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: REDIS_OPTIONS,
      useValue: options,
    };

    const clientProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: () => RedisModule.createClient(options),
    };

    return {
      module: RedisModule,
      imports: [],
      providers: [optionsProvider, clientProvider],
      exports: [REDIS_CLIENT, REDIS_OPTIONS],
    };
  }

  /**
   * Register the module asynchronously — used in the real AppModule so that
   * the options are resolved from ConfigService after the environment is loaded.
   */
  static forRootAsync(): DynamicModule {
    const clientProvider: Provider = {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const options: RedisModuleOptions = {
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
        return RedisModule.createClient(options);
      },
    };

    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [clientProvider],
      exports: [REDIS_CLIENT],
    };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private static createClient(options: RedisModuleOptions): Redis {
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

    client.on('connect', () =>
      RedisModule.logger.log(`Redis connected → ${options.host}:${options.port}`),
    );

    client.on('ready', () =>
      RedisModule.logger.log('Redis client ready'),
    );

    client.on('error', (err: Error) =>
      RedisModule.logger.error(`Redis error: ${err.message}`, err.stack),
    );

    client.on('close', () =>
      RedisModule.logger.warn('Redis connection closed'),
    );

    client.on('reconnecting', (delay: number) =>
      RedisModule.logger.warn(`Redis reconnecting in ${delay}ms`),
    );

    return client;
  }
}
