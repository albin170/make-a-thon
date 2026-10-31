import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';
import { PricingEngine } from '../common/pricing/pricing.engine';
import {
  BillingLineInput,
  calculateBillingPricing,
  fromMinor,
} from './billing.pricing';

interface BillingJobData {
  subscriptionId: string;
  periodKey: string;
  billingRunId: string;
}

interface ProcessOutcome {
  outcome: 'BILLED' | 'SKIPPED' | 'FAILED';
}

@Injectable()
@Processor('billing')
export class BillingWorker {
  private readonly logger = new Logger(BillingWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingEngine,
  ) {}

  @Process('process-billing-period')
  async processBillingPeriod(job: Job<BillingJobData>) {
    const { subscriptionId, periodKey, billingRunId } = job.data;
    this.logger.log(`Processing billing period ${periodKey}`);

    let result: ProcessOutcome;
    try {
      result = await this.billPeriod(subscriptionId, periodKey);
    } catch (err) {
      // Record the failure for observability, then rethrow so Bull retries
      // with backoff. The re-run re-runs idempotently via the period key.
      this.logger.error(`Billing for period ${periodKey} failed: ${err}`);
      try {
        await this.prisma.billingPeriod.update({
          where: { periodKey },
          data: {
            status: 'FAILED',
            errorMessage: String(err instanceof Error ? err.message : err).slice(0, 500),
            retryCount: { increment: 1 },
          },
        });
      } catch {
        // Period may not exist (or was removed) — accounting best-effort.
      }
      if (billingRunId) {
        await this.prisma.billingRun.update({
          where: { id: billingRunId },
          data: { totalFailed: { increment: 1 } },
        });
      }
      throw err;
    }

    // ── Run accounting + finalization ────────────────────────────────────────
    if (billingRunId) {
      if (result.outcome === 'BILLED') {
        await this.prisma.billingRun.update({
          where: { id: billingRunId },
          data: {
            totalProcessed: { increment: 1 },
            totalSucceeded: { increment: 1 },
          },
        });
      } else if (result.outcome === 'SKIPPED') {
        await this.prisma.billingRun.update({
          where: { id: billingRunId },
          data: {
            totalProcessed: { increment: 1 },
            totalSkipped: { increment: 1 },
          },
        });
      }
      await this.finalizeRun(billingRunId);
    }
  }

  // ── Core billing transaction ───────────────────────────────────────────────

