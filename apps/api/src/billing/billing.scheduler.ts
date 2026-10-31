// Billing Engine — BullMQ worker for recurring subscription billing.
// Enforces idempotency: each (subscriptionId, periodKey) pair produces exactly one invoice.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  addDays, addWeeks, addMonths, addYears,
  format, startOfDay,
} from 'date-fns';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('billing') private readonly billingQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleDueSubscriptions() {
    this.logger.log('Billing scheduler: checking for due subscriptions...');

    const now = startOfDay(new Date());

    // Find active subscriptions whose next billing date is today or earlier
    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: now },
      },
      include: { plan: true },
      take: 500, // bounded batch
    });

    this.logger.log(`Found ${dueSubscriptions.length} due subscriptions.`);

    // Create a billing run record
    const run = await this.prisma.billingRun.create({
      data: {
        id: require('uuid').v4(),
        runDate: now,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    for (const sub of dueSubscriptions) {
      const periodKey = this.derivePeriodKey(sub.id, sub.nextBillingDate!);

      // Check idempotency: skip if this period is already claimed
      const existing = await this.prisma.billingPeriod.findUnique({
        where: { periodKey },
      });
      if (existing) {
        this.logger.warn(`Period ${periodKey} already exists — skipping.`);
        continue;
      }

      // Claim the billing period
      await this.prisma.billingPeriod.create({
        data: {
          id: require('uuid').v4(),
          subscriptionId: sub.id,
          billingRunId: run.id,
          periodKey,
          periodStart: sub.nextBillingDate!,
          periodEnd: this.nextBillingDate(sub.nextBillingDate!, sub.plan.billingInterval, sub.plan.intervalCount),
          status: 'PENDING',
        },
      });

      await this.billingQueue.add(
        'process-billing-period',
        { subscriptionId: sub.id, periodKey, billingRunId: run.id },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: periodKey, // BullMQ deduplication
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    }

    this.logger.log(`Enqueued billing jobs for run ${run.id}`);
  }

  derivePeriodKey(subscriptionId: string, billingDate: Date): string {
    return `${subscriptionId}::${format(billingDate, 'yyyy-MM-dd')}`;
  }

  nextBillingDate(current: Date, interval: string, count: number): Date {
    switch (interval) {
      case 'DAILY':   return addDays(current, count);
      case 'WEEKLY':  return addWeeks(current, count);
      case 'MONTHLY': return addMonths(current, count);
      case 'YEARLY':  return addYears(current, count);
      default:        return addMonths(current, count);
    }
  }
}
