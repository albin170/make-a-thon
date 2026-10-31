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
import { SubscriptionsService } from './subscriptions.service';
import { CustomerOwnershipService } from '../common/authorization/customer-ownership.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionActionDto } from './dto/subscription-action.dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly ownership: CustomerOwnershipService,
  ) {}

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Create a new subscription' })
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.createSubscription(dto);
  }

  @Get()
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'List subscriptions (filtered by customer for CUSTOMER role)' })
  async findAll(@Query() query: any, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      query.customerId = await this.ownership.getCustomerIdForUser(req.user.id);
    }
    return this.subscriptionsService.listSubscriptions(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Get subscription details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsSubscription(req.user.id, id);
    }
    return this.subscriptionsService.getSubscription(id);
  }

  @Patch(':id/activate')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Activate a draft subscription' })
  activate(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.subscriptionsService.activateSubscription(id, req.user?.id);
  }

  @Patch(':id/pause')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Pause an active subscription' })
  async pause(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubscriptionActionDto,
    @Request() req: any,
  ) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsSubscription(req.user.id, id);
    }
    return this.subscriptionsService.pauseSubscription(id, dto.reason || 'Customer requested pause', req.user?.id);
  }

  @Patch(':id/resume')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Resume a paused subscription' })
  async resume(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsSubscription(req.user.id, id);
    }
    return this.subscriptionsService.resumeSubscription(id, req.user?.id);
  }

  @Patch(':id/close')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Close a subscription early' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubscriptionActionDto,
    @Request() req: any,
  ) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsSubscription(req.user.id, id);
    }
    return this.subscriptionsService.closeSubscription(id, dto.reason || 'Customer requested closure', req.user?.id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Schedule cancellation at the current billing period end' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubscriptionActionDto,
    @Request() req: any,
  ) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsSubscription(req.user.id, id);
    }
    return this.subscriptionsService.cancelSubscription(id, dto.reason, req.user?.id);
  }

  @Patch(':id/cancel/reverse')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  @ApiOperation({ summary: 'Reverse a pending subscription cancellation' })
  async reverseCancellation(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (req.user.role === 'CUSTOMER') {
      await this.ownership.assertCustomerOwnsSubscription(req.user.id, id);
    }
    return this.subscriptionsService.reverseCancellation(id, req.user?.id);
  }
}

