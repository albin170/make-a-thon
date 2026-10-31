import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get core dashboard metrics' })
  getDashboard() {
    return this.reportsService.getDashboardMetrics();
  }

  @Get('revenue-by-period')
  @ApiOperation({ summary: 'Get revenue by period' })
  getRevenueByPeriod(@Query('dateFrom') from?: string, @Query('dateTo') to?: string) {
    return this.reportsService.getRevenueByPeriod(from, to);
  }

  @Get('invoice-aging')
  @ApiOperation({ summary: 'Get invoice aging summary' })
  getInvoiceAging() {
    return this.reportsService.getInvoiceAging();
  }

  @Get('subscription-growth')
  @ApiOperation({ summary: 'Get subscription growth' })
  getSubscriptionGrowth() {
    return this.reportsService.getSubscriptionGrowth();
  }
}

