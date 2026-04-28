import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('API Version')
@Controller({ path: 'api-version', version: VERSION_NEUTRAL })
export class ApiVersionController {
  @Get()
  @ApiOperation({ summary: 'Get current and supported API versions' })
  @ApiResponse({ status: 200, description: 'API version metadata' })
  getApiVersion() {
    const current = process.env.API_VERSION || 'v1';
    return {
      current,
      supported: [current],
      deprecated: [],
      buildInfo: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }
}
