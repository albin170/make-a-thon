import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateDiscountRuleDto, UpdateDiscountRuleDto } from './dto/discount-rule.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDiscountRules(query: { isActive?: string }) {
    const where: any = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    return this.prisma.discountRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createDiscountRule(dto: CreateDiscountRuleDto) {
    return this.prisma.discountRule.create({
      data: {
        id: uuidv4(),
        name: dto.name,
        code: dto.code,
        type: dto.type || 'PERCENTAGE',
        value: dto.value,
        minPurchaseAmount: dto.minPurchaseAmount,
        minQuantity: dto.minQuantity,
        productId: dto.productId,
        isSubscriptionWide: dto.isSubscriptionWide ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        maxUsage: dto.maxUsage,
      },
    });
  }

  async updateDiscountRule(id: string, dto: UpdateDiscountRuleDto) {
    const rule = await this.prisma.discountRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Discount rule not found');
    return this.prisma.discountRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.minPurchaseAmount !== undefined ? { minPurchaseAmount: dto.minPurchaseAmount } : {}),
        ...(dto.minQuantity !== undefined ? { minQuantity: dto.minQuantity } : {}),
        ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        ...(dto.isSubscriptionWide !== undefined ? { isSubscriptionWide: dto.isSubscriptionWide } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
        ...(dto.maxUsage !== undefined ? { maxUsage: dto.maxUsage } : {}),
      },
    });
  }

  async validateAndConsume(code: string, subtotal: number, subscriptionId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.discountRule.findUnique({ where: { code } });
      if (!rule || !rule.isActive) {
        throw new BadRequestException('Discount code is invalid or inactive');
      }

      const now = new Date();
      if (rule.startDate && rule.startDate > now) {
        throw new BadRequestException('Discount has not started yet');
      }
      if (rule.endDate && rule.endDate < now) {
        throw new BadRequestException('Discount has expired');
      }
      if (rule.maxUsage && rule.usageCount >= rule.maxUsage) {
        throw new BadRequestException('Discount code usage limit exceeded');
      }
      if (rule.minPurchaseAmount && Number(rule.minPurchaseAmount) > subtotal) {
        throw new BadRequestException(`Minimum purchase amount is ${rule.minPurchaseAmount}`);
      }

      // Increment usage atomically
      await tx.discountRule.update({
        where: { id: rule.id },
        data: { usageCount: { increment: 1 } },
      });

      let discountAmount = 0;
      if (rule.type === 'PERCENTAGE') {
        discountAmount = (subtotal * Number(rule.value)) / 100;
      } else {
        discountAmount = Number(rule.value);
      }

      await tx.discountUsage.create({
        data: {
          id: uuidv4(),
          discountRuleId: rule.id,
          subscriptionId,
          amount: discountAmount,
        },
      });

      return {
        rule,
        discountAmount,
      };
    });
  }
}

