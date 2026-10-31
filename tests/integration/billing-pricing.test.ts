// Billing pricing helper tests — taxes, discounts, allocation math.
import {
  allocateProportionally,
  calculateBillingPricing,
  isDiscountRuleActive,
  isTaxRuleActive,
} from '../../apps/api/src/billing/billing.pricing';
import { DiscountRule, DiscountType, TaxRule, TaxType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const NOW = new Date('2026-10-31T12:00:00Z');

function makeTaxRule(overrides: Partial<TaxRule> = {}): TaxRule {
  return {
    id: 'tax-1',
    name: 'VAT',
    code: 'VAT',
    rate: new Decimal('18.0000'),
    type: TaxType.EXCLUSIVE,
    description: null,
    jurisdiction: null,
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as TaxRule;
}

function makeDiscountRule(overrides: Partial<DiscountRule> = {}): DiscountRule {
  return {
    id: 'disc-1',
    name: 'Volume',
    code: 'VOL10',
    type: DiscountType.PERCENTAGE,
    value: new Decimal('10.0000'),
    minPurchaseAmount: null,
    minQuantity: null,
    productId: null,
    isSubscriptionWide: false,
    startDate: null,
    endDate: null,
    maxUsage: null,
    usageCount: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as DiscountRule;
}

function makeLines(count: number, unitPrice = '100.0000', productId = 'p1') {
  return Array.from({ length: count }, (_, i) => ({
    productId,
    description: `Line ${i + 1}`,
    quantity: '2.0000',
    unitPrice,
  }));
}

// ── Tax rule filters ────────────────────────────────────────────────────────

describe('tax rule selection', () => {
  it('skips inactive tax rules', () => {
    expect(isTaxRuleActive(makeTaxRule({ isActive: false }), NOW)).toBe(false);
  });

  it('respects the effective window (not started / expired)', () => {
    const notStarted = makeTaxRule({
      effectiveFrom: new Date('2026-11-01T00:00:00Z'),
    });
    const expired = makeTaxRule({ effectiveTo: new Date('2026-10-01T00:00:00Z') });
    const current = makeTaxRule({
      effectiveFrom: new Date('2026-10-01T00:00:00Z'),
      effectiveTo: new Date('2026-11-30T00:00:00Z'),
    });
    expect(isTaxRuleActive(notStarted, NOW)).toBe(false);
    expect(isTaxRuleActive(expired, NOW)).toBe(false);
    expect(isTaxRuleActive(current, NOW)).toBe(true);
  });
});

// ── Discount rule filters ───────────────────────────────────────────────────

describe('discount rule selection', () => {
  it('skips rules outside their date window', () => {
    const expired = makeDiscountRule({ endDate: new Date('2026-10-30T00:00:00Z') });
    expect(isDiscountRuleActive(expired, NOW)).toBe(false);
  });

  it('skips rules whose usage cap is exhausted', () => {
    const capped = makeDiscountRule({ maxUsage: 5, usageCount: 5 });
    expect(isDiscountRuleActive(capped, NOW)).toBe(false);
  });

  it('keeps rules under the usage cap', () => {
    const under = makeDiscountRule({ maxUsage: 5, usageCount: 4 });
    expect(isDiscountRuleActive(under, NOW)).toBe(true);
  });
});

// ── Discount application ────────────────────────────────────────────────────

describe('discount application', () => {
  it('applies a subscription-wide percentage discount to every line', () => {
    const result = calculateBillingPricing({
      lines: makeLines(2), // 2 lines x (2 x 100) = 400 total
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.PERCENTAGE,
          value: new Decimal('10.0000'),
          isSubscriptionWide: true,
        }),
      ],
      now: NOW,
    });

    // Each line subtotal 200 → 10% = 20.0000 discount per line
    expect(result.lines[0].discountAmount).toBe('20.0000');
    expect(result.lines[1].discountAmount).toBe('20.0000');
    expect(result.discounts[0].amountMinor.toString()).toBe('400000');
  });

  it('applies a product-specific discount only to matching lines', () => {
    const lines = [
      { productId: 'p1', description: 'A', quantity: '1.0000', unitPrice: '100.0000' },
      { productId: 'p2', description: 'B', quantity: '1.0000', unitPrice: '100.0000' },
    ];
    const result = calculateBillingPricing({
      lines,
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.PERCENTAGE,
          value: new Decimal('50.0000'),
          productId: 'p1',
        }),
      ],
      now: NOW,
    });

    expect(result.lines[0].discountAmount).toBe('50.0000');
    expect(result.lines[1].discountAmount).toBe('0.0000');
  });

  it('distributes a fixed-amount subscription-wide discount proportionally', () => {
    const lines = [
      { productId: 'p1', description: 'A', quantity: '3.0000', unitPrice: '100.0000' }, // 300
      { productId: 'p1', description: 'B', quantity: '1.0000', unitPrice: '100.0000' }, // 100
    ];
    const result = calculateBillingPricing({
      lines,
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.FIXED_AMOUNT,
          value: new Decimal('40.0000'),
          isSubscriptionWide: true,
        }),
      ],
      now: NOW,
    });

    // 40 split 300:100 → 30 + 10, integer math exact here
    expect(result.lines[0].discountAmount).toBe('30.0000');
    expect(result.lines[1].discountAmount).toBe('10.0000');
    expect(result.discounts[0].amountMinor.toString()).toBe('400000');
  });

  it('caps the discount at the scope subtotal (never negative totals)', () => {
    const result = calculateBillingPricing({
      lines: makeLines(1), // subtotal 200
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.FIXED_AMOUNT,
          value: new Decimal('999.0000'),
          isSubscriptionWide: true,
        }),
      ],
      now: NOW,
    });

    expect(result.lines[0].discountAmount).toBe('200.0000');
  });

  it('skips discounts below the minimum purchase amount', () => {
    const result = calculateBillingPricing({
      lines: makeLines(1), // subtotal 200
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.PERCENTAGE,
          value: new Decimal('10.0000'),
          isSubscriptionWide: true,
          minPurchaseAmount: new Decimal('500.0000'),
        }),
      ],
      now: NOW,
    });

    expect(result.discounts).toHaveLength(0);
    expect(result.lines[0].discountAmount).toBe('0.0000');
  });

  it('skips discounts below the minimum quantity', () => {
    const result = calculateBillingPricing({
      lines: makeLines(1), // qty 2
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.PERCENTAGE,
          value: new Decimal('10.0000'),
          isSubscriptionWide: true,
          minQuantity: 5,
        }),
      ],
      now: NOW,
    });

    expect(result.discounts).toHaveLength(0);
  });

  it('honours quantity thresholds when they are met', () => {
    const result = calculateBillingPricing({
      lines: makeLines(3), // qty 6
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.PERCENTAGE,
          value: new Decimal('10.0000'),
          isSubscriptionWide: true,
          minQuantity: 5,
        }),
      ],
      now: NOW,
    });

    expect(result.discounts).toHaveLength(1);
    // 600 subtotal → 60 total discount
    expect(result.discounts[0].amountMinor.toString()).toBe('600000');
  });

  it('skips an expired rule (not applied)', () => {
    const result = calculateBillingPricing({
      lines: makeLines(1),
      taxRules: [],
      discountRules: [
        makeDiscountRule({
          id: 'd-1',
          type: DiscountType.PERCENTAGE,
          value: new Decimal('10.0000'),
          isSubscriptionWide: true,
          endDate: new Date('2026-10-30T00:00:00Z'),
        }),
      ],
      now: NOW,
    });

    expect(result.discounts).toHaveLength(0);
  });
});

// ── Proportional allocation ─────────────────────────────────────────────────

describe('allocateProportionally', () => {
  it('sums to the requested amount', () => {
    const shares = allocateProportionally(1_111_111n, [30_000n, 10_000n]);
    expect(shares.reduce((a, b) => a + b, 0n).toString()).toBe('1111111');
  });

  it('puts the division remainder on the largest line (deterministic)', () => {
    // 1 unit over 4 lines of subtotal 350: three largest tie at 100 —
    // the remainder lands on the first (deterministic) max-scan winner.
    const shares = allocateProportionally(1n, [100n, 100n, 100n, 50n]);
    expect(shares[0].toString()).toBe('1');
    expect(shares.reduce((a, b) => a + b, 0n).toString()).toBe('1');
  });

  it('returns zeros when the scope subtotal is zero', () => {
    expect(allocateProportionally(1000n, [0n, 0n])).toEqual([0n, 0n]);
  });
});
