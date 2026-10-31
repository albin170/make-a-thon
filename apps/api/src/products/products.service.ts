import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit,
        include: { variants: { where: { isActive: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found.`);
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { id: uuidv4(), ...dto },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft-delete: archive instead of hard delete
    return this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async getVariants(productId: string) {
    await this.findOne(productId);
    return this.prisma.productVariant.findMany({ where: { productId } });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.findOne(productId);
    return this.prisma.productVariant.create({
      data: { id: uuidv4(), productId, ...dto },
    });
  }
}
