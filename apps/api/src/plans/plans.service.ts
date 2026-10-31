import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingInterval, PlanStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface CreatePlanProductDto {
  productId: string;
  unitPrice: number | string;
  minQty?: number;
  maxQty?: number;
  sortOrder?: number;
}

interface CreatePlanDto {
  name: string;
  description?: string;
  billingInterval: string;
  intervalCount?: number;
  currency?: string;
  status?: PlanStatus;
  availableFrom?: string | Date;
  availableTo?: string | Date;
  autoCloseOnEnd?: boolean;
  allowEarlyClosure?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  trialDays?: number;
  price?: number | string;
  notes?: string;
  products?: CreatePlanProductDto[];
}

interface ListPlansQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PlanStatus;
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(query: ListPlansQuery) {
    const { page = 1, limit = 50, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PlanWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip,
        take: limit,
        include: {
          products: {
            include: {
              product: true,
            },
          },
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    const formattedData = data.map((p) => {
      const primaryProduct = p.products[0];
      const price = primaryProduct ? Number(primaryProduct.unitPrice) : 0;
      return {
        ...p,
        price,
        subscriberCount: p._count?.subscriptions || 0,
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createPlan(dto: CreatePlanDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Plan name is required.');
    }

    const { products, price, ...planData } = dto;
    const planPrice = price !== undefined && price !== null ? Number(price) : 0;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the plan
      const plan = await tx.plan.create({
        data: {
          ...planData,
          name: dto.name.trim(),
          billingInterval: (planData.billingInterval as BillingInterval) || BillingInterval.MONTHLY,
          status: planData.status ?? PlanStatus.ACTIVE,
          currency: planData.currency || 'USD',
          trialDays: Number(planData.trialDays) || 0,
          intervalCount: Number(planData.intervalCount) || 1,
          availableFrom: planData.availableFrom ? new Date(planData.availableFrom) : undefined,
          availableTo: planData.availableTo ? new Date(planData.availableTo) : undefined,
        },
      });

      // 2. Handle Plan Products or direct Price
      if (products && products.length > 0) {
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          await tx.planProduct.create({
            data: {
              id: uuidv4(),
              planId: plan.id,
              productId: p.productId,
              unitPrice: new Prisma.Decimal(p.unitPrice),
              minQty: p.minQty || 1,
              maxQty: p.maxQty,
              sortOrder: p.sortOrder ?? i,
            },
          });
        }
      } else {
        // Link to existing product or create a default service product
        let product = await tx.product.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              id: uuidv4(),
              name: dto.name.trim(),
              type: 'SERVICE',
              salesPrice: new Prisma.Decimal(planPrice),
              currency: planData.currency || 'USD',
              status: 'ACTIVE',
            },
          });
        }

        await tx.planProduct.create({
          data: {
            id: uuidv4(),
            planId: plan.id,
            productId: product.id,
            unitPrice: new Prisma.Decimal(planPrice),
            minQty: 1,
            sortOrder: 0,
          },
        });
      }

      return this.getPlan(plan.id);
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id "${id}" not found`);
    }

    const primaryProduct = plan.products[0];
    const price = primaryProduct ? Number(primaryProduct.unitPrice) : 0;

    return {
      ...plan,
      price,
      subscriberCount: plan._count?.subscriptions || 0,
    };
  }

  async updatePlan(id: string, dto: Partial<CreatePlanDto>) {
    await this.getPlan(id);

    const { products, price, ...planData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.PlanUpdateInput = {
        ...planData,
        billingInterval: planData.billingInterval ? (planData.billingInterval as BillingInterval) : undefined,
        availableFrom: planData.availableFrom ? new Date(planData.availableFrom) : undefined,
        availableTo: planData.availableTo ? new Date(planData.availableTo) : undefined,
      };

      await tx.plan.update({
        where: { id },
        data: updateData,
      });

      // Update unit price on primary PlanProduct if provided
      if (price !== undefined && price !== null) {
        const decimalPrice = new Prisma.Decimal(price);
        const existingPP = await tx.planProduct.findFirst({
          where: { planId: id },
        });

        if (existingPP) {
          await tx.planProduct.update({
            where: { id: existingPP.id },
            data: { unitPrice: decimalPrice },
          });
        } else {
          const product = await tx.product.findFirst({ where: { status: 'ACTIVE' } });
          if (product) {
            await tx.planProduct.create({
              data: {
                id: uuidv4(),
                planId: id,
                productId: product.id,
                unitPrice: decimalPrice,
              },
            });
          }
        }
      }

      return this.getPlan(id);
    });
  }

  async updatePlanStatus(id: string, status: PlanStatus) {
    await this.getPlan(id);

    return this.prisma.plan.update({
      where: { id },
      data: { status },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
  }

  async deactivatePlan(id: string) {
    return this.updatePlanStatus(id, PlanStatus.ARCHIVED);
  }
}
