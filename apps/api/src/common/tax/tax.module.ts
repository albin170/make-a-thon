import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'taxes', version: '1' })
export class TaxController {}
@Module({ controllers: [TaxController] })
export class TaxModule {}
