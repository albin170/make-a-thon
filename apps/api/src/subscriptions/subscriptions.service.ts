import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { RecurrenceEngine } from '../common/recurrence/recurrence.engine';

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
          status: SubscriptionStatus.DRAFT,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          paymentTerms: dto.paymentTerms,
          currency: dto.currency ?? 'USD',
          notes: dto.notes,
          lines: dto.lines
            ? {
                create: dto.lines.map((line, idx) => ({
                  productId: line.productId,
                  variantId: line.variantId,
                  description: line.description,
                  quantity: new Decimal(line.quantity),
                  unitPrice: new Decimal(line.unitPrice),
                  currency: line.currency ?? dto.currency ?? 'USD',
                  sortOrder: line.sortOrder ?? idx,
                })),
              }
            : undefined,
        },
        include: { plan: true, lines: true },
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

  async purchaseSubscription(userId: string, planId: string, requestedQuantity?: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        products: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const now = new Date();
    if (!plan || plan.status !== 'ACTIVE') {
      throw new BadRequestException('This subscription plan is not available.');
    }
    if (plan.availableFrom && plan.availableFrom > now) {
      throw new BadRequestException('This subscription plan is not available yet.');
    }
    if (plan.availableTo && plan.availableTo < now) {
      throw new BadRequestException('This subscription plan is no longer available.');
    }
    if (plan.products.length === 0) {
      throw new BadRequestException('This plan has no billable products configured.');
    }

    const quantity = requestedQuantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive whole number.');
    }
    if (plan.minQuantity !== null && quantity < plan.minQuantity) {
      throw new BadRequestException(`The minimum quantity for this plan is ${plan.minQuantity}.`);
    }
    if (plan.maxQuantity !== null && quantity > plan.maxQuantity) {
      throw new BadRequestException(`The maximum quantity for this plan is ${plan.maxQuantity}.`);
    }

    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new BadRequestException('Your account is not linked to a customer profile.');
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateSubscriptionNumber();
      const nextBillingDate = this.computeNextBillingDate(
        now,
        plan.billingInterval,
        plan.intervalCount,
      );
      const subscription = await tx.subscription.create({
        data: {
          number,
          customerId: customer.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          nextBillingDate,
          paymentTerms: 'Due on Receipt',
          currency: plan.currency,
          lines: {
            create: plan.products.map((planProduct) => ({
              productId: planProduct.productId,
              description: planProduct.product.name,
              quantity: new Decimal(quantity),
              unitPrice: planProduct.unitPrice,
              currency: plan.currency,
              sortOrder: planProduct.sortOrder,
            })),
          },
        },
        include: { plan: true, lines: true },
      });

      await this.recordAuditEvent(
        subscription.id,
        'CREATED',
        null,
        SubscriptionStatus.ACTIVE,
        'Customer purchased plan',
        userId,
        undefined,
        tx,
      );

      return subscription;
    });
  }

  async listSubscriptions(query: ListSubscriptionsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
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
          customer: true,
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
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: { orderBy: { sortOrder: 'asc' } },
        customer: true,
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
