// Billing pricing helpers — pure functions used by the billing worker to
// apply admin-configured tax rules and discount rules to subscription lines
// before invoicing. Kept dependency-free and pure so they are unit-testable.

import {
  DiscountRule,
  TaxRule,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface BillingLineInput {
  productId: string | null;
  description: string;
  quantity: string; // Decimal string
  unitPrice: string; // Decimal string
}

export interface TaxRef {
  id: string;
  name: string;
  code: string;
  rate: string; // Decimal string, e.g. "18.0000" = 18%
  type: 'INCLUSIVE' | 'EXCLUSIVE';
}

export interface AppliedDiscount {
  rule: DiscountRule;
  amountMinor: bigint; // total discount granted, in minor units
  /** Per-line share of this discount, in minor units, keyed by line index. */
  sharesByLine: Map<number, bigint>;
}

export interface LinePricing {
  line: BillingLineInput;
  taxRefs: TaxRef[];
  discountAmount: string; // Decimal string applied to this line
}

export interface BillingCalculationInput {
  lines: BillingLineInput[];
  taxRules: TaxRule[];
  discountRules: DiscountRule[];
  now?: Date;
}

export interface BillingCalculationOutput {
  lines: LinePricing[];
  discounts: AppliedDiscount[];
}

const DEC = 10_000n; // 4 decimal places of precision

export function isTaxRuleActive(rule: TaxRule, now: Date): boolean {
  if (!rule.isActive) return false;
  if (rule.effectiveFrom && rule.effectiveFrom > now) return false;
  if (rule.effectiveTo && rule.effectiveTo < now) return false;
  return true;
}

export function isDiscountRuleActive(rule: DiscountRule, now: Date): boolean {
  if (!rule.isActive) return false;
  if (rule.startDate && rule.startDate > now) return false;
  if (rule.endDate && rule.endDate < now) return false;
  if (rule.maxUsage !== null && rule.usageCount >= rule.maxUsage) return false;
  return true;
}

/** Allocate a fixed minor-unit amount across lines proportional to their
 *  subtotal share, deterministic remainder on the largest subtotal. */
export function allocateProportionally(
  amountMinor: bigint,
  subtotalsMinor: bigint[],
): bigint[] {
  const shares = subtotalsMinor.map(() => 0n);
  const total = subtotalsMinor.reduce((a, b) => a + b, 0n);
  if (total === 0n) return shares;

  let allocated = 0n;
  for (let i = 0; i < subtotalsMinor.length; i++) {
    const share = (subtotalsMinor[i] * amountMinor) / total;
    shares[i] += share;
    allocated += share;
  }
  // Remainder (from integer truncation) goes to the largest subtotal line
  const remainder = amountMinor - allocated;
  if (remainder > 0n) {
    let maxIdx = 0;
    for (let i = 1; i < subtotalsMinor.length; i++) {
      if (subtotalsMinor[i] > subtotalsMinor[maxIdx]) maxIdx = i;
    }
    shares[maxIdx] += remainder;
  }
  return shares;
}

function lineSubtotalMinor(line: BillingLineInput): bigint {
  const product = new Decimal(line.quantity).mul(new Decimal(line.unitPrice)).toFixed(4);
  const [int, frac = ''] = product.split('.');
  return BigInt(int.replace(/-/g, '')) * DEC + BigInt((frac || '').padEnd(4, '0').slice(0, 4));
}

function toMinor(value: string): bigint {
  const d = new Decimal(value);
  const [int, frac = ''] = d.toFixed(4).split('.');
  return BigInt(int.replace(/-/g, '')) * DEC + BigInt((frac || '').padEnd(4, '0').slice(0, 4));
}

export function fromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const int = (abs / DEC).toString();
  const frac = (abs % DEC).toString().padStart(4, '0');
  return (negative ? '-' : '') + int + '.' + frac;
}

