import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'invoices', version: '1' })
export class InvoicesController {}
@Module({ controllers: [InvoicesController] })
export class InvoicesModule {}
