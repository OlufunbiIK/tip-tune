import { Module } from '@nestjs/common';
import { TerminusModule, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { StellarHealthIndicator } from './stellar-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [TypeOrmHealthIndicator, StellarHealthIndicator],
})
export class HealthModule {}