/**
 * Compute per-line taxes and discounts for a set of subscription lines.
 *
 * Discount semantics (matching the challenge brief):
 *  - Percentage discount: applies % to the applicable scope.
 *  - Fixed-amount discount: distributed proportionally across the
 *    applicable lines (remainder on the largest line).
 *  - Scope: `productId` restricts to that product's lines;
 *    `isSubscriptionWide` applies to all lines.
 *  - Eligibility pre-checks (min purchase / min quantity / window / usage
 *    cap) are evaluated here; usage consumption happens transactionally
 *    in the worker. Percentage discounts to a line are capped at that
 *    line's subtotal; fixed amounts capped at the scope subtotal.
 */
export function calculateBillingPricing(
  input: BillingCalculationInput,
): BillingCalculationOutput {
  const now = input.now ?? new Date();
  const activeTaxRules = input.taxRules.filter((r) => isTaxRuleActive(r, now));
  const activeDiscountRules = input.discountRules.filter((r) =>
    isDiscountRuleActive(r, now),
  );

  // ── Taxes ────────────────────────────────────────────────────────────────
  const lines: LinePricing[] = input.lines.map((line) => ({
    line,
    taxRefs: activeTaxRules.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      rate: r.rate.toFixed(4),
      type: r.type,
    })),
    discountAmount: '0.0000',
  }));

  // ── Discounts ────────────────────────────────────────────────────────────
  const discounts: AppliedDiscount[] = [];
  const perLineExtra = lines.map(() => 0n);

  for (const rule of activeDiscountRules) {
    const applicableIdx = lines
      .map((lp, i) => ({ lp, i }))
      .filter(
        ({ lp }) =>
          rule.isSubscriptionWide ||
          (rule.productId && lp.line.productId === rule.productId),
      );
    if (applicableIdx.length === 0) continue;

    const applicableSubtotals = applicableIdx.map(({ lp }) => lineSubtotalMinor(lp.line));
    const scopeSubtotal = applicableSubtotals.reduce((a, b) => a + b, 0n);
    if (scopeSubtotal === 0n) continue;

    // Eligibility: min purchase / min quantity evaluated on scope
    if (
      rule.minPurchaseAmount &&
      toMinor(rule.minPurchaseAmount.toFixed(4)) > scopeSubtotal
    ) {
      continue;
    }
    if (rule.minQuantity) {
      const scopeQty = applicableIdx.reduce(
        (acc, { lp }) => acc + new Decimal(lp.line.quantity).toNumber(),
        0,
      );
      if (scopeQty < rule.minQuantity) continue;
    }

    // Compute the raw discount amount in minor units
    let discountMinor: bigint;
    if (rule.type === 'PERCENTAGE') {
      const rateMinor = toMinor(rule.value.toFixed(4)); // e.g. 10% -> "10.0000"
      discountMinor = (scopeSubtotal * rateMinor) / (DEC * 100n);
    } else {
      discountMinor = toMinor(rule.value.toFixed(4));
    }
    // Never discount more than the scope is worth
    if (discountMinor > scopeSubtotal) discountMinor = scopeSubtotal;
    if (discountMinor <= 0n) continue;

    // Distribute across applicable lines (no-op for a single applicable line)
    const shares = allocateProportionally(discountMinor, applicableSubtotals);
    const sharesByLine = new Map<number, bigint>();
    applicableIdx.forEach(({ i }, k) => {
      sharesByLine.set(i, shares[k]);
      perLineExtra[i] += shares[k];
    });

    discounts.push({
      rule,
      amountMinor: discountMinor,
      sharesByLine,
    });
  }

  lines.forEach((lp, i) => {
    const subtotal = lineSubtotalMinor(lp.line);
    if (perLineExtra[i] > subtotal) perLineExtra[i] = subtotal;
    lp.discountAmount = fromMinor(perLineExtra[i]);
  });

  return { lines, discounts };
}
