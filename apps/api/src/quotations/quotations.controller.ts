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
import { QuotationsService } from './quotations.service';

@ApiTags('quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'quotations', version: '1' })
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) { }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a new quotation' })
  create(@Body() dto: any) {
    return this.quotationsService.createQuotation(dto);
  }

  @Get()
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'List quotations (filtered by customer for CUSTOMER role)' })
  findAll(@Query() query: any, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      query.customerId = req.user.customerId || req.user.id;
    }
    return this.quotationsService.listQuotations(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Get quotation details by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.getQuotation(id);
  }

  @Patch(':id/send')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Send quotation to customer (DRAFT -> SENT)' })
  send(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.sendQuotation(id);
  }

  @Patch(':id/accept')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Accept quotation and convert to draft subscription' })
  accept(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.quotationsService.acceptQuotation(id, req.user?.id);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Reject quotation' })
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.rejectQuotation(id);
  }
}

