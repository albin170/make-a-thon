import { Injectable } from '@nestjs/common';
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
} from 'date-fns';

export type BillingIntervalType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

@Injectable()
export class RecurrenceEngine {
  /**
   * Calculates the deterministic next billing date given an interval and step count.
   * Uses date-fns to handle month-end bounds and leap years correctly.
   */
  calculateNextBillingDate(
    startDate: Date,
    interval: string,
    intervalCount: number = 1,
  ): Date {
    const normalizedInterval = (interval || 'MONTHLY').toUpperCase();
    const count = Number(intervalCount) || 1;

    switch (normalizedInterval) {
      case 'DAILY':
        return addDays(startDate, count);
      case 'WEEKLY':
        return addWeeks(startDate, count);
      case 'MONTHLY':
        return addMonths(startDate, count);
      case 'YEARLY':
        return addYears(startDate, count);
      default:
        return addMonths(startDate, count);
    }
  }

  /**
   * Generates a deterministic idempotency key for a subscription billing period.
   * Format: `${subscriptionId}::${YYYY-MM-DD}`
   */
  derivePeriodKey(subscriptionId: string, billingDate: Date): string {
    return `${subscriptionId}::${format(billingDate, 'yyyy-MM-dd')}`;
  }
}
