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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, UserStatus } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /v1/users/staff
   * Create a new STAFF account (ADMIN only)
   */
  @Post('staff')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a staff account (ADMIN only)' })
  createStaffAccount(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaffAccount(dto);
  }
  
  /**
   * POST /v1/users
   * Create a new ADMIN or STAFF account (ADMIN only)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create an admin or staff user (ADMIN only)" })
  createUserAccount(@Body() dto: CreateUserDto) {
    return this.usersService.createUserAccount(dto);
  }

  /**
   * GET /v1/users
   * List all users with pagination/filtering (ADMIN only)
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  listUsers(
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.listUsers(query);
  }

  /**
   * GET /v1/users/:id
   * Get a single user. ADMIN can get any. STAFF can only get their own profile.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a user by ID (ADMIN or own STAFF profile)' })
  getUser(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const { user } = req;
    if (user.role === UserRole.STAFF && user.id !== id) {
      throw new ForbiddenException('STAFF users may only view their own profile');
    }
    return this.usersService.getUser(id);
  }

  /**
   * PATCH /v1/users/:id
   * Update a user (ADMIN only)
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user (ADMIN only)' })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }
}
