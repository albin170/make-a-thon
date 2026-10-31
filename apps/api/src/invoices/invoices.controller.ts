import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';
import { CustomerOwnershipService } from '../common/authorization/customer-ownership.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'invoices', version: '1' })
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly ownership: CustomerOwnershipService,
  ) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a new invoice' })
  create(@Body() dto: any) {
    return this.invoicesService.createInvoice(dto);
  }

  @Get()
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'List invoices (filtered by customer for CUSTOMER role)' })
  async findAll(@Query() query: any, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      query.customerId = await this.ownership.getCustomerIdForUser(req.user.id);
    }
    return this.invoicesService.listInvoices(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsInvoice(req.user.id, id);
    }
    return this.invoicesService.getInvoice(id);
  }

  @Patch(':id/confirm')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Confirm a draft invoice' })
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.confirmInvoice(id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Cancel an invoice' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.cancelInvoice(id);
  }

  @Post(':id/generate-pdf')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Trigger invoice PDF generation' })
  async generatePdf(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsInvoice(req.user.id, id);
    }
    return this.invoicesService.generatePdf(id);
  }

  @Post(':id/send')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Queue invoice email delivery' })
  send(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.invoicesService.sendInvoice(id, req.user?.id);
  }
}

