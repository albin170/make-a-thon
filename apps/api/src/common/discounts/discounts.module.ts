import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'discounts', version: '1' })
export class DiscountsController {}
@Module({ controllers: [DiscountsController] })
export class DiscountsModule {}
