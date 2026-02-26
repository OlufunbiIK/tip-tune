import { Controller, Get, Query, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { RateLimitMetricsService } from '../services/rate-limit-metrics.service';

@ApiTags('Rate Limit Metrics')
@Controller('admin/rate-limits')
@SkipThrottle() // Admin endpoints should not be rate limited
export class RateLimitMetricsController {
  constructor(private readonly metricsService: RateLimitMetricsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get overall rate limit metrics' })
  @ApiResponse({
    status: 200,
    description: 'Overall rate limit statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        rateLimited: { type: 'number' },
        rateLimitedPercentage: { type: 'string' },
      },
    },
  })
  getMetrics() {
    return this.metricsService.getMetrics();
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'Get rate limit metrics by endpoint' })
  @ApiQuery({ name: 'endpoint', required: false, description: 'Specific endpoint to query' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit statistics by endpoint',
  })
  getEndpointMetrics(@Query('endpoint') endpoint?: string) {
    return this.metricsService.getEndpointMetrics(endpoint);
  }

  @Get('top-ips')
  @ApiOperation({ summary: 'Get top rate-limited IP addresses' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of IPs to return (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Top rate-limited IP addresses',
  })
  getTopRateLimitedIps(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.metricsService.getTopRateLimitedIps(limitNum);
  }

  @Get('suspicious-ips')
  @ApiOperation({ summary: 'Get suspicious IP addresses (potential abusers)' })
  @ApiQuery({ 
    name: 'threshold', 
    required: false, 
    type: Number, 
    description: 'Percentage threshold (0-1, default: 0.5)' 
  })
  @ApiResponse({
    status: 200,
    description: 'IP addresses with high rate limit hit rate',
  })
  getSuspiciousIps(@Query('threshold') threshold?: string) {
    const thresholdNum = threshold ? parseFloat(threshold) : 0.5;
    return this.metricsService.getSuspiciousIps(thresholdNum);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get rate limit metrics summary' })
  @ApiResponse({
    status: 200,
    description: 'Formatted metrics summary',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
      },
    },
  })
  getMetricsSummary() {
    return {
      summary: this.metricsService.getMetricsSummary(),
    };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset rate limit metrics' })
  @ApiResponse({
    status: 200,
    description: 'Metrics reset successfully',
  })
  resetMetrics() {
    this.metricsService.resetMetrics();
    return {
      message: 'Rate limit metrics reset successfully',
    };
  }
}
