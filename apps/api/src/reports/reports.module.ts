import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'reports', version: '1' })
export class ReportsController {}
@Module({ controllers: [ReportsController] })
export class ReportsModule {}
