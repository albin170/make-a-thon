import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API liveness' })
  check() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
