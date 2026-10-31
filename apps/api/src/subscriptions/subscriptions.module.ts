import { Module } from '@nestjs/common';
import { Controller } from '@nestjs/common';
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {}
@Module({ controllers: [SubscriptionsController] })
export class SubscriptionsModule {}
