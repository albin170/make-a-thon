import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomersService, CreateCustomerDto } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * GET /v1/customers
   * List all customers with pagination/filtering (ADMIN, STAFF only)
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List all customers (ADMIN, STAFF)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'currency', required: false, type: String })
  listCustomers(
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customersService.listCustomers(query);
  }

  /**
   * POST /v1/customers
   * Create a new customer (ADMIN, STAFF only)
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new customer (ADMIN, STAFF)' })
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.customersService.createCustomer(dto);
  }

  /**
   * GET /v1/customers/:id
   * Get a single customer. ADMIN/STAFF can get any; CUSTOMER can only get their own record.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get a customer by ID' })
  async getCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const { user } = req;

    if (user.role === UserRole.CUSTOMER) {
      // Verify the CUSTOMER owns this customer record
      const ownRecord = await this.customersService.getCustomerByUserId(user.id);
      if (!ownRecord || ownRecord.id !== id) {
        throw new ForbiddenException('You do not have access to this customer record');
      }
    }

    return this.customersService.getCustomer(id);
  }

  /**
   * PATCH /v1/customers/:id
   * Update a customer record (ADMIN, STAFF only)
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a customer (ADMIN, STAFF)' })
  updateCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(id, dto);
  }
}
