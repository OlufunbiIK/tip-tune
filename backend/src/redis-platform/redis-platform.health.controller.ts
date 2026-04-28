import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RedisPlatformService } from './redis-platform.service';

@ApiTags('Redis Platform Health')
@Controller({ path: 'redis-platform/health', version: VERSION_NEUTRAL })
export class RedisPlatformHealthController {
  constructor(private readonly redisService: RedisPlatformService) {}

  @Get()
  @ApiOperation({ summary: 'Check Redis platform health' })
  @ApiResponse({ status: 200, description: 'Redis health status' })
  async getHealth() {
    return this.redisService.healthCheck();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get Redis platform metrics' })
  @ApiResponse({ status: 200, description: 'Redis metrics and statistics' })
  async getMetrics() {
    return this.redisService.getMetrics();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Redis platform connection status' })
  @ApiResponse({ status: 200, description: 'Redis connection status' })
  async getStatus() {
    return {
      status: this.redisService.getStatus(),
      ready: this.redisService.isReady(),
    };
  }
}
