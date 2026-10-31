import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

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

  async createTaxRule(dto: any) {
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
      },
    });
  }

  async updateTaxRule(id: string, dto: any) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return this.prisma.taxRule.update({ where: { id }, data: dto });
  }

  async deactivateTaxRule(id: string) {
    const rule = await this.prisma.taxRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return this.prisma.taxRule.update({ where: { id }, data: { isActive: false } });
  }
}

