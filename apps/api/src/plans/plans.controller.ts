import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanStatus } from '@prisma/client';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  listPlans(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: PlanStatus,
  ) {
    return this.plansService.listPlans({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
    });
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Body() dto: any) {
    return this.plansService.createPlan(dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  getPlan(@Param('id') id: string) {
    return this.plansService.getPlan(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  updatePlan(@Param('id') id: string, @Body() dto: any) {
    return this.plansService.updatePlan(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  deactivatePlan(@Param('id') id: string) {
    return this.plansService.deactivatePlan(id);
  }
}
