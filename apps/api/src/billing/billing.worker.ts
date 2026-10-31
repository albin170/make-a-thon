import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';
import { addDays } from 'date-fns';

interface BillingJobData {
  subscriptionId: string;
  periodKey: string;
  billingRunId: string;
}

@Injectable()
@Processor('billing')
export class BillingWorker {
  private readonly logger = new Logger(BillingWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-billing-period')
  async processBillingPeriod(job: Job<BillingJobData>) {
    const { subscriptionId, periodKey, billingRunId } = job.data;
    this.logger.log(`Processing billing period ${periodKey}`);

    // Idempotency: check if invoice already created for this period
    const period = await this.prisma.billingPeriod.findUnique({
      where: { periodKey },
    });

    if (!period) {
      this.logger.error(`Billing period ${periodKey} not found.`);
      return;
    }

    if (period.invoiceId) {
      this.logger.log(`Period ${periodKey} already has invoice ${period.invoiceId} — skipping.`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Validate subscription state
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          lines: { include: { product: true } },
          customer: { include: { user: true } },
          plan: true,
        },
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        await tx.billingPeriod.update({
          where: { periodKey },
          data: { status: 'SKIPPED', errorMessage: `Subscription status: ${subscription?.status}` },
        });
        return;
      }

      // Generate invoice number
      const count = await tx.invoice.count();
      const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

      // Calculate totals from subscription lines
      let subtotal = new Decimal(0);
      const invoiceLines = subscription.lines.map((line) => {
        const lineSubtotal = new Decimal(line.unitPrice).mul(line.quantity);
        subtotal = subtotal.add(lineSubtotal);
        return {
          id: uuidv4(),
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: new Decimal(0),
          subtotal: lineSubtotal,
          taxAmount: new Decimal(0),
          total: lineSubtotal,
        };
      });

      // Payment terms → due date
      const dueDays = 30;
      const dueDate = addDays(new Date(), dueDays);

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          id: uuidv4(),
          number: invoiceNumber,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          status: 'CONFIRMED',
          paymentStatus: 'UNPAID',
          invoiceDate: new Date(),
          dueDate,
          currency: subscription.currency,
          paymentTerms: subscription.paymentTerms,
          subtotal,
          discountTotal: new Decimal(0),
          taxTotal: new Decimal(0),
          total: subtotal,
          amountPaid: new Decimal(0),
          amountDue: subtotal,
          billingName: `${subscription.customer.user.firstName} ${subscription.customer.user.lastName}`,
          lines: {
            create: invoiceLines,
          },
        },
      });

      // Update billing period
      await tx.billingPeriod.update({
        where: { periodKey },
        data: {
          status: 'BILLED',
          invoiceId: invoice.id,
          billedAt: new Date(),
        },
      });

      // Update subscription next billing date
      const nextDate = period.periodEnd;
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { nextBillingDate: nextDate },
      });

      // Queue email delivery via outbox
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

      this.logger.log(`Created invoice ${invoice.number} for subscription ${subscriptionId}`);
    });
  }
}
