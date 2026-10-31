import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'plans', version: '1' })
export class PlansController {}
@Module({ controllers: [PlansController] })
export class PlansModule {}