  private async billPeriod(
    subscriptionId: string,
    periodKey: string,
  ): Promise<ProcessOutcome> {
    const period = await this.prisma.billingPeriod.findUnique({
      where: { periodKey },
    });

    if (!period) {
      this.logger.error(`Billing period ${periodKey} not found.`);
      return { outcome: 'SKIPPED' };
    }

    // Idempotency: duplicate job delivery for a period already invoiced
    if (period.invoiceId) {
      this.logger.log(
        `Period ${periodKey} already has invoice ${period.invoiceId} — skipping.`,
      );
      return { outcome: 'SKIPPED' };
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-check idempotency inside the transaction: duplicate job delivery
      // could pass the pre-transaction check concurrently.
      const lockedPeriod = await tx.billingPeriod.findUnique({
        where: { periodKey },
      });
      if (!lockedPeriod) {
        return { outcome: 'SKIPPED' as const };
      }
      if (lockedPeriod.invoiceId) {
        this.logger.log(
          `Period ${periodKey} claimed concurrently — skipping.`,
        );
        return { outcome: 'SKIPPED' as const };
      }

      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          lines: { orderBy: { sortOrder: 'asc' } },
          customer: { include: { user: true } },
          plan: true,
        },
      });

      if (!subscription) {
        await tx.billingPeriod.update({
          where: { periodKey },
          data: { status: 'SKIPPED', errorMessage: 'Subscription not found' },
        });
        return { outcome: 'SKIPPED' as const };
      }
      if (subscription.status !== 'ACTIVE') {
        await tx.billingPeriod.update({
          where: { periodKey },
          data: {
            status: 'SKIPPED',
            errorMessage: `Subscription status: ${subscription.status}`,
          },
        });
        return { outcome: 'SKIPPED' as const };
      }
      if (subscription.lines.length === 0) {
        await tx.billingPeriod.update({
          where: { periodKey },
          data: { status: 'SKIPPED', errorMessage: 'Subscription has no lines' },
        });
        return { outcome: 'SKIPPED' as const };
      }

      // ── Applied admin tax + discount rules ────────────────────────────────
      const now = new Date();
      const [taxRules, discountRules] = await Promise.all([
        tx.taxRule.findMany({ where: { isActive: true } }),
        tx.discountRule.findMany({ where: { isActive: true } }),
      ]);

      const inputLines: BillingLineInput[] = subscription.lines.map((line) => ({
        productId: line.productId,
        description: line.description,
        quantity: (line.quantity as Decimal).toFixed(4),
        unitPrice: (line.unitPrice as Decimal).toFixed(4),
      }));

      const calc = calculateBillingPricing({ lines: inputLines, taxRules, discountRules, now });

      // ── Consume discount usage atomically (usage-cap safe) ────────────────
      const appliedDiscounts = [];
      for (const d of calc.discounts) {
        const consumed = await tx.$executeRaw`
          UPDATE "DiscountRule"
          SET "usageCount" = "usageCount" + 1
          WHERE "id" = ${d.rule.id}
            AND ("maxUsage" IS NULL OR "usageCount" < "maxUsage")`;
        if (consumed === 1) {
          appliedDiscounts.push(d);
        }
        // If the usage cap was exhausted between filtering and consumption,
        // the discount is dropped by not committing its shares/usage below.
      }

      // Collapse kept discounts into final per-line discount amounts
      // (i.e. drop the ones that failed consumption) in one pass
      // over the applied list.
      const perLine = calc.lines.map(() => 0n);
      for (const d of appliedDiscounts) {
        for (const [lineIdx, amt] of d.sharesByLine) {
          perLine[lineIdx] += amt;
        }
      }

      // ── Run the pricing engine (integer minor-unit math) ──────────────────
      const engineResult = this.pricing.calculateLines(
        calc.lines.map((lp, lineIdx) => ({
          quantity: new Decimal(lp.line.quantity).toNumber(),
          unitPrice: lp.line.unitPrice,
          discountAmount: fromMinor(perLine[lineIdx]),
          taxRates: lp.taxRefs.map((t) => ({
            name: t.name,
            code: t.code,
            rate: t.rate,
            type: t.type,
          })),
        })),
      );

      // ── Invoice number (collision-safe) ───────────────────────────────────
      let invoiceNumber = await this.nextInvoiceNumber(tx);

      const subtotal = new Decimal(engineResult.subtotal);
      const discountTotal = new Decimal(engineResult.discountTotal);
      const taxTotal = new Decimal(engineResult.taxTotal);
      const total = new Decimal(engineResult.total);

      const invoiceLinesCreate = engineResult.lines.map((line, idx) => {
        const subLine = subscription.lines[idx];
        if (!subLine) throw new Error('Invoice line mismatch against subscription');
        return {
          id: uuidv4(),
          productId: subLine.productId,
          description: subLine.description,
          quantity: subLine.quantity,
          unitPrice: subLine.unitPrice,
          discountAmount: new Decimal(line.discountAmount),
          subtotal: new Decimal(line.subtotalBeforeDiscount),
          taxAmount: new Decimal(line.taxAmount),
          total: new Decimal(line.total),
          sortOrder: idx,
          taxes: {
            create: line.taxBreakdown.map((tb) => {
              const ref = calc.lines[idx].taxRefs.find(
                (t) => t.name === tb.name && t.type === tb.type,
              );
              if (!ref) {
                throw new Error(`Unknown tax breakdown entry "${tb.name}"`);
              }
              return {
                id: uuidv4(),
                taxRuleId: ref.id,
                taxName: ref.name,
                taxRate: new Decimal(tb.rate),
                taxType: ref.type,
                taxAmount: new Decimal(tb.amount),
              };
            }),
          },
        };
      });

      // Create the invoice with a collision-safe retry on the unique number
      let invoice: { id: string; number: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          invoice = await tx.invoice.create({
            data: {
              id: uuidv4(),
              number: invoiceNumber,
              customerId: subscription.customerId,
              subscriptionId: subscription.id,
              status: 'CONFIRMED',
              paymentStatus: 'UNPAID',
              invoiceDate: now,
              dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              currency: subscription.currency,
              paymentTerms: subscription.paymentTerms,
              subtotal,
              discountTotal,
              taxTotal,
              total,
              amountPaid: new Decimal(0),
              amountDue: total,
              billingName: `${subscription.customer.user.firstName} ${subscription.customer.user.lastName}`,
              lines: { create: invoiceLinesCreate },
            },
          });
          break;
        } catch (err: any) {
          if (err?.code === 'P2002') {
            this.logger.warn(`Invoice number ${invoiceNumber} taken, regenerating...`);
            invoiceNumber = `${invoiceNumber}-R${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            continue;
          }
          throw err;
        }
      }
      if (!invoice) {
        throw new Error('Could not generate a unique invoice number');
      }

      // ── Discount usage audit trail ────────────────────────────────────────
      for (const d of appliedDiscounts) {
        await tx.discountUsage.create({
          data: {
            id: uuidv4(),
            discountRuleId: d.rule.id,
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            amount: fromMinor(d.amountMinor),
          },
        });
      }

      // ── Advance the billing schedule ─────────────────────────────────────
      const nextDate = period.periodEnd;
      const pastEnd =
        !!subscription.endDate && nextDate > subscription.endDate;
      const autoClose = pastEnd && subscription.plan.autoCloseOnEnd;
      const allowEarly = !pastEnd || subscription.plan.allowEarlyClosure;

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          nextBillingDate: pastEnd ? null : nextDate,
          ...(autoClose && allowEarly
            ? { status: 'CLOSED' as const, closedAt: now }
            : {}),
        },
      });

      // ── Mark period billed (conditional claim: invoiceId must be null) ────
      const claimed = await tx.billingPeriod.updateMany({
        where: { periodKey, invoiceId: null },
        data: {
          status: 'BILLED',
          invoiceId: invoice.id,
          billedAt: now,
        },
      });
      if (claimed.count !== 1) {
        // Lost the race against a concurrent duplicate delivery — roll back.
        throw new Error(`Period ${periodKey} claimed concurrently`);
      }

      // ── Queue invoice-ready email via the transactional outbox ───────────
      await tx.notificationOutbox.create({
        data: {
          id: uuidv4(),
          type: 'INVOICE_READY',
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            customerId: subscription.customerId,
            to: subscription.customer.user.email,
          },
        },
      });

      this.logger.log(
        `Created invoice ${invoice.number} for subscription ${subscriptionId}`,
      );
      return { outcome: 'BILLED' as const };
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async nextInvoiceNumber(tx: {
    invoice: {
      count: () => Promise<number>;
    };
  }): Promise<string> {
    const count = await tx.invoice.count();
    return `INV-${String(count + 1).padStart(6, '0')}`;
  }

  private async finalizeRun(billingRunId: string) {
    const remaining = await this.prisma.billingPeriod.count({
      where: { billingRunId, status: 'PENDING' },
    });
    if (remaining > 0) return;

    const run = await this.prisma.billingRun.findUnique({
      where: { id: billingRunId },
      select: { totalFailed: true },
    });
    await this.prisma.billingRun.update({
      where: { id: billingRunId },
      data: {
        status: run && run.totalFailed > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}
