import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, Prisma } from '@prisma/client';
import {
  invoiceStatusAfterPayment,
  isOverdue,
  paymentStatusFor,
  toMinorUnits,
} from './payments.logic';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextPaymentNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.payment.count();
    return `PAY-${String(count + 1).padStart(6, '0')}`;
  }

  async recordPayment(dto: {
    customerId: string;
    method: PaymentMethod;
    amount: string;
    currency?: string;
    paymentDate: string | Date;
    reference?: string;
    notes?: string;
  }) {
    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // Number generated inside the transaction; the unique constraint +
      // suffix fallback guards against concurrent numbering races.
      let number = await this.nextPaymentNumber(tx);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await tx.payment.create({
            data: {
              number,
              customerId: dto.customerId,
              method: dto.method,
              amount,
              currency: dto.currency ?? 'USD',
              paymentDate: new Date(dto.paymentDate),
              reference: dto.reference,
              notes: dto.notes,
              unallocated: amount,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            number = `${number}-R${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            continue;
          }
          throw err;
        }
      }
      throw new Error('Could not generate a unique payment number');
    });
  }

  async listPayments(query: {
    page?: number;
    limit?: number;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
    method?: PaymentMethod;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.method) where.method = query.method;
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {};
      if (query.dateFrom) where.paymentDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.paymentDate.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: { allocations: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                status: true,
                paymentStatus: true,
                total: true,
                amountPaid: true,
                amountDue: true,
                dueDate: true,
                invoiceDate: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  async allocatePayment(
    paymentId: string,
    invoiceId: string,
    amount: string,
    notes?: string,
  ) {
    const allocationAmount = new Decimal(amount);
    if (allocationAmount.lte(0)) {
      throw new BadRequestException('Allocation amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate payment has sufficient unallocated funds
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
      if (payment.reversedAt) {
        throw new BadRequestException('Payment is reversed and cannot be allocated');
      }
      if (new Decimal(payment.unallocated).lt(allocationAmount)) {
        throw new BadRequestException(
          `Insufficient unallocated balance. Available: ${payment.unallocated}, requested: ${amount}`,
        );
      }

      // 2. Validate invoice is an active receivable
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
      if (['DRAFT', 'CANCELLED', 'VOID'].includes(invoice.status)) {
        throw new BadRequestException(
          `Cannot allocate payment to a ${invoice.status} invoice`,
        );
      }

      // 3. Atomic guarded allocation: decrements amountDue and increments
      //    amountPaid together, ONLY while the invoice still has at least
      //    `amount` outstanding — concurrent allocations can never
      //    over-allocate (each update is serialized by the row lock).
      const guarded = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          amountDue: { gte: allocationAmount },
        },
        data: {
          amountPaid: { increment: allocationAmount },
          amountDue: { decrement: allocationAmount },
        },
      });
      if (guarded.count !== 1) {
        throw new BadRequestException(
          'Allocation exceeds outstanding invoice balance',
        );
      }

      // 4. Upsert the allocation record
      const existingAllocation = await tx.paymentAllocation.findUnique({
        where: { paymentId_invoiceId: { paymentId, invoiceId } },
      });
      if (existingAllocation) {
        await tx.paymentAllocation.update({
          where: { id: existingAllocation.id },
          data: {
            amount: new Decimal(existingAllocation.amount).add(allocationAmount),
            notes: notes ?? existingAllocation.notes,
          },
        });
      } else {
        await tx.paymentAllocation.create({
          data: { paymentId, invoiceId, amount: allocationAmount, notes },
        });
      }

      // 5. Deduct from the payment's unallocated pool
      await tx.payment.update({
        where: { id: paymentId },
        data: { unallocated: { decrement: allocationAmount } },
      });

      // 6. Recompute statuses from the post-update invoice state
      const updatedInvoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });
      const paymentStatus = paymentStatusFor(
        toMinorUnits(updatedInvoice.amountDue),
        toMinorUnits(updatedInvoice.amountPaid),
      );
      const invoiceStatus = invoiceStatusAfterPayment(
        updatedInvoice.status,
        paymentStatus,
      );

      if (
        updatedInvoice.paymentStatus !== paymentStatus ||
        updatedInvoice.status !== invoiceStatus
      ) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { paymentStatus, status: invoiceStatus as any },
        });
      }

      return {
        payment: await tx.payment.findUnique({ where: { id: paymentId } }),
        invoice: { ...updatedInvoice, paymentStatus, status: invoiceStatus },
      };
    });
  }

  /** Un-allocate: the allocation is voided, funds return to the payment's
   *  unallocated pool, and the invoice balance is restored. */
  async revokeAllocation(paymentId: string, allocationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.paymentAllocation.findFirst({
        where: { id: allocationId, paymentId },
      });
      if (!allocation) {
        throw new NotFoundException(`Allocation ${allocationId} not found on payment ${paymentId}`);
      }
      if (allocation.reversedAt) {
        throw new BadRequestException('Allocation is already reversed');
      }

      await tx.paymentAllocation.update({
        where: { id: allocationId },
        data: { reversedAt: new Date() },
      });

      await tx.invoice.update({
        where: { id: allocation.invoiceId },
        data: {
          amountPaid: { decrement: allocation.amount },
          amountDue: { increment: allocation.amount },
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { unallocated: { increment: allocation.amount } },
      });

      // Recompute invoice statuses
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: allocation.invoiceId },
      });
      const paymentStatus = paymentStatusFor(
        toMinorUnits(invoice.amountDue),
        toMinorUnits(invoice.amountPaid),
      );
      const invoiceStatus = invoiceStatusAfterPayment(invoice.status, paymentStatus);
      // A fully-paid invoice is downgraded back to CONFIRMED when its
      // funding payment is revoked (PAID is terminal only while funded).
      const restored = invoice.status === 'PAID' ? 'CONFIRMED' : invoiceStatus;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus, status: restored as any },
      });

      return {
        payment: await tx.payment.findUnique({ where: { id: paymentId } }),
        invoice: await tx.invoice.findUnique({ where: { id: allocation.invoiceId } }),
      };
    });
  }

  /** Mark all confirmed invoices past due (positive balance) as OVERDUE. */
  async sweepOverdue(now: Date = new Date()) {
    const base = await this.prisma.invoice.updateMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        amountDue: { gt: 0 },
        dueDate: { lt: now },
      },
      data: { paymentStatus: 'OVERDUE' },
    });
    return { swept: base.count, ranAt: now };
  }

  /** Invoices currently payable — CONFIRMED with outstanding balance. */
  async listOutstanding() {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'CONFIRMED',
        amountDue: { gt: 0 },
      },
      include: { customer: { include: { user: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const now = new Date();
    return invoices.map((inv) => ({
      ...inv,
      isOverdue: isOverdue(inv.dueDate, toMinorUnits(inv.amountDue), now),
    }));
  }
}
