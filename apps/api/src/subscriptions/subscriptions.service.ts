import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { RecurrenceEngine } from '../common/recurrence/recurrence.engine';
import { v4 as uuidv4 } from 'uuid';

interface CreateSubscriptionLineDto {
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  currency?: string;
  sortOrder?: number;
}

interface CreateSubscriptionDto {
  customerId: string;
  planId: string;
  quotationId?: string;
  startDate: Date | string;
  endDate?: Date | string;
  paymentTerms?: string;
  currency?: string;
  notes?: string;
  lines?: CreateSubscriptionLineDto[];
}

interface PurchaseSubscriptionDto {
  planId: string;
  quantity?: number;
  paymentMethod?: string;
  notes?: string;
}

interface ListSubscriptionsQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  planId?: string;
  status?: SubscriptionStatus;
  search?: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async generateSubscriptionNumber(): Promise<string> {
    const count = await this.prisma.subscription.count();
    const seq = count + 1;
    return `SUB-${String(seq).padStart(6, '0')}`;
  }

  private async recordAuditEvent(
    subscriptionId: string,
    action: string,
    fromStatus?: SubscriptionStatus | null,
    toStatus?: SubscriptionStatus | null,
    reason?: string,
    actorId?: string,
    metadata?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.subscriptionAuditEvent.create({
      data: {
        subscriptionId,
        action,
        fromStatus: fromStatus ?? undefined,
        toStatus: toStatus ?? undefined,
        reason,
        actorId,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  private readonly recurrence = new RecurrenceEngine();

  private computeNextBillingDate(
    startDate: Date,
    billingInterval: string,
    intervalCount: number,
  ): Date {
    return this.recurrence.calculateNextBillingDate(
      startDate,
      billingInterval,
      intervalCount,
    );
  }

  /**
   * Sweeps subscriptions whose scheduled cancellation date has passed, marking them CANCELLED.
   */
  private async sweepEffectiveCancellations(): Promise<void> {
    try {
      const now = new Date();
      const pendingCancellations = await this.prisma.subscription.findMany({
        where: {
          cancelledAt: { not: null },
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] },
          endDate: { lte: now },
        },
        take: 50,
      });

      for (const sub of pendingCancellations) {
        await this.prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              status: SubscriptionStatus.CANCELLED,
              nextBillingDate: null, // stop future billing
            },
          });
          await this.recordAuditEvent(
            sub.id,
            'CANCELLED_EFFECTIVE',
            sub.status,
            SubscriptionStatus.CANCELLED,
            'Scheduled cancellation reached effective date',
            undefined,
            { effectiveAt: now.toISOString() },
            tx,
          );
        });
      }
    } catch {
      // background sweep best effort
    }
  }

  // ── Public methods ────────────────────────────────────────────────────────────

  async createSubscription(dto: CreateSubscriptionDto) {
    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateSubscriptionNumber();

      const subscription = await tx.subscription.create({
        data: {
          number,
          customerId: dto.customerId,
          planId: dto.planId,
          quotationId: dto.quotationId,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          paymentTerms: dto.paymentTerms,
          currency: dto.currency ?? 'USD',
          notes: dto.notes,
          status: SubscriptionStatus.DRAFT,
          lines: dto.lines?.length
            ? {
                create: dto.lines.map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId,
                  description: l.description,
                  quantity: new Decimal(String(l.quantity)),
                  unitPrice: new Decimal(String(l.unitPrice)),
                  currency: l.currency ?? 'USD',
                  sortOrder: l.sortOrder ?? 0,
                })),
              }
            : undefined,
        },
        include: {
          plan: true,
          lines: true,
          customer: true,
        },
      });

      await this.recordAuditEvent(
        subscription.id,
        'CREATED',
        null,
        SubscriptionStatus.DRAFT,
        undefined,
        undefined,
        undefined,
        tx,
      );

      return subscription;
    });
  }

  /**
   * End-to-end customer plan purchase and checkout flow.
   * Validates published plan status, server authoritative pricing, creates subscription,
   * creates initial confirmed invoice, auto-records payment, and logs audit events.
   */
  async purchaseSubscription(
    customerIdOrUserId: string,
    planOrDto: string | PurchaseSubscriptionDto,
    requestedQuantityOrActorId?: number | string,
    actorIdParam?: string,
  ) {
    const isDto = typeof planOrDto === 'object' && planOrDto !== null;
    const planId = isDto ? planOrDto.planId : (planOrDto as string);
    const dtoQuantity = isDto ? planOrDto.quantity : (typeof requestedQuantityOrActorId === 'number' ? requestedQuantityOrActorId : 1);
    const actorId = isDto ? actorIdParam || (requestedQuantityOrActorId as string) : (typeof requestedQuantityOrActorId === 'string' ? requestedQuantityOrActorId : undefined);
    const paymentMethod = isDto ? planOrDto.paymentMethod : undefined;
    const notes = isDto ? planOrDto.notes : undefined;

    if (!planId) {
      throw new BadRequestException('planId is required to purchase a subscription.');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        products: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id "${planId}" not found`);
    }

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException('This plan is not currently active or published for purchase.');
    }

    const now = new Date();
    if (plan.availableFrom && plan.availableFrom > now) {
      throw new BadRequestException('This plan is not yet available for subscription.');
    }
    if (plan.availableTo && plan.availableTo < now) {
      throw new BadRequestException('This plan is no longer available for subscription.');
    }

    const qty = Number(dtoQuantity) || 1;
    if (!Number.isInteger(qty) || qty < 1) {
      throw new BadRequestException('Quantity must be a positive whole number.');
    }
    if (plan.minQuantity !== null && qty < plan.minQuantity) {
      throw new BadRequestException(`The minimum quantity for this plan is ${plan.minQuantity}.`);
    }
    if (plan.maxQuantity !== null && qty > plan.maxQuantity) {
      throw new BadRequestException(`The maximum quantity for this plan is ${plan.maxQuantity}.`);
    }

    // Resolve customerId whether user ID or customer ID was passed
    let customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id: customerIdOrUserId }, { userId: customerIdOrUserId }],
      },
    });

    if (!customer) {
      const user = await this.prisma.user.findUnique({ where: { id: customerIdOrUserId } });
      if (user && user.role === 'CUSTOMER') {
        customer = await this.prisma.customer.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            companyName: `${user.firstName || 'Customer'} ${user.lastName || ''}`.trim(),
            currency: plan.currency || 'USD',
          },
        });
      } else {
        throw new BadRequestException('Your account is not linked to a customer profile.');
      }
    }

    const customerId = customer.id;

    // Authoritative pricing from server
    const primaryPlanProduct = plan.products[0];
    const unitPrice = primaryPlanProduct ? primaryPlanProduct.unitPrice : new Prisma.Decimal(49.0);
    const quantity = new Prisma.Decimal(qty);
    const lineTotal = unitPrice.mul(quantity);

    const subscriptionNumber = await this.generateSubscriptionNumber();

    const nextBillingDate = this.computeNextBillingDate(
      now,
      plan.billingInterval,
      plan.intervalCount,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Create active subscription with authoritative lines
      const subscription = await tx.subscription.create({
        data: {
          id: uuidv4(),
          number: subscriptionNumber,
          customerId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          nextBillingDate,
          currency: plan.currency || 'USD',
          paymentTerms: 'Due on Receipt',
          notes: notes || `Purchased online (${plan.name})`,
          lines: {
            create: plan.products.length > 0
              ? plan.products.map((planProduct) => ({
                  id: uuidv4(),
                  productId: planProduct.productId,
                  description: planProduct.product?.name || `${plan.name} - Line item`,
                  quantity,
                  unitPrice: planProduct.unitPrice,
                  currency: plan.currency || 'USD',
                  sortOrder: planProduct.sortOrder,
                }))
              : [
                  {
                    id: uuidv4(),
                    productId: null,
                    description: `${plan.name} - ${plan.billingInterval} Subscription`,
                    quantity,
                    unitPrice,
                    currency: plan.currency || 'USD',
                    sortOrder: 0,
                  },
                ],
          },
        },
        include: {
          plan: true,
          lines: true,
        },
      });

      // 2. Generate initial confirmed invoice
      const invoiceCount = await tx.invoice.count();
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;
      const isPaid = Boolean(paymentMethod);

      const invoice = await tx.invoice.create({
        data: {
          id: uuidv4(),
          number: invoiceNumber,
          customerId,
          subscriptionId: subscription.id,
          invoiceDate: now,
          dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          currency: plan.currency || 'USD',
          subtotal: lineTotal,
          taxTotal: new Prisma.Decimal(0),
          discountTotal: new Prisma.Decimal(0),
          total: lineTotal,
          status: 'CONFIRMED',
          paymentStatus: isPaid ? 'PAID' : 'UNPAID',
          lines: {
            create: [
              {
                id: uuidv4(),
                description: `${plan.name} - Subscription (${now.toISOString().split('T')[0]})`,
                quantity,
                unitPrice,
                subtotal: lineTotal,
                total: lineTotal,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      // 3. Record payment if payment method provided
      let paymentRecord = null;
      if (isPaid) {
        const paymentCount = await tx.payment.count();
        const paymentNumber = `PAY-${String(paymentCount + 1).padStart(6, '0')}`;
        paymentRecord = await tx.payment.create({
          data: {
            id: uuidv4(),
            number: paymentNumber,
            customerId,
            amount: lineTotal,
            currency: plan.currency || 'USD',
            paymentDate: now,
            method: (paymentMethod as any) || 'CREDIT_CARD',
            reference: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
            notes: `Checkout payment for invoice ${invoice.number}`,
            unallocated: new Prisma.Decimal(0),
            allocations: {
              create: {
                id: uuidv4(),
                invoiceId: invoice.id,
                amount: lineTotal,
              },
            },
          },
        });
      }

      // 4. Audit event
      await this.recordAuditEvent(
        subscription.id,
        'PURCHASED',
        null,
        SubscriptionStatus.ACTIVE,
        `Customer completed plan purchase (${paymentMethod || 'Invoiced'})`,
        actorId,
        {
          planId: plan.id,
          planName: plan.name,
          invoiceId: invoice.id,
          paymentId: paymentRecord?.id,
          total: Number(lineTotal),
        },
        tx,
      );

      return {
        message: 'Subscription successfully activated!',
        subscription,
        invoice,
        payment: paymentRecord,
      };
    });
  }

  async listSubscriptions(query: ListSubscriptionsQuery) {
    await this.sweepEffectiveCancellations();

    const { page = 1, limit = 50, customerId, planId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      ...(customerId ? { customerId } : {}),
      ...(planId ? { planId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          customer: {
            include: { user: true },
          },
          lines: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSubscription(id: string) {
    await this.sweepEffectiveCancellations();

    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: { orderBy: { sortOrder: 'asc' } },
        customer: {
          include: { user: true },
        },
        auditEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    return subscription;
  }

  async activateSubscription(id: string, actorId?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    if (subscription.status !== SubscriptionStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT subscriptions can be activated (current: ${subscription.status})`,
      );
    }

    const nextBillingDate = this.computeNextBillingDate(
      subscription.startDate,
      subscription.plan.billingInterval,
      subscription.plan.intervalCount,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          nextBillingDate,
        },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        id,
        'ACTIVATED',
        SubscriptionStatus.DRAFT,
        SubscriptionStatus.ACTIVE,
        undefined,
        actorId,
        undefined,
        tx,
      );

      return updated;
    });
  }

  async pauseSubscription(id: string, reason: string, actorId?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Only ACTIVE subscriptions can be paused (current: ${subscription.status})`,
      );
    }
    if (!subscription.plan.allowPause) {
      throw new BadRequestException(
        `The plan "${subscription.plan.name}" does not allow pausing`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.PAUSED,
          pausedAt: new Date(),
        },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        id,
        'PAUSED',
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PAUSED,
        reason,
        actorId,
        undefined,
        tx,
      );

      return updated;
    });
  }

  async resumeSubscription(id: string, actorId?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException(
        `Only PAUSED subscriptions can be resumed (current: ${subscription.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          resumedAt: new Date(),
        },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        id,
        'RESUMED',
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.ACTIVE,
        undefined,
        actorId,
        undefined,
        tx,
      );

      return updated;
    });
  }

  async closeSubscription(id: string, reason: string, actorId?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException(
        `Only ACTIVE or PAUSED subscriptions can be closed (current: ${subscription.status})`,
      );
    }
    if (!subscription.plan.allowEarlyClosure) {
      throw new BadRequestException(
        `The plan "${subscription.plan.name}" does not allow early closure`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CLOSED,
          closedAt: new Date(),
        },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        id,
        'CLOSED',
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CLOSED,
        reason,
        actorId,
        undefined,
        tx,
      );

      return updated;
    });
  }

  async cancelSubscription(id: string, reason?: string, actorId?: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    // Repeated requests return the original cancellation state unchanged.
    if (subscription.status === SubscriptionStatus.CANCELLED || subscription.cancellationEffectiveAt) {
      return subscription;
    }

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.PAUSED
    ) {
      throw new BadRequestException(
        `Only ACTIVE or PAUSED subscriptions can be cancelled (current: ${subscription.status})`,
      );
    }

    const effectiveAt = subscription.nextBillingDate ?? subscription.endDate;
    if (!effectiveAt) {
      throw new BadRequestException(
        'Subscription has no current billing period end date for scheduled cancellation',
      );
    }

    const now = new Date();
    const becomesCancelled = effectiveAt <= now;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.subscription.updateMany({
        where: {
          id,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] },
          cancellationEffectiveAt: null,
        },
        data: {
          cancellationRequestedAt: now,
          cancellationEffectiveAt: effectiveAt,
          cancellationReason: reason,
          ...(becomesCancelled
            ? { status: SubscriptionStatus.CANCELLED, cancelledAt: now }
            : {}),
        },
      });

      if (claimed.count === 0) {
        return tx.subscription.findUniqueOrThrow({ where: { id } });
      }

      const updated = await tx.subscription.findUniqueOrThrow({
        where: { id },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        id,
        becomesCancelled ? 'CANCELLATION_EFFECTIVE' : 'CANCELLATION_REQUESTED',
        subscription.status,
        becomesCancelled ? SubscriptionStatus.CANCELLED : subscription.status,
        reason,
        actorId,
        { effectiveAt: effectiveAt.toISOString() },
        tx,
      );

      return updated;
    });
  }

  async reverseCancellation(id: string, actorId?: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Effective cancellations cannot be reversed');
    }
    if (!subscription.cancellationEffectiveAt) {
      return subscription;
    }
    if (subscription.cancellationEffectiveAt <= new Date()) {
      throw new BadRequestException('The cancellation effective date has passed');
    }

    return this.prisma.$transaction(async (tx) => {
      const cleared = await tx.subscription.updateMany({
        where: {
          id,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] },
          cancellationEffectiveAt: { gt: new Date() },
        },
        data: {
          cancellationRequestedAt: null,
          cancellationEffectiveAt: null,
          cancellationReason: null,
        },
      });

      if (cleared.count === 0) {
        return tx.subscription.findUniqueOrThrow({ where: { id } });
      }

      const updated = await tx.subscription.findUniqueOrThrow({
        where: { id },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        id,
        'CANCELLATION_REVERSED',
        subscription.status,
        subscription.status,
        undefined,
        actorId,
        undefined,
        tx,
      );

      return updated;
    });
  }
}
