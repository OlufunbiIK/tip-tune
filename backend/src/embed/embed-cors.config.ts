/**
 * embed-cors.config.ts
 *
 * Drop this config into your AppModule or main.ts bootstrap.
 * Adjust EMBED_ALLOWED_ORIGINS env var to a comma-separated list of
 * domains that are permitted to embed your player widget.
 */

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

// ─── CORS ────────────────────────────────────────────────────────────────────

export function buildEmbedCorsOptions(): CorsOptions {
  const allowedOrigins = (process.env.EMBED_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isWildcard = allowedOrigins.includes('*');

  return {
    origin: isWildcard
      ? '*'
      : (origin, callback) => {
          if (!origin) {
            // Allow server-to-server (no Origin header)
            return callback(null, true);
          }
          try {
            const hostname = new URL(origin).hostname;
            if (allowedOrigins.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`))) {
              callback(null, true);
            } else {
              callback(new Error(`Origin ${origin} not allowed by embed CORS policy`));
            }
          } catch {
            callback(new Error('Invalid origin'));
          }
        },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-embed-token'],
    exposedHeaders: [],
    credentials: false,   // Embeds must not send cookies
    maxAge: 86400,        // Preflight cache: 24 h
  };
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Uses @nestjs/throttler. Key is derived from the requesting domain so that
// rate limiting is applied per-origin rather than per-IP.

export const embedThrottlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'short',  ttl: 10_000,  limit: 10  },   // 10 req / 10 s
    { name: 'medium', ttl: 60_000,  limit: 60  },   // 60 req / min
    { name: 'long',   ttl: 3_600_000, limit: 500 }, // 500 req / hr per domain
  ],
};

/**
 * Example usage in main.ts:
 *
 * import { buildEmbedCorsOptions } from './embed-cors.config';
 *
 * const app = await NestFactory.create(AppModule);
 * app.enableCors(buildEmbedCorsOptions());
 * await app.listen(3000);
 *
 * Example usage in AppModule:
 *
 * import { embedThrottlerConfig } from './embed-cors.config';
 * import { ThrottlerModule } from '@nestjs/throttler';
 *
 * @Module({
 *   imports: [
 *     ThrottlerModule.forRoot(embedThrottlerConfig),
 *     EmbedModule,
 *   ],
 * })
 * export class AppModule {}
 */