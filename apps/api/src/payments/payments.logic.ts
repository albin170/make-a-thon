// Payments logic — pure functions for payment allocation status math.
// Amounts are expressed in minor units (4dp scale × 10⁴) to avoid float drift.

export type PaymentStatusValue = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export function paymentStatusFor(
  amountDueMinor: bigint,
  amountPaidMinor: bigint,
): Exclude<PaymentStatusValue, 'OVERDUE'> {
  if (amountDueMinor <= 0n) return 'PAID';
  if (amountPaidMinor > 0n) return 'PARTIALLY_PAID';
  return 'UNPAID';
}

export function isOverdue(
  dueDate: Date,
  amountDueMinor: bigint,
  now: Date = new Date(),
): boolean {
  return amountDueMinor > 0n && dueDate < now;
}

/** Invoice lifecycle status implied by its achieved payment status.
 *  Only DRAFT/CONFIRMED/OVERDUE invoices progress to PAID. */
export function invoiceStatusAfterPayment(
  currentInvoiceStatus: string,
  paymentStatus: PaymentStatusValue,
): string {
  if (
    paymentStatus === 'PAID' &&
    (currentInvoiceStatus === 'CONFIRMED' || currentInvoiceStatus === 'OVERDUE')
  ) {
    return 'PAID';
  }
  return currentInvoiceStatus;
}

const SCALE = 10_000n; // 4 decimal places

/** Convert a Decimal-ish value to 4dp minor units. */
export function toMinorUnits(value: DecimalLike): bigint {
  const str = value.toFixed(4);
  const negative = str.startsWith('-');
  const [int, frac = ''] = str.replace('-', '').split('.');
  const minor = BigInt(int) * SCALE + BigInt(frac.padEnd(4, '0').slice(0, 4));
  return negative ? -minor : minor;
}

export interface DecimalLike {
  toFixed: (places: number) => string;
}
