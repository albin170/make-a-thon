import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generatePaymentNumber(): Promise<string> {
    const count = await this.prisma.payment.count();
    const next = count + 1;
    return `PAY-${String(next).padStart(6, '0')}`;
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
    const number = await this.generatePaymentNumber();
    const amount = new Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      return tx.payment.create({
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch payment and validate unallocated >= amount
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

      if (new Decimal(payment.unallocated).lt(allocationAmount)) {
        throw new BadRequestException(
          `Insufficient unallocated balance. Available: ${payment.unallocated}, requested: ${amount}`,
        );
      }

      // 2. Fetch invoice and validate not CANCELLED/VOID
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);

      if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        throw new BadRequestException(
          `Cannot allocate payment to a ${invoice.status} invoice`,
        );
      }

      // 3. Upsert PaymentAllocation
      const existingAllocation = await tx.paymentAllocation.findFirst({
        where: { paymentId, invoiceId },
      });

      if (existingAllocation) {
        await tx.paymentAllocation.update({
          where: { id: existingAllocation.id },
          data: {
            amount: new Decimal(existingAllocation.amount).add(allocationAmount),
            notes: notes ?? existingAllocation.notes,
            allocatedAt: new Date(),
          },
        });
      } else {
        await tx.paymentAllocation.create({
          data: {
            paymentId,
            invoiceId,
            amount: allocationAmount,
            notes,
            allocatedAt: new Date(),
          },
        });
      }

      // 4. Update payment.unallocated -= amount
      const newUnallocated = new Decimal(payment.unallocated).sub(allocationAmount);
      await tx.payment.update({
        where: { id: paymentId },
        data: { unallocated: newUnallocated },
      });

      // 5. Compute new invoice amounts
      const newAmountPaid = new Decimal(invoice.amountPaid).add(allocationAmount);
      const newAmountDue = new Decimal(invoice.amountDue).sub(allocationAmount);

      // 6. Determine payment status
      let paymentStatus: string;
      if (newAmountDue.lte(0)) {
        paymentStatus = 'PAID';
      } else if (newAmountPaid.gt(0)) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'UNPAID';
      }

      // 7. Determine invoice status
      let invoiceStatus = invoice.status;
      if (paymentStatus === 'PAID' && invoice.status === 'CONFIRMED') {
        invoiceStatus = 'PAID';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          paymentStatus: paymentStatus as any,
          status: invoiceStatus as any,
        },
      });

      return {
        payment: await tx.payment.findUnique({ where: { id: paymentId } }),
        invoice: updatedInvoice,
      };
    });
  }
}
