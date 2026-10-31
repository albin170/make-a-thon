import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateTaxRuleDto, UpdateTaxRuleDto } from './dto/tax-rule.dto';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async listTaxRules(query: { isActive?: string }) {
    const where: any = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    return this.prisma.taxRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createTaxRule(dto: CreateTaxRuleDto) {
    return this.prisma.taxRule.create({
      data: {
        id: uuidv4(),
        name: dto.name,
        code: dto.code,
        rate: dto.rate,
        type: dto.type || 'EXCLUSIVE',
        description: dto.description,
        jurisdiction: dto.jurisdiction,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTaxRule(id: string, dto: UpdateTaxRuleDto) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return this.prisma.taxRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.rate !== undefined ? { rate: dto.rate } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.jurisdiction !== undefined ? { jurisdiction: dto.jurisdiction } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null } : {}),
        ...(dto.effectiveTo !== undefined ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deactivateTaxRule(id: string) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return this.prisma.taxRule.update({ where: { id }, data: { isActive: false } });
  }
}

