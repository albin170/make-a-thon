import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsScheduler } from './payments.scheduler';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsScheduler],
  exports: [PaymentsService],
})
export class PaymentsModule {}
