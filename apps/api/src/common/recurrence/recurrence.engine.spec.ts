import { RecurrenceEngine } from './recurrence.engine';

describe('RecurrenceEngine', () => {
  let engine: RecurrenceEngine;

  beforeEach(() => {
    engine = new RecurrenceEngine();
  });

  it('calculates DAILY intervals accurately', () => {
    const start = new Date(2026, 0, 15); // Jan 15, 2026
    const next = engine.calculateNextBillingDate(start, 'DAILY', 5);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(20);
  });

  it('calculates WEEKLY intervals accurately', () => {
    const start = new Date(2026, 0, 1); // Jan 1, 2026
    const next = engine.calculateNextBillingDate(start, 'WEEKLY', 2);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(15);
  });

  it('calculates MONTHLY intervals with month-end date clamping', () => {
    const start = new Date(2026, 0, 31); // Jan 31, 2026 (non-leap year)
    const next = engine.calculateNextBillingDate(start, 'MONTHLY', 1);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(28); // Clamped to Feb 28
  });

  it('calculates YEARLY intervals accurately', () => {
    const start = new Date(2026, 5, 1); // June 1, 2026
    const next = engine.calculateNextBillingDate(start, 'YEARLY', 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(1);
  });

  it('derives a consistent idempotency key for periods', () => {
    const date = new Date(2026, 9, 31);
    const key = engine.derivePeriodKey('sub-12345', date);
    expect(key).toBe('sub-12345::2026-10-31');
  });
});
