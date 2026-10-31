import { ForbiddenException } from '@nestjs/common';
import { CustomerOwnershipService } from './customer-ownership.service';

describe('CustomerOwnershipService', () => {
  const prisma = {
    customer: { findUnique: jest.fn() },
    subscription: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn() },
    quotation: { findUnique: jest.fn() },
  };
  const service = new CustomerOwnershipService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('resolves the customer record linked to a user', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    await expect(service.getCustomerIdForUser('user-1')).resolves.toBe('customer-1');
  });

  it('rejects users without a customer record', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(service.getCustomerIdForUser('user-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects access to another customer subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ customerId: 'customer-2' });
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    await expect(service.assertCustomerOwnsSubscription('user-1', 'subscription-2'))
      .rejects.toThrow(ForbiddenException);
  });

  it('allows access to an owned invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue({ customerId: 'customer-1' });
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    await expect(service.assertCustomerOwnsInvoice('user-1', 'invoice-1')).resolves.toBeUndefined();
  });
});
