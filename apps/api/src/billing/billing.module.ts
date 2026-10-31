import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingScheduler } from './billing.scheduler';
import { BillingWorker } from './billing.worker';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: () => ({ redis: process.env.REDIS_URL || 'redis://localhost:6379' }),
    }),
    BullModule.registerQueue({ name: 'billing' }),
  ],
  controllers: [BillingController],
  providers: [BillingScheduler, BillingWorker, BillingService],
  exports: [BillingService],
})
export class BillingModule {}

