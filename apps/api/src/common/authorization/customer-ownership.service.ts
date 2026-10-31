import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerIdForUser(userId: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException('Authenticated user is not linked to a customer account.');
    }

    return customer.id;
  }

  async assertCustomerOwnsCustomer(userId: string, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { userId: true },
    });

    if (!customer || customer.userId !== userId) {
      throw new ForbiddenException('You do not have access to this customer record.');
    }
  }

  async assertCustomerOwnsSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { customerId: true },
    });
    await this.assertCustomerId(userId, subscription?.customerId);
  }

  async assertCustomerOwnsInvoice(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { customerId: true },
    });
    await this.assertCustomerId(userId, invoice?.customerId);
  }

  async assertCustomerOwnsQuotation(userId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { customerId: true },
    });
    await this.assertCustomerId(userId, quotation?.customerId);
  }

  private async assertCustomerId(userId: string, resourceCustomerId?: string) {
    const customerId = await this.getCustomerIdForUser(userId);
    if (!resourceCustomerId || resourceCustomerId !== customerId) {
      throw new ForbiddenException('You do not have access to this customer resource.');
    }
  }
}
