import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics() {
    const [activeSubscriptions, totalRevenueResult, outstandingResult, overdueCount] =
      await Promise.all([
        this.prisma.subscription.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { reversedAt: null },
        }),
        this.prisma.invoice.aggregate({
          _sum: { amountDue: true },
          where: {
            status: 'CONFIRMED',
            paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
        }),
        this.prisma.invoice.count({
          where: {
            status: 'CONFIRMED',
            dueDate: { lt: new Date() },
            paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
        }),
      ]);

    return {
      activeSubscriptions,
      revenueReceived: totalRevenueResult._sum.amount?.toString() || '0.0000',
      outstandingBalance: outstandingResult._sum.amountDue?.toString() || '0.0000',
      overdueInvoices: overdueCount,
    };
  }

  async getRevenueByPeriod(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const to = dateTo ? new Date(dateTo) : new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: from, lte: to },
        reversedAt: null,
      },
      select: {
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const monthlyMap: Record<string, number> = {};
    for (const p of payments) {
      const monthKey = p.paymentDate.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(p.amount);
    }

    return Object.entries(monthlyMap).map(([month, amount]) => ({
      period: month,
      revenue: amount.toFixed(2),
    }));
  }

  async getInvoiceAging() {
    const now = new Date();
    const confirmedInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: {
        dueDate: true,
        amountDue: true,
      },
    });

    const buckets = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
    };

    for (const inv of confirmedInvoices) {
      const diffMs = now.getTime() - inv.dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const due = Number(inv.amountDue);

      if (diffDays <= 0) {
        buckets.current += due;
      } else if (diffDays <= 30) {
        buckets.days1_30 += due;
      } else if (diffDays <= 60) {
        buckets.days31_60 += due;
      } else if (diffDays <= 90) {
        buckets.days61_90 += due;
      } else {
        buckets.days90Plus += due;
      }
    }

    return buckets;
  }

  async getSubscriptionGrowth() {
    const subs = await this.prisma.subscription.findMany({
      select: {
        createdAt: true,
        status: true,
        closedAt: true,
      },
    });

    const monthlyNew: Record<string, number> = {};
    const monthlyClosed: Record<string, number> = {};

    for (const sub of subs) {
      const createdKey = sub.createdAt.toISOString().slice(0, 7);
      monthlyNew[createdKey] = (monthlyNew[createdKey] || 0) + 1;

      if (sub.closedAt) {
        const closedKey = sub.closedAt.toISOString().slice(0, 7);
        monthlyClosed[closedKey] = (monthlyClosed[closedKey] || 0) + 1;
      }
    }

    const periods = Array.from(new Set([...Object.keys(monthlyNew), ...Object.keys(monthlyClosed)])).sort();

    return periods.map((period) => ({
      period,
      newSubscriptions: monthlyNew[period] || 0,
      closedSubscriptions: monthlyClosed[period] || 0,
    }));
  }
}
