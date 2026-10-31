// Stub modules — these will be filled in by the backend subagent.
// Placing minimal exports here so the app compiles while subagents complete their work.

import { Module } from '@nestjs/common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller({ path: 'users', version: '1' })
export class UsersController {}

@Module({ controllers: [UsersController] })
export class UsersModule {}
