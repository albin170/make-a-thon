import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DiscountsService } from './discounts.service';

@ApiTags('discounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'discounts', version: '1' })
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List discount rules' })
  findAll(@Query() query: any) {
    return this.discountsService.listDiscountRules(query);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create discount rule' })
  create(@Body() dto: any) {
    return this.discountsService.createDiscountRule(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update discount rule' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.discountsService.updateDiscountRule(id, dto);
  }

  @Post('validate')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Validate discount code and calculate discount' })
  validate(@Body() body: { code: string; subtotal: number; subscriptionId?: string }) {
    return this.discountsService.validateAndConsume(body.code, body.subtotal, body.subscriptionId);
  }
}

