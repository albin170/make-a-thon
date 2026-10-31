import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { TaxService } from './tax.service';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './dto/tax-rule.dto';

@ApiTags('taxes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'taxes', version: '1' })
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'List tax rules' })
  findAll(@Query() query: any) {
    return this.taxService.listTaxRules(query);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create tax rule' })
  create(@Body() dto: CreateTaxRuleDto) {
    return this.taxService.createTaxRule(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update tax rule' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaxRuleDto) {
    return this.taxService.updateTaxRule(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate tax rule' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxService.deactivateTaxRule(id);
  }
}

