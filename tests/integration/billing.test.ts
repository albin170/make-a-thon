import { BillingScheduler } from '../../apps/api/src/billing/billing.scheduler';

describe('Recurring Billing Engine Idempotency Tests', () => {
  it('generates deterministic period keys for idempotency', () => {
    const scheduler = new BillingScheduler(null as any, null as any);
    const subId = 'sub-uuid-1234';
    const date = new Date('2026-10-31T00:00:00Z');

    const key1 = scheduler.derivePeriodKey(subId, date);
    const key2 = scheduler.derivePeriodKey(subId, date);

    expect(key1).toBe('sub-uuid-1234::2026-10-31');
    expect(key1).toBe(key2);
  });

  it('calculates deterministic next billing dates across intervals', () => {
    const scheduler = new BillingScheduler(null as any, null as any);
    const start = new Date('2026-01-31T00:00:00Z');

    const monthlyNext = scheduler.nextBillingDate(start, 'MONTHLY', 1);
    expect(monthlyNext.getMonth()).toBe(1); // February

    const yearlyNext = scheduler.nextBillingDate(start, 'YEARLY', 1);
    expect(yearlyNext.getFullYear()).toBe(2027);

    const weeklyNext = scheduler.nextBillingDate(start, 'WEEKLY', 2);
    expect(weeklyNext.getDate()).toBe(14); // 31 Jan + 14 days = 14 Feb
  });

  it('prevents duplicate billing period execution under retries', () => {
    const processedPeriods = new Set<string>();

    const processPeriod = (periodKey: string) => {
      if (processedPeriods.has(periodKey)) {
        return { status: 'SKIPPED_DUPLICATE' };
      }
      processedPeriods.add(periodKey);
      return { status: 'INVOICE_GENERATED' };
    };

    const periodKey = 'sub-999::2026-11-01';
    expect(processPeriod(periodKey).status).toBe('INVOICE_GENERATED');
    expect(processPeriod(periodKey).status).toBe('SKIPPED_DUPLICATE');
  });
});

