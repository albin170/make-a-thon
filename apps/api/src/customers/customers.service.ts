import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

export interface ListCustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
  currency?: string;
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  companyName?: string;
  vatNumber?: string;
  currency?: string;
  notes?: string;
}

export interface UpdateCustomerDto {
  companyName?: string;
  vatNumber?: string;
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  currency?: string;
  notes?: string;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(query: ListCustomersQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { companyName: { contains: s, mode: 'insensitive' } },
        { vatNumber: { contains: s, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: s, mode: 'insensitive' } },
              { lastName: { contains: s, mode: 'insensitive' } },
              { emailNormalized: { contains: s.toLowerCase(), mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (query.currency) {
      where.currency = query.currency;
    }

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    return customer;
  }

  async getCustomerByUserId(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return customer;
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    await this.getCustomer(id); // Validates existence

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
        ...(dto.billingAddress !== undefined && { billingAddress: dto.billingAddress }),
        ...(dto.shippingAddress !== undefined && { shippingAddress: dto.shippingAddress }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return customer;
  }

  async createCustomer(dto: CreateCustomerDto) {
    const emailNormalized = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { emailNormalized } });
    if (existing) {
      throw new ConflictException("A user with this email already exists.");
    }

    const defaultPassword = dto.password || "Customer@123";
    const passwordHash = await argon2.hash(defaultPassword, { type: argon2.argon2id });
    const newCustomerId = uuidv4();
    const newUserId = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        id: newUserId,
        email: dto.email.trim(),
        emailNormalized,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim(),
        role: "CUSTOMER",
        customer: {
          create: {
            id: newCustomerId,
            companyName: dto.companyName?.trim(),
            vatNumber: dto.vatNumber?.trim(),
            currency: dto.currency || "USD",
            notes: dto.notes?.trim(),
          },
        },
      },
      include: {
        customer: true,
      },
    });

    return user.customer;
  }

}
