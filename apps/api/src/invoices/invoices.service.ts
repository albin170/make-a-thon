import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

interface CreateInvoiceLineDto {
  productId?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
}

interface CreateInvoiceDto {
  customerId: string;
  subscriptionId?: string;
  dueDate: Date | string;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
  billingName?: string;
  billingAddress?: Prisma.InputJsonValue;
  lines: CreateInvoiceLineDto[];
}

interface ListInvoicesQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  subscriptionId?: string;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    const seq = count + 1;
    return `INV-${String(seq).padStart(6, '0')}`;
  }

  // ── Public methods ────────────────────────────────────────────────────────────

  async createInvoice(dto: CreateInvoiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateInvoiceNumber();
      const currency = dto.currency ?? 'USD';

      // Compute line-level totals
      let subtotal = new Decimal(0);
      let discountTotal = new Decimal(0);
      let taxTotal = new Decimal(0);

      const lineData = dto.lines.map((line, idx) => {
        const qty = new Decimal(line.quantity);
        const unit = new Decimal(line.unitPrice);
        const discount = new Decimal(line.discountAmount ?? 0);
        const tax = new Decimal(line.taxAmount ?? 0);
        const lineSub = qty.mul(unit);
        const lineTotal = lineSub.minus(discount).plus(tax);

        subtotal = subtotal.plus(lineSub);
        discountTotal = discountTotal.plus(discount);
        taxTotal = taxTotal.plus(tax);

        return {
          productId: line.productId,
          description: line.description,
          quantity: qty,
          unitPrice: unit,
          discountAmount: discount,
          subtotal: lineSub,
          taxAmount: tax,
          total: lineTotal,
          sortOrder: idx,
        };
      });

      const total = subtotal.minus(discountTotal).plus(taxTotal);
      const amountDue = total;

      const invoice = await tx.invoice.create({
        data: {
          number,
          customerId: dto.customerId,
          subscriptionId: dto.subscriptionId,
          status: InvoiceStatus.DRAFT,
          paymentStatus: PaymentStatus.UNPAID,
          invoiceDate: new Date(),
          dueDate: new Date(dto.dueDate),
          currency,
          paymentTerms: dto.paymentTerms,
          notes: dto.notes,
          billingName: dto.billingName,
          billingAddress: dto.billingAddress ?? Prisma.JsonNull,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          amountPaid: new Decimal(0),
          amountDue,
          lines: { create: lineData },
        },
        include: { lines: true },
      });

      return invoice;
    });
  }

  async listInvoices(query: ListInvoicesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            invoiceDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        customer: true,
        deliveries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async confirmInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT invoices can be confirmed (current: ${invoice.status})`,
      );
    }
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
  }

  async cancelInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    const cancellable: InvoiceStatus[] = [
      InvoiceStatus.DRAFT,
      InvoiceStatus.CONFIRMED,
    ];
    if (!cancellable.includes(invoice.status)) {
      throw new BadRequestException(
        `Invoice cannot be cancelled in status ${invoice.status}`,
      );
    }
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  async generatePdf(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return this.prisma.invoice.update({
      where: { id },
      data: {
        pdfGeneratedAt: new Date(),
      },
    });
  }

  async sendInvoice(id: string, actorId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    if (invoice.status !== InvoiceStatus.CONFIRMED) {
      throw new BadRequestException(
        `Only CONFIRMED invoices can be sent (current: ${invoice.status})`,
      );
    }

    const recipient = (invoice.customer as any)?.email ?? '';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { sentAt: new Date() },
      });

      await tx.invoiceDelivery.create({
        data: {
          invoiceId: id,
          method: 'EMAIL',
          status: 'PENDING',
          recipient,
          attempts: 0,
        },
      });

      await tx.notificationOutbox.create({
        data: {
          type: 'INVOICE_SENT',
          payload: { invoiceId: id, customerId: invoice.customerId },
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 3,
          scheduledAt: new Date(),
        },
      });

      return updated;
    });
  }
}
