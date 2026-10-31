import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanStatus } from '@prisma/client';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List plans (filtered by active status for CUSTOMER role)' })
  listPlans(
    @Query() query: ListPlansQueryDto,
    @Request() req: any,
  ) {
    if (req?.user?.role === 'CUSTOMER') {
      query.status = PlanStatus.ACTIVE;
    }
    return this.plansService.listPlans(query);
  }

  @Get('catalogue')
  @ApiOperation({ summary: 'Customer-facing active plan catalogue' })
  getCatalogue(@Query() query: ListPlansQueryDto) {
    query.status = PlanStatus.ACTIVE;
    return this.plansService.listPlans(query);
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription plan (Admin only)' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan details by ID' })
  getPlan(@Param('id') id: string) {
    return this.plansService.getPlan(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update plan configuration (Admin only)' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.updatePlan(id, dto);
  }

  @Patch(':id/publish')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Publish a subscription plan (Admin only)' })
  publishPlan(@Param('id') id: string) {
    return this.plansService.updatePlanStatus(id, PlanStatus.ACTIVE);
  }

  @Patch(':id/unpublish')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Unpublish/draft a subscription plan (Admin only)' })
  unpublishPlan(@Param('id') id: string) {
    return this.plansService.updatePlanStatus(id, PlanStatus.INACTIVE);
  }

  @Patch(':id/archive')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Archive a subscription plan (Admin only)' })
  archivePlan(@Param('id') id: string) {
    return this.plansService.updatePlanStatus(id, PlanStatus.ARCHIVED);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate / archive a plan (Admin only)' })
  deactivatePlan(@Param('id') id: string) {
    return this.plansService.deactivatePlan(id);
  }
}
