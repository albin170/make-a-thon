// Pricing Engine — server-side, shared by quotations, subscriptions and invoices.
// Uses integer minor-units (cents) internally to avoid floating-point errors.
// All inputs/outputs are Decimal strings (4 decimal places).

import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface PricingLine {
  quantity: number;
  unitPrice: string; // Decimal string
  discountAmount?: string; // Decimal string
  taxRates?: Array<{ rate: string; type: 'INCLUSIVE' | 'EXCLUSIVE'; name: string; code: string }>;
}

export interface CalculatedLine {
  quantity: number;
  unitPrice: string;
  subtotalBeforeDiscount: string;
  discountAmount: string;
  subtotalAfterDiscount: string;
  taxAmount: string;
  taxBreakdown: Array<{ name: string; rate: string; amount: string; type: string }>;
  total: string;
}

export interface PricingResult {
  lines: CalculatedLine[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
}

const SCALE = 10000n; // 4 decimal places

function toMinorUnits(value: string): bigint {
  const d = new Decimal(value);
  const [int, frac = ''] = d.toFixed(4).split('.');
  const fracPadded = frac.padEnd(4, '0').slice(0, 4);
  return BigInt(int.replace('-', '')) * SCALE +
    BigInt(fracPadded) * (int.startsWith('-') ? -1n : 1n);
}

function fromMinorUnits(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const int = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(4, '0');
  return (negative ? '-' : '') + int.toString() + '.' + frac;
}

@Injectable()
export class PricingEngine {
  calculateLines(lines: PricingLine[]): PricingResult {
    let subtotalMinor = 0n;
    let discountMinor = 0n;
    let taxMinor = 0n;
    const calculatedLines: CalculatedLine[] = [];

    for (const line of lines) {
      const qtyMinor = BigInt(Math.round(line.quantity * 10000));
      const unitMinor = toMinorUnits(line.unitPrice);
      const subtotalBeforeDiscount = (qtyMinor * unitMinor) / SCALE;

      let discountAmount = line.discountAmount ? toMinorUnits(line.discountAmount) : 0n;
      // Prevent negative totals on a line
      if (discountAmount > subtotalBeforeDiscount) discountAmount = subtotalBeforeDiscount;

      const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;

      let lineTaxMinor = 0n;
      const taxBreakdown: CalculatedLine['taxBreakdown'] = [];

      for (const tax of line.taxRates || []) {
        const rateMinor = toMinorUnits(tax.rate); // e.g. "18.0000" = 18%
        let taxAmt: bigint;

        if (tax.type === 'EXCLUSIVE') {
          // Tax is added on top of subtotal
          taxAmt = (subtotalAfterDiscount * rateMinor) / (SCALE * 100n);
        } else {
          // Tax is already included in price — extract it
          taxAmt = (subtotalAfterDiscount * rateMinor) / (SCALE * 100n + rateMinor);
        }

        lineTaxMinor += taxAmt;
        taxBreakdown.push({
          name: tax.name,
          rate: tax.rate,
          amount: fromMinorUnits(taxAmt),
          type: tax.type,
        });
      }

      const lineTotal = subtotalAfterDiscount + (line.taxRates?.some(t => t.type === 'EXCLUSIVE') ? lineTaxMinor : 0n);

      subtotalMinor += subtotalBeforeDiscount;
      discountMinor += discountAmount;
      taxMinor += lineTaxMinor;

      calculatedLines.push({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotalBeforeDiscount: fromMinorUnits(subtotalBeforeDiscount),
        discountAmount: fromMinorUnits(discountAmount),
        subtotalAfterDiscount: fromMinorUnits(subtotalAfterDiscount),
        taxAmount: fromMinorUnits(lineTaxMinor),
        taxBreakdown,
        total: fromMinorUnits(lineTotal),
      });
    }

    const grandTotal = subtotalMinor - discountMinor + taxMinor;

    return {
      lines: calculatedLines,
      subtotal: fromMinorUnits(subtotalMinor),
      discountTotal: fromMinorUnits(discountMinor),
      taxTotal: fromMinorUnits(taxMinor),
      total: fromMinorUnits(grandTotal < 0n ? 0n : grandTotal),
    };
  }
}

