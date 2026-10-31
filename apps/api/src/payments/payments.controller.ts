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
}
