import {
  Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('runs')
  @ApiOperation({ summary: 'List billing runs' })
  listRuns(@Query() q: { page?: number; limit?: number }) {
    return this.billingService.listRuns(q);
  }

  @Get('runs/:id')
  getRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.getRun(id);
  }

  @Post('trigger')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually trigger billing run' })
  triggerRun() {
    return this.billingService.triggerManualRun();
  }
}
