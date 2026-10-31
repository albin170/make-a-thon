import { PricingEngine, PricingLine } from './pricing.engine';

describe('PricingEngine', () => {
  let engine: PricingEngine;

  beforeEach(() => {
    engine = new PricingEngine();
  });

  it('calculates a simple single line without discount or taxes', () => {
    const lines: PricingLine[] = [
      {
        quantity: 2,
        unitPrice: '50.0000',
      },
    ];

    const result = engine.calculateLines(lines);

    expect(result.subtotal).toBe('100.0000');
    expect(result.discountTotal).toBe('0.0000');
    expect(result.taxTotal).toBe('0.0000');
    expect(result.total).toBe('100.0000');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].subtotalBeforeDiscount).toBe('100.0000');
    expect(result.lines[0].subtotalAfterDiscount).toBe('100.0000');
    expect(result.lines[0].total).toBe('100.0000');
  });

  it('calculates line items with discounts correctly clamped to subtotal', () => {
    const lines: PricingLine[] = [
      {
        quantity: 1,
        unitPrice: '100.0000',
        discountAmount: '25.0000',
      },
      {
        quantity: 1,
        unitPrice: '50.0000',
        discountAmount: '70.0000', // exceeds subtotal, should clamp to 50
      },
    ];

    const result = engine.calculateLines(lines);

    expect(result.subtotal).toBe('150.0000');
    expect(result.discountTotal).toBe('75.0000');
    expect(result.total).toBe('75.0000');
    expect(result.lines[0].subtotalAfterDiscount).toBe('75.0000');
    expect(result.lines[1].subtotalAfterDiscount).toBe('0.0000');
  });

  it('calculates exclusive taxes on top of subtotal after discount', () => {
    const lines: PricingLine[] = [
      {
        quantity: 2,
        unitPrice: '100.0000', // subtotal = 200
        discountAmount: '20.0000', // subtotal after discount = 180
        taxRates: [
          { name: 'VAT', rate: '10.0000', type: 'EXCLUSIVE' }, // 18.0000
        ],
      },
    ];

    const result = engine.calculateLines(lines);

    expect(result.subtotal).toBe('200.0000');
    expect(result.discountTotal).toBe('20.0000');
    expect(result.taxTotal).toBe('18.0000');
    expect(result.total).toBe('198.0000');
    expect(result.lines[0].taxBreakdown).toHaveLength(1);
    expect(result.lines[0].taxBreakdown[0].amount).toBe('18.0000');
  });

  it('calculates inclusive taxes extracted from subtotal after discount', () => {
    const lines: PricingLine[] = [
      {
        quantity: 1,
        unitPrice: '110.0000', // price includes 10% tax
        taxRates: [
          { name: 'GST', rate: '10.0000', type: 'INCLUSIVE' }, // 110 * 10 / 110 = 10
        ],
      },
    ];

    const result = engine.calculateLines(lines);

    expect(result.subtotal).toBe('110.0000');
    expect(result.taxTotal).toBe('10.0000');
    // For inclusive tax, total is still 110
    expect(result.total).toBe('110.0000');
    expect(result.lines[0].taxBreakdown[0].amount).toBe('10.0000');
  });
});
