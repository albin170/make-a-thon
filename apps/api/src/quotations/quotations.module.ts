import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'quotations', version: '1' })
export class QuotationsController {}
@Module({ controllers: [QuotationsController] })
export class QuotationsModule {}
