import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'customers', version: '1' })
export class CustomersController {}
@Module({ controllers: [CustomersController] })
export class CustomersModule {}
