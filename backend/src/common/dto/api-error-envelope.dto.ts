import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorEnvelope {
  @ApiProperty({ description: 'Error status code', example: 404 })
  statusCode: number;

  @ApiProperty({ description: 'HTTP status name', example: 'Not Found' })
  error: string;

  @ApiProperty({ description: 'Human-readable error message', example: 'Resource not found' })
  message: string | string[];

  @ApiPropertyOptional({ description: 'Detailed error information (development only)', example: 'Stack trace or additional context' })
  details?: any;

  @ApiPropertyOptional({ description: 'Unique error ID for tracking', example: 'err_abc123xyz' })
  errorId?: string;

  @ApiPropertyOptional({ description: 'Timestamp when error occurred', example: '2024-01-15T10:30:00.000Z' })
  timestamp?: string;

  @ApiPropertyOptional({ description: 'API path where error occurred', example: '/api/v1/tracks/123' })
  path?: string;

  constructor(partial: Partial<ApiErrorEnvelope>) {
    Object.assign(this, partial);
  }
}
