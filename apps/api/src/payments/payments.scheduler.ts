import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sweepOverdueInvoices() {
    this.logger.log('Overdue sweep: checking for past-due invoices...');
    const { swept } = await this.paymentsService.sweepOverdue();
    if (swept > 0) this.logger.log(`Overdue sweep marked ${swept} invoice(s) OVERDUE`);
  }
}
