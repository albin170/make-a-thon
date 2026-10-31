// Billing Engine — Bull worker for recurring subscription billing.
// Enforces idempotency: each (subscriptionId, periodKey) pair produces exactly one invoice.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
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
    // and that have not ended yet (plan expiry respected).
    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: { plan: true },
      take: 500, // bounded batch
    });

    this.logger.log(`Found ${dueSubscriptions.length} due subscriptions.`);
    if (dueSubscriptions.length === 0) return;

    // Create a billing run record
    const run = await this.prisma.billingRun.create({
      data: {
        id: uuidv4(),
        runDate: now,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    let enqueued = 0;
    for (const sub of dueSubscriptions) {
      const periodKey = this.derivePeriodKey(sub.id, sub.nextBillingDate!);

      // Claim the billing period atomically: the unique periodKey doubles as
      // the claim marker, so a concurrent scheduler run that lost the race
      // simply fails the create and skips.
      try {
        await this.prisma.billingPeriod.create({
          data: {
            id: uuidv4(),
            subscriptionId: sub.id,
            billingRunId: run.id,
            periodKey,
            periodStart: sub.nextBillingDate!,
            periodEnd: this.nextBillingDate(
              sub.nextBillingDate!,
              sub.plan.billingInterval,
              sub.plan.intervalCount,
            ),
            status: 'PENDING',
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          this.logger.warn(`Period ${periodKey} already claimed — skipping.`);
          continue;
        }
        throw err;
      }

      await this.billingQueue.add(
        'process-billing-period',
        { subscriptionId: sub.id, periodKey, billingRunId: run.id },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: periodKey, // queue-level deduplication
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
      enqueued++;
    }

    // If every sub was already claimed (cron raced with a manual trigger),
    // there is nothing to process — do not leave a stuck PROCESSING run.
    if (enqueued === 0) {
      await this.prisma.billingRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return;
    }

    this.logger.log(`Enqueued ${enqueued} billing jobs for run ${run.id}`);
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
