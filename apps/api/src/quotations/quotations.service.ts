import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotationStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface QuotationLineDto {
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
}

interface CreateQuotationDto {
  customerId: string;
  templateId?: string;
  validTo: string | Date;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  lines: QuotationLineDto[];
}

interface ListQuotationsQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: QuotationStatus;
  search?: string;
}

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateQuotationNumber(): Promise<string> {
    const count = await this.prisma.quotation.count();
    const seq = count + 1;
    return `QUO-${String(seq).padStart(6, '0')}`;
  }

  private async generateSubscriptionNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const count = await tx.subscription.count();
    const seq = count + 1;
    return `SUB-${String(seq).padStart(6, '0')}`;
  }

  async createQuotation(dto: CreateQuotationDto) {
    const { lines, ...quotationData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateQuotationNumber();

      // Compute totals from lines
      let subtotal = new Decimal(0);
      let discountTotal = new Decimal(0);
      let taxTotal = new Decimal(0);

      const preparedLines = lines.map((line, index) => {
        const qty = new Decimal(line.quantity);
        const unitPrice = new Decimal(line.unitPrice);
        const discountAmount = new Decimal(line.discountAmount ?? 0);
        const taxAmount = new Decimal(line.taxAmount ?? 0);
        const lineSubtotal = qty.mul(unitPrice);
        const lineTotal = lineSubtotal.minus(discountAmount).plus(taxAmount);

        subtotal = subtotal.plus(lineSubtotal);
        discountTotal = discountTotal.plus(discountAmount);
        taxTotal = taxTotal.plus(taxAmount);

        return {
          productId: line.productId,
          variantId: line.variantId,
          description: line.description,
          quantity: qty,
          unitPrice,
          discountAmount,
          subtotal: lineSubtotal,
          taxAmount,
          total: lineTotal,
          sortOrder: index,
        };
      });

      const total = subtotal.minus(discountTotal).plus(taxTotal);

      const quotation = await tx.quotation.create({
        data: {
          number,
          customerId: quotationData.customerId,
          templateId: quotationData.templateId,
          status: QuotationStatus.DRAFT,
          validFrom: new Date(),
          validTo: new Date(quotationData.validTo),
          currency: quotationData.currency ?? 'USD',
          paymentTerms: quotationData.paymentTerms,
          notes: quotationData.notes,
          internalNotes: quotationData.internalNotes,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          lines: {
            create: preparedLines,
          },
        },
        include: {
          lines: true,
        },
      });

      return quotation;
    });
  }

  async listQuotations(query: ListQuotationsQuery) {
    const { page = 1, limit = 20, customerId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        include: {
          lines: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuotation(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        lines: true,
        customer: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with id "${id}" not found`);
    }

    return quotation;
  }

  async sendQuotation(id: string) {
    const quotation = await this.getQuotation(id);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        `Quotation must be in DRAFT status to send. Current status: ${quotation.status}`,
      );
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async acceptQuotation(id: string, actorId: string) {
    const quotation = await this.getQuotation(id);

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        `Quotation must be in SENT status to accept. Current status: ${quotation.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const subNumber = await this.generateSubscriptionNumber(tx);

      const updatedQuotation = await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await tx.subscription.create({
        data: {
          number: subNumber,
          status: 'DRAFT',
          quotationId: id,
          customerId: quotation.customerId,
          currency: quotation.currency,
          createdById: actorId,
        },
      });

      return updatedQuotation;
    });
  }

  async rejectQuotation(id: string) {
    const quotation = await this.getQuotation(id);

    if (
      quotation.status !== QuotationStatus.SENT &&
      quotation.status !== QuotationStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Quotation must be in SENT or DRAFT status to reject. Current status: ${quotation.status}`,
      );
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });
  }

  async expireOverdueQuotations() {
    const result = await this.prisma.quotation.updateMany({
      where: {
        status: QuotationStatus.SENT,
        validTo: {
          lt: new Date(),
        },
      },
      data: {
        status: QuotationStatus.EXPIRED,
      },
    });

    return { expiredCount: result.count };
  }
}
