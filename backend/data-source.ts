import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env variables

/**
 * TypeORM DataSource for CLI (migrations).
 * Ensure .env is loaded (e.g. via `dotenv` or `nest start` env).
 *
 * Run migrations:
 *   npx typeorm-ts-node-commonjs migration:run -d data-source.ts
 *
 * Revert:
 *   npx typeorm-ts-node-commonjs migration:revert -d data-source.ts
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'tiptune',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, 'src/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/**/*{.ts,.js}')],
});
