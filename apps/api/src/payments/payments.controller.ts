import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentMethod } from '@prisma/client';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List all payments (paginated)' })
  listPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('method') method?: PaymentMethod,
  ) {
    return this.paymentsService.listPayments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      customerId,
      dateFrom,
      dateTo,
      method,
    });
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Record a new payment' })
  recordPayment(
    @Body()
    body: {
      customerId: string;
      method: PaymentMethod;
      amount: string;
      currency?: string;
      paymentDate: string;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.paymentsService.recordPayment(body);
  }

  @Get('outstanding')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List confirmed invoices with outstanding balance (overdue flagged)' })
  listOutstanding() {
    return this.paymentsService.listOutstanding();
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Get payment by ID with allocations' })
  getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPayment(id);
  }

  @Post(':id/allocate')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Allocate payment amount to an invoice' })
  allocatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { invoiceId: string; amount: string; notes?: string },
  ) {
    return this.paymentsService.allocatePayment(
      id,
      body.invoiceId,
      body.amount,
      body.notes,
    );
  }

  @Post(':id/allocations/:allocationId/revoke')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Revoke an allocation (funds return to unallocated pool)' })
  revokeAllocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
  ) {
    return this.paymentsService.revokeAllocation(id, allocationId);
  }

  @Post('overdue/sweep')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Mark past-due confirmed invoices as OVERDUE' })
  sweepOverdue() {
    return this.paymentsService.sweepOverdue();
  }
}
