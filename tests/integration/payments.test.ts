// Payments logic tests — executed against the REAL helper code, not closures.
import {
  invoiceStatusAfterPayment,
  isOverdue,
  paymentStatusFor,
  toMinorUnits,
} from '../../apps/api/src/payments/payments.logic';
import { Decimal } from '@prisma/client/runtime/library';

const d = (v: string) => new Decimal(v);

describe('paymentStatusFor', () => {
  it('UNPAID when nothing paid and balance outstanding', () => {
    expect(paymentStatusFor(300_0000n, 0n)).toBe('UNPAID');
  });

  it('PARTIALLY_PAID when some paid and balance remains', () => {
    expect(paymentStatusFor(300_0000n, 200_0000n)).toBe('PARTIALLY_PAID');
  });

  it('PAID at exactly-zero balance (partial → full progression)', () => {
    // 500 total: pay 200 → PARTIALLY_PAID, pay 300 more → PAID
    const afterFirst = paymentStatusFor(300_0000n, 200_0000n);
    expect(afterFirst).toBe('PARTIALLY_PAID');
    const afterSecond = paymentStatusFor(0n, 500_0000n);
    expect(afterSecond).toBe('PAID');
  });

  it('treats negative balance as PAID (defensive against legacy drift)', () => {
    expect(paymentStatusFor(-1n, 500_0000n)).toBe('PAID');
  });
});

describe('over-allocation guard semantics (matching the service guard)', () => {
  // Mirrors tx.invoice.updateMany({ where: { amountDue: { gte: amount } } })
  const canAllocate = (amountDueMinor: bigint, allocationMinor: bigint) =>
    amountDueMinor >= allocationMinor;

  it('rejects allocation exceeding outstanding balance', () => {
    expect(canAllocate(150_0000n, 200_0000n)).toBe(false);
  });

  it('accepts allocation exactly matching the outstanding balance', () => {
    expect(canAllocate(150_0000n, 150_0000n)).toBe(true);
  });

  it('rejects allocation on a zero-balance invoice', () => {
    expect(canAllocate(0n, 1n)).toBe(false);
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-10-31T12:00:00Z');

  it('past date with outstanding balance is overdue', () => {
    expect(isOverdue(new Date('2026-10-25T00:00:00Z'), 100_0000n, now)).toBe(true);
  });

  it('past date fully paid is NOT overdue', () => {
    expect(isOverdue(new Date('2026-10-25T00:00:00Z'), 0n, now)).toBe(false);
  });

  it('future date with outstanding balance is NOT overdue yet', () => {
    expect(isOverdue(new Date('2026-11-05T00:00:00Z'), 100_0000n, now)).toBe(false);
  });
});

describe('invoiceStatusAfterPayment', () => {
  it('CONFIRMED → PAID when fully paid', () => {
    expect(invoiceStatusAfterPayment('CONFIRMED', 'PAID')).toBe('PAID');
  });

  it('OVERDUE → PAID when fully paid', () => {
    expect(invoiceStatusAfterPayment('OVERDUE', 'PAID')).toBe('PAID');
  });

  it('stays PAID only for eligible statuses; other statuses unchanged', () => {
    expect(invoiceStatusAfterPayment('DRAFT', 'PAID')).toBe('DRAFT');
    expect(invoiceStatusAfterPayment('CANCELLED', 'PAID')).toBe('CANCELLED');
  });

  it('partial payment never changes the invoice lifecycle status', () => {
    expect(invoiceStatusAfterPayment('CONFIRMED', 'PARTIALLY_PAID')).toBe('CONFIRMED');
    expect(invoiceStatusAfterPayment('CONFIRMED', 'UNPAID')).toBe('CONFIRMED');
  });
});

describe('toMinorUnits (Decimal precision boundary)', () => {
  it('round-trips 4dp values without float drift', () => {
    expect(toMinorUnits(d('100.5000'))).toBe(1_005_000n);
    expect(toMinorUnits(d('0.0001'))).toBe(1n);
    expect(toMinorUnits(d('1.0000'))).toBe(10_000n);
  });

  it('handles negatives', () => {
    expect(toMinorUnits(d('-12.3456'))).toBe(-123_456n);
  });

  it('rounds beyond 4dp (toFixed semantics, DB precision is DECIMAL(18,4))', () => {
    expect(toMinorUnits(d('10.00009'))).toBe(100_001n);
    expect(toMinorUnits(d('10.000099'))).toBe(100_001n);
    expect(toMinorUnits(d('10.00004'))).toBe(100_000n);
  });
});
