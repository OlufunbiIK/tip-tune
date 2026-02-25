import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('version')
@Controller({ path: 'version', version: VERSION_NEUTRAL })
export class VersionController {
  @Get()
  @ApiOperation({ summary: 'Get current and supported API versions' })
  @ApiResponse({ status: 200, description: 'API version metadata' })
  getVersion() {
    const current = process.env.API_VERSION || 'v1';
    return {
      current,
      supported: [current],
      deprecated: [],
    };
  }
}
