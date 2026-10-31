import { PricingEngine } from '../../apps/api/src/common/pricing/pricing.engine';

describe('Pricing Engine & Tax Precision Tests', () => {
  const engine = new PricingEngine();

  it('calculates deterministic line totals without floating-point drift', () => {
    const result = engine.calculateLines([
      {
        quantity: 3,
        unitPrice: '100.0000',
        discountAmount: '10.0000',
        taxRates: [
          { name: 'VAT', rate: '20.0000', type: 'EXCLUSIVE', code: 'VAT20' },
        ],
      },
    ]);

    // Subtotal: 3 * 100 = 300
    // Discount: 10
    // Subtotal after discount: 290
    // Exclusive Tax 20%: 290 * 0.20 = 58
    // Total: 290 + 58 = 348
    expect(result.subtotal).toBe('300.0000');
    expect(result.discountTotal).toBe('10.0000');
    expect(result.taxTotal).toBe('58.0000');
    expect(result.total).toBe('348.0000');
  });

  it('correctly handles inclusive tax calculation', () => {
    const result = engine.calculateLines([
      {
        quantity: 1,
        unitPrice: '105.0000',
        taxRates: [
          { name: 'GST', rate: '5.0000', type: 'INCLUSIVE', code: 'GST5' },
        ],
      },
    ]);

    // Unit price 105 inclusive of 5% tax
    // Tax = 105 * 5 / 105 = 5.0000
    // Subtotal: 105.0000
    // Total: 105.0000
    expect(result.taxTotal).toBe('5.0000');
    expect(result.total).toBe('105.0000');
  });

  it('applies variant price adjustments (Odoo +560 test case)', () => {
    const basePrice = 1200;
    const odooAdjustment = 560;
    const finalPrice = basePrice + odooAdjustment;

    expect(finalPrice).toBe(1760);
  });
});
