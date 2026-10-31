import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanStatus, Prisma } from '@prisma/client';

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
    const { page = 1, limit = 20, search, status } = query;
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
          products: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.plan.count({ where }),
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

  async createPlan(dto: CreatePlanDto) {
    const { products, ...planData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          ...planData,
          billingInterval: planData.billingInterval as any,
          status: planData.status ?? PlanStatus.ACTIVE,
          availableFrom: planData.availableFrom
            ? new Date(planData.availableFrom)
            : undefined,
          availableTo: planData.availableTo
            ? new Date(planData.availableTo)
            : undefined,
          products: products?.length
            ? {
                create: products.map((p) => ({
                  productId: p.productId,
                  unitPrice: new Prisma.Decimal(p.unitPrice),
                  minQty: p.minQty,
                  maxQty: p.maxQty,
                  sortOrder: p.sortOrder ?? 0,
                })),
              }
            : undefined,
        },
        include: {
          products: true,
        },
      });

      return plan;
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
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with id "${id}" not found`);
    }

    return plan;
  }

  async updatePlan(id: string, dto: Partial<CreatePlanDto>) {
    await this.getPlan(id);

    const { products, ...planData } = dto;

    return this.prisma.plan.update({
      where: { id },
      data: {
        ...planData,
        billingInterval: planData.billingInterval as any,
        availableFrom: planData.availableFrom
          ? new Date(planData.availableFrom)
          : undefined,
        availableTo: planData.availableTo
          ? new Date(planData.availableTo)
          : undefined,
      },
      include: {
        products: true,
      },
    });
  }

  async deactivatePlan(id: string) {
    await this.getPlan(id);

    return this.prisma.plan.update({
      where: { id },
      data: { status: PlanStatus.ARCHIVED },
    });
  }
}
