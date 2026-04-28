import { Module } from '@nestjs/common';
import { ApiVersionController } from './api-version.controller';

@Module({
  controllers: [ApiVersionController],
})
export class ApiVersionModule {}
