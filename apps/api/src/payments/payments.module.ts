import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {}
@Module({ controllers: [PaymentsController] })
export class PaymentsModule {}
